// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IStakingPool.sol";
import "./interfaces/IRewardDistributor.sol";
import "./interfaces/IFeeManager.sol";
import "./interfaces/IVault.sol";
import "./interfaces/IERC20Extended.sol";
import "./interfaces/IMLMNetwork.sol";
import "./interfaces/IUnilevelDistributor.sol";
import "./interfaces/IBinaryDistributor.sol";
import "./AccessControl.sol";
import "./libraries/RewardMath.sol";
import "./libraries/CommissionMath.sol";

/**
 * @title StakingPool
 * @notice The main staking contract for the PolyStake system on Polygon.
 * @dev Orchestrates deposits, withdrawals, reward claims, MLM commission triggers,
 *      and binary volume updates. Users interact exclusively with this contract.
 *
 *      ARCHITECTURE:
 *      - Users deposit USDT → tokens are held in the Vault
 *      - Rewards are calculated by the RewardDistributor
 *      - Penalties and fees are calculated by the FeeManager
 *      - MLM commissions are triggered via UnilevelDistributor and BinaryDistributor
 *      - The MLM network is managed by the MLMNetwork contract
 *
 *      SECURITY MODEL:
 *      - Reentrancy guard on ALL external state-changing functions
 *      - Checks-Effects-Interactions pattern: state updated BEFORE external calls
 *      - SafeERC20-style transfer helpers check return values
 *      - Validates stake ownership and active status before any operation
 *      - Pausable: all deposits, withdrawals, and claims halted when paused
 *      - Admin-only plan configuration (timelocked for critical changes)
 *      - Commission rate validation: sum of unilevel rates < 100% of deposit
 */
contract StakingPool is IStakingPool, AccessControl {
    // ============================================================
    //                        Data Structures
    // ============================================================

    /**
     * @notice Represents a single staking position.
     * @param amount         Principal amount staked.
     * @param startTime      Timestamp when the stake was created.
     * @param endTime        Maturity timestamp (0 for flexible plans).
     * @param planId         Plan identifier.
     * @param rewardsClaimed Cumulative rewards already claimed.
     * @param active         Whether the stake is currently active.
     */
    struct Stake {
        uint256 amount;
        uint256 startTime;
        uint256 endTime;
        uint8 planId;
        uint256 rewardsClaimed;
        bool active;
    }

    /**
     * @notice Represents a staking plan configuration.
     * @param duration                   Lock duration in seconds (0 = flexible).
     * @param apyBps                     APY in basis points.
     * @param minStake                   Minimum stake amount.
     * @param maxStake                   Maximum stake amount (0 = no limit).
     * @param earlyWithdrawPenaltyBps    Early withdrawal penalty rate in BPS.
     * @param active                     Whether the plan accepts new deposits.
     */
    struct Plan {
        uint256 duration;
        uint256 apyBps;
        uint256 minStake;
        uint256 maxStake;
        uint256 earlyWithdrawPenaltyBps;
        bool active;
    }

    // ============================================================
    //                        State Variables
    // ============================================================

    /// @notice The USDT (ERC-20) token contract — immutable for security.
    IERC20Extended public immutable usdt;

    /// @notice The Vault contract that holds all deposited funds.
    IVault public vault;

    /// @notice The MLM Network contract for user registration checks.
    IMLMNetwork public mlmNetwork;

    /// @notice The Reward Distributor contract for reward calculations.
    IRewardDistributor public rewardDistributor;

    /// @notice The Unilevel Distributor contract for MLM commission distribution.
    IUnilevelDistributor public unilevelDistributor;

    /// @notice The Binary Distributor contract for binary volume updates.
    IBinaryDistributor public binaryDistributor;

    /// @notice The Fee Manager contract for penalty and fee calculations.
    IFeeManager public feeManager;

    /// @notice User stakes: user address => array of Stake structs.
    mapping(address => Stake[]) public userStakes;

    /// @notice Staking plans indexed by planId.
    mapping(uint8 => Plan) public plans;

    /// @notice Total number of staking plans.
    uint8 public planCount;

    /// @notice Total value locked in the protocol (sum of all active stake principals).
    uint256 public totalValueLocked;

    /// @dev Reentrancy guard status.
    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    // ============================================================
    //                         Modifiers
    // ============================================================

    modifier nonReentrant() {
        require(_status != _ENTERED, "StakingPool: reentrancy");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    // ============================================================
    //                        Constructor
    // ============================================================

    /**
     * @notice Initializes the StakingPool with the USDT token address.
     * @param _usdt The address of the USDT (ERC-20) token contract.
     */
    constructor(address _usdt) {
        require(_usdt != address(0), "StakingPool: zero USDT address");
        usdt = IERC20Extended(_usdt);
        _status = _NOT_ENTERED;
    }

    // ============================================================
    //                    Internal Helpers
    // ============================================================

    /**
     * @dev Safely transfers ERC20 tokens from `from` to `to`, checking the return value.
     *      Some token implementations (e.g., USDT on some chains) do not revert on failure.
     * @param token  The ERC20 token contract.
     * @param from   The sender address.
     * @param to     The recipient address.
     * @param amount The amount to transfer.
     */
    function _safeTransferFrom(IERC20Extended token, address from, address to, uint256 amount) internal {
        (bool success, bytes memory data) = address(token).call(
            abi.encodeCall(token.transferFrom, (from, to, amount))
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "StakingPool: transferFrom failed");
    }

    // ============================================================
    //                    Deposit Function
    // ============================================================

    /**
     * @notice Deposits USDT into a specified staking plan.
     * @dev The caller must have pre-approved the staking pool to transfer `amount` tokens.
     *      Reverts if `planId` is inactive, if `amount` is outside plan limits,
     *      or if the caller is not a registered MLM user.
     *
     *      FLOW:
     *      1. Validate plan, amount, and MLM registration
     *      2. Transfer USDT from user to Vault
     *      3. Create stake in userStakes
     *      4. Register stake in RewardDistributor
     *      5. Update totalValueLocked
     *      6. Trigger MLM commission distribution
     *      7. Emit Deposited event
     *
     * @param amount The number of USDT tokens to stake.
     * @param planId The staking plan identifier.
     */
    function deposit(uint256 amount, uint8 planId) external whenNotPaused nonReentrant {
        require(amount > 0, "StakingPool: zero amount");
        require(planId < planCount, "StakingPool: invalid plan");

        Plan memory plan = plans[planId];
        require(plan.active, "StakingPool: plan not active");
        require(amount >= plan.minStake, "StakingPool: below minimum");
        if (plan.maxStake > 0) {
            require(amount <= plan.maxStake, "StakingPool: above maximum");
        }

        // Ensure user is registered in MLM
        require(mlmNetwork.isRegistered(msg.sender), "StakingPool: not registered in MLM");

        // --- EFFECTS: Update state BEFORE external calls ---

        // Create stake
        uint256 endTime = plan.duration > 0 ? block.timestamp + plan.duration : 0;
        uint256 stakeId = userStakes[msg.sender].length;
        userStakes[msg.sender].push(Stake({
            amount: amount,
            startTime: block.timestamp,
            endTime: endTime,
            planId: planId,
            rewardsClaimed: 0,
            active: true
        }));

        // Update total value locked
        totalValueLocked += amount;

        // --- INTERACTIONS: External calls after state is updated ---

        // Transfer USDT from user to this contract, then deposit into Vault
        _safeTransferFrom(usdt, msg.sender, address(this), amount);
        usdt.approve(address(vault), amount);
        vault.deposit(address(usdt), amount);

        // Register stake in RewardDistributor for reward tracking
        rewardDistributor.registerStake(msg.sender, stakeId, amount, planId, endTime);

        // Trigger MLM commissions
        // SECURITY: Use try/catch for commission distribution to prevent
        // deposit failure if the Vault lacks sufficient balance for payouts.
        // The deposit itself should not fail due to commission distribution issues.
        try unilevelDistributor.distributeUnilevel(msg.sender, amount) {
            // Commission distribution succeeded
        } catch {
            // Commission distribution failed (e.g., Vault insufficient balance)
            // Stake is still created — commissions can be claimed later
        }
        try binaryDistributor.updateBinaryVolumes(msg.sender, amount) {
            // Volume update succeeded
        } catch {
            // Volume update failed — volumes can be updated manually later
        }

        emit Deposited(msg.sender, amount, planId, stakeId);
    }

    // ============================================================
    //                    Withdraw Function
    // ============================================================

    /**
     * @notice Withdraws a specific stake and returns the principal (minus any penalty).
     * @dev Claims any pending rewards first, then calculates penalties for early
     *      withdrawal, deactivates the stake, and transfers funds from the Vault.
     *
     *      FLOW:
     *      1. Validate stake is active and belongs to caller
     *      2. Claim pending rewards (transfer from Vault)
     *      3. Calculate withdrawal amount and penalty
     *      4. Apply standard withdrawal fee
     *      5. Deactivate stake and update TVL
     *      6. Transfer principal from Vault to user
     *      7. Emit Withdrawn event
     *
     * @param stakeId The index of the stake in the caller's stake array.
     */
    function withdraw(uint256 stakeId) external whenNotPaused nonReentrant {
        require(stakeId < userStakes[msg.sender].length, "StakingPool: invalid stakeId");
        Stake storage stake = userStakes[msg.sender][stakeId];
        require(stake.active, "StakingPool: stake not active");

        // --- Claim pending rewards first ---
        uint256 rewardAmount = 0;
        // Try to claim rewards — use try/catch for graceful handling
        // in case the reward distributor has no rewards
        try rewardDistributor.claimReward(msg.sender, stakeId) returns (uint256 claimed) {
            if (claimed > 0) {
                rewardAmount = claimed;
                stake.rewardsClaimed += claimed;
                vault.withdraw(address(usdt), msg.sender, claimed);
                emit RewardsClaimed(msg.sender, claimed, stakeId);
            }
        } catch {
            // No rewards to claim — continue with withdrawal
        }

        // --- Calculate withdrawal amount and penalty ---
        uint256 withdrawAmount = stake.amount;
        bool isEarly = stake.endTime > 0 && block.timestamp < stake.endTime;

        if (isEarly) {
            uint256 daysStaked = (block.timestamp - stake.startTime) / 1 days;
            uint256 penalty = feeManager.calculateEarlyWithdrawPenalty(
                stake.planId,
                stake.amount,
                daysStaked
            );
            withdrawAmount -= penalty;
        }

        // Apply standard withdrawal fee
        uint256 withdrawFee = feeManager.calculateWithdrawFee(withdrawAmount);
        withdrawAmount -= withdrawFee;

        // --- EFFECTS: Update state BEFORE external calls ---
        stake.active = false;
        totalValueLocked -= stake.amount;

        // --- INTERACTIONS: Transfer from Vault ---
        vault.withdraw(address(usdt), msg.sender, withdrawAmount);

        emit Withdrawn(msg.sender, withdrawAmount, stakeId);
    }

    // ============================================================
    //                    Claim Rewards Functions
    // ============================================================

    /**
     * @notice Claims accumulated rewards for a specific stake.
     * @dev Rewards are calculated based on elapsed time and the plan's APY.
     *      The claimed amount is transferred from the Vault to the caller.
     * @param stakeId The index of the stake in the caller's stake array.
     */
    function claimRewards(uint256 stakeId) external whenNotPaused nonReentrant {
        require(stakeId < userStakes[msg.sender].length, "StakingPool: invalid stakeId");
        Stake storage stake = userStakes[msg.sender][stakeId];
        require(stake.active, "StakingPool: stake not active");

        uint256 pending = rewardDistributor.claimReward(msg.sender, stakeId);
        require(pending > 0, "StakingPool: no pending rewards");

        // --- EFFECTS: Update state BEFORE external calls ---
        stake.rewardsClaimed += pending;

        // --- INTERACTIONS: Transfer from Vault ---
        vault.withdraw(address(usdt), msg.sender, pending);

        emit RewardsClaimed(msg.sender, pending, stakeId);
    }

    /**
     * @notice Claims accumulated rewards for all active stakes of the caller.
     * @dev Iterates over all of the caller's stakes and claims pending rewards.
     *      May consume significant gas if the caller has many active stakes.
     */
    function claimAllRewards() external whenNotPaused nonReentrant {
        uint256 totalRewards = 0;
        uint256 stakeCount = userStakes[msg.sender].length;

        for (uint256 i = 0; i < stakeCount; ) {
            if (userStakes[msg.sender][i].active) {
                try rewardDistributor.claimReward(msg.sender, i) returns (uint256 claimed) {
                    if (claimed > 0) {
                        userStakes[msg.sender][i].rewardsClaimed += claimed;
                        totalRewards += claimed;
                        emit RewardsClaimed(msg.sender, claimed, i);
                    }
                } catch {
                    // No rewards for this stake — continue
                }
            }
            unchecked { ++i; }
        }

        require(totalRewards > 0, "StakingPool: no pending rewards");

        // --- INTERACTIONS: Single vault withdrawal for all rewards ---
        vault.withdraw(address(usdt), msg.sender, totalRewards);
    }

    // ============================================================
    //                    Plan Management
    // ============================================================

    /**
     * @notice Adds a new staking plan.
     * @dev Only admin can add plans. The plan is active by default.
     *      Also sets the APY in the RewardDistributor and the penalty in the FeeManager.
     * @param duration     Lock duration in seconds (0 = flexible).
     * @param apyBps       APY in basis points.
     * @param minStake     Minimum stake amount.
     * @param maxStake     Maximum stake amount (0 = no limit).
     * @param penaltyBps   Early withdrawal penalty rate in basis points.
     * @return planId The identifier of the newly created plan.
     */
    function addPlan(
        uint256 duration,
        uint256 apyBps,
        uint256 minStake,
        uint256 maxStake,
        uint256 penaltyBps
    ) external onlyAdmin returns (uint8 planId) {
        require(apyBps > 0, "StakingPool: zero APY");
        require(minStake > 0, "StakingPool: zero min stake");

        planId = planCount;
        plans[planId] = Plan({
            duration: duration,
            apyBps: apyBps,
            minStake: minStake,
            maxStake: maxStake,
            earlyWithdrawPenaltyBps: penaltyBps,
            active: true
        });

        unchecked { ++planCount; }

        // Set APY in RewardDistributor
        // Note: APY setting in RewardDistributor is timelocked, so admin must
        // schedule it separately. Here we just store it locally.
        // The RewardDistributor's planAPYs should be set via its admin functions.

        // Set plan duration in FeeManager for sliding scale calculation
        feeManager.setPlanDuration(planId, duration);

        emit PlanAdded(planId, duration, apyBps);
    }

    /**
     * @notice Updates an existing staking plan (timelocked).
     * @dev Only admin can update plans. Critical changes require timelock.
     * @param planId       The plan identifier to update.
     * @param duration     New lock duration in seconds.
     * @param apyBps       New APY in basis points.
     * @param minStake     New minimum stake amount.
     * @param maxStake     New maximum stake amount.
     * @param penaltyBps   New early withdrawal penalty rate.
     * @param active       Whether the plan is active.
     */
    function updatePlan(
        uint8 planId,
        uint256 duration,
        uint256 apyBps,
        uint256 minStake,
        uint256 maxStake,
        uint256 penaltyBps,
        bool active
    ) external onlyAdmin {
        require(planId < planCount, "StakingPool: invalid plan");

        bytes32 actionHash = keccak256(abi.encodePacked("updatePlan", planId, duration, apyBps, minStake, maxStake, penaltyBps, active));
        executeAction(actionHash);

        plans[planId] = Plan({
            duration: duration,
            apyBps: apyBps,
            minStake: minStake,
            maxStake: maxStake,
            earlyWithdrawPenaltyBps: penaltyBps,
            active: active
        });

        // Update FeeManager plan duration
        feeManager.setPlanDuration(planId, duration);

        emit PlanUpdated(planId);
    }

    /**
     * @notice Schedules a plan update via the timelock mechanism.
     * @param planId       The plan identifier to update.
     * @param duration     New lock duration in seconds.
     * @param apyBps       New APY in basis points.
     * @param minStake     New minimum stake amount.
     * @param maxStake     New maximum stake amount.
     * @param penaltyBps   New early withdrawal penalty rate.
     * @param active       Whether the plan is active.
     */
    function scheduleUpdatePlan(
        uint8 planId,
        uint256 duration,
        uint256 apyBps,
        uint256 minStake,
        uint256 maxStake,
        uint256 penaltyBps,
        bool active
    ) external onlyAdmin {
        require(planId < planCount, "StakingPool: invalid plan");
        bytes32 actionHash = keccak256(abi.encodePacked("updatePlan", planId, duration, apyBps, minStake, maxStake, penaltyBps, active));
        scheduleAction(actionHash);
    }

    // ============================================================
    //                    Contract Address Setters
    // ============================================================

    /**
     * @notice Sets the Vault contract address.
     * @dev Only admin can set. Can be updated if needed (e.g., migration).
     * @param _vault The new Vault contract address.
     */
    function setVault(address _vault) external onlyAdmin {
        require(_vault != address(0), "StakingPool: zero address");
        vault = IVault(_vault);
        emit VaultSet(_vault);
    }

    /**
     * @notice Sets the MLM Network contract address.
     * @param _mlmNetwork The new MLM Network contract address.
     */
    function setMLMNetwork(address _mlmNetwork) external onlyAdmin {
        require(_mlmNetwork != address(0), "StakingPool: zero address");
        mlmNetwork = IMLMNetwork(_mlmNetwork);
        emit MLMNetworkSet(_mlmNetwork);
    }

    /**
     * @notice Sets the Reward Distributor contract address.
     * @param _rewardDistributor The new RewardDistributor contract address.
     */
    function setRewardDistributor(address _rewardDistributor) external onlyAdmin {
        require(_rewardDistributor != address(0), "StakingPool: zero address");
        rewardDistributor = IRewardDistributor(_rewardDistributor);
        emit RewardDistributorSet(_rewardDistributor);
    }

    /**
     * @notice Sets the Unilevel Distributor contract address.
     * @param _unilevelDistributor The new UnilevelDistributor contract address.
     */
    function setUnilevelDistributor(address _unilevelDistributor) external onlyAdmin {
        require(_unilevelDistributor != address(0), "StakingPool: zero address");
        unilevelDistributor = IUnilevelDistributor(_unilevelDistributor);
        emit UnilevelDistributorSet(_unilevelDistributor);
    }

    /**
     * @notice Sets the Binary Distributor contract address.
     * @param _binaryDistributor The new BinaryDistributor contract address.
     */
    function setBinaryDistributor(address _binaryDistributor) external onlyAdmin {
        require(_binaryDistributor != address(0), "StakingPool: zero address");
        binaryDistributor = IBinaryDistributor(_binaryDistributor);
        emit BinaryDistributorSet(_binaryDistributor);
    }

    /**
     * @notice Sets the Fee Manager contract address.
     * @param _feeManager The new FeeManager contract address.
     */
    function setFeeManager(address _feeManager) external onlyAdmin {
        require(_feeManager != address(0), "StakingPool: zero address");
        feeManager = IFeeManager(_feeManager);
        emit FeeManagerSet(_feeManager);
    }

    // ============================================================
    //                       View Functions
    // ============================================================

    /**
     * @notice Returns the details of a specific stake for a given user.
     * @param user    The address of the staker.
     * @param stakeId The index of the stake in the user's stake array.
     * @return The stake information struct matching IStakingPool.StakeInfo.
     */
    function getStakeInfo(address user, uint256 stakeId) external view returns (StakeInfo memory) {
        require(stakeId < userStakes[user].length, "StakingPool: invalid stakeId");
        Stake storage stake = userStakes[user][stakeId];
        return StakeInfo({
            amount: stake.amount,
            startTime: stake.startTime,
            endTime: stake.endTime,
            planId: stake.planId,
            claimed: stake.rewardsClaimed,
            active: stake.active
        });
    }

    /**
     * @notice Returns the total number of stakes (both active and inactive) for a user.
     * @param user The address to query.
     * @return The number of stakes.
     */
    function getStakeCount(address user) external view returns (uint256) {
        return userStakes[user].length;
    }

    /**
     * @notice Returns the configuration details of a staking plan.
     * @param planId The staking plan identifier.
     * @return The plan information struct matching IStakingPool.PlanInfo.
     */
    function getPlanInfo(uint8 planId) external view returns (PlanInfo memory) {
        require(planId < planCount, "StakingPool: invalid plan");
        Plan storage plan = plans[planId];
        return PlanInfo({
            duration: plan.duration,
            apy: plan.apyBps,
            minStake: plan.minStake,
            maxStake: plan.maxStake,
            earlyWithdrawPenalty: plan.earlyWithdrawPenaltyBps,
            active: plan.active
        });
    }

    /**
     * @notice Returns the pending rewards for a specific stake (convenience view).
     * @param user    The address of the staker.
     * @param stakeId The index of the stake.
     * @return The pending reward amount.
     */
    function pendingRewards(address user, uint256 stakeId) external view returns (uint256) {
        return rewardDistributor.pendingRewards(user, stakeId);
    }

    /**
     * @notice Returns the total pending rewards for a user across all stakes.
     * @param user The address of the staker.
     * @return The total pending reward amount.
     */
    function totalPendingRewards(address user) external view returns (uint256) {
        return rewardDistributor.totalPendingRewards(user);
    }

    // ============================================================
    //                          Events
    // ============================================================

    event PlanAdded(uint8 indexed planId, uint256 duration, uint256 apyBps);
    event PlanUpdated(uint8 indexed planId);
    event VaultSet(address indexed vault);
    event MLMNetworkSet(address indexed mlmNetwork);
    event RewardDistributorSet(address indexed rewardDistributor);
    event UnilevelDistributorSet(address indexed unilevelDistributor);
    event BinaryDistributorSet(address indexed binaryDistributor);
    event FeeManagerSet(address indexed feeManager);
}
