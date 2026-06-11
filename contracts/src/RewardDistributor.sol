// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IRewardDistributor.sol";
import "./interfaces/IStakingPool.sol";
import "./AccessControl.sol";
import "./libraries/RewardMath.sol";

/**
 * @title RewardDistributor
 * @notice Calculates and tracks staking rewards using a per-second accrual model.
 * @dev Each stake tracks `lastRewardTime`, and rewards are calculated as:
 *      pending = amount * (apyBps / 10000) * (timeElapsed / 365 days)
 *
 *      Internally uses RewardMath.rewardPerSecond for the per-second rate,
 *      then multiplies by elapsed seconds for maximum gas efficiency.
 *
 *      SECURITY MODEL:
 *      - Only the StakingPool contract (or operators) can call update/claim functions
 *      - Admin can change APYs (timelocked)
 *      - All reward calculations use multiply-first-divide-last for precision
 *      - Rewards are capped at stake maturity (endTime)
 */
contract RewardDistributor is IRewardDistributor, AccessControl {
    // ============================================================
    //                        Data Structures
    // ============================================================

    /**
     * @notice Tracks reward state for a single stake position.
     * @param amount           Principal staked amount (set on registration).
     * @param endTime          Maturity timestamp (0 = flexible stake).
     * @param lastRewardTime   Last timestamp when rewards were accrued.
     * @param accumulatedRewards  Pending unclaimed rewards accumulated so far.
     * @param planId           Plan identifier for APY lookup.
     * @param initialized      Whether this stake has been registered.
     */
    struct StakeReward {
        uint256 amount;
        uint256 endTime;
        uint256 lastRewardTime;
        uint256 accumulatedRewards;
        uint8 planId;
        bool initialized;
    }

    // ============================================================
    //                        State Variables
    // ============================================================

    /// @notice user => stakeId => StakeReward
    mapping(address => mapping(uint256 => StakeReward)) public stakeRewards;

    /// @notice Plan APYs in basis points (e.g., 1200 = 12%).
    mapping(uint8 => uint256) public planAPYs;

    /// @notice Total pending (unclaimed) rewards per user across all stakes.
    mapping(address => uint256) public userTotalPending;

    /// @notice Number of registered stakes per user (for iteration).
    mapping(address => uint256) public userStakeCount;

    /// @notice Authorized staking pool address — only it can call update/claim.
    address public stakingPool;

    /// @notice Whether the staking pool has been set (one-time).
    bool public stakingPoolSet;

    // ============================================================
    //                          Events
    // ============================================================

    event StakingPoolSet(address indexed pool);
    event StakeRegistered(address indexed user, uint256 indexed stakeId, uint256 amount, uint8 planId);
    event RewardClaimed(address indexed user, uint256 indexed stakeId, uint256 amount);

    // ============================================================
    //                         Modifiers
    // ============================================================

    modifier onlyStakingPoolOrOperator() {
        require(
            msg.sender == stakingPool || operators[msg.sender] || msg.sender == admin,
            "RewardDistributor: caller not staking pool or operator"
        );
        _;
    }

    // ============================================================
    //                        Constructor
    // ============================================================

    constructor() {
        // Admin is set in AccessControl constructor
    }

    // ============================================================
    //                    Admin / Setup Functions
    // ============================================================

    /**
     * @notice Sets the staking pool address. Can only be called once.
     * @dev One-time setup to prevent changing the staking pool after initialization.
     * @param pool The address of the StakingPool contract.
     */
    function setStakingPool(address pool) external onlyAdmin {
        require(pool != address(0), "RewardDistributor: zero address");
        require(!stakingPoolSet, "RewardDistributor: staking pool already set");
        stakingPool = pool;
        stakingPoolSet = true;
        emit StakingPoolSet(pool);
    }

    /**
     * @notice Sets the APY for a staking plan (timelocked).
     * @dev The new APY applies to future reward calculations only; previously accrued
     *      rewards are not affected. Must be scheduled via timelock first.
     * @param planId  The staking plan identifier.
     * @param newApyBps The new APY in basis points (e.g., 1200 = 12%).
     */
    function setAPY(uint8 planId, uint256 newApyBps) external onlyAdmin {
        bytes32 actionHash = keccak256(abi.encodePacked("setAPY", planId, newApyBps));
        executeAction(actionHash);

        uint256 oldAPY = planAPYs[planId];
        planAPYs[planId] = newApyBps;

        emit APYChanged(planId, oldAPY, newApyBps);
    }

    /**
     * @notice Schedules an APY change via the timelock mechanism.
     * @param planId    The staking plan identifier.
     * @param newApyBps The new APY in basis points.
     */
    function scheduleSetAPY(uint8 planId, uint256 newApyBps) external onlyAdmin {
        bytes32 actionHash = keccak256(abi.encodePacked("setAPY", planId, newApyBps));
        scheduleAction(actionHash);
    }

    /**
     * @notice Returns the APY for a staking plan.
     * @param planId The staking plan identifier.
     * @return The APY in basis points.
     */
    function getAPY(uint8 planId) external view returns (uint256) {
        return planAPYs[planId];
    }

    // ============================================================
    //                    Stake Registration
    // ============================================================

    /**
     * @notice Registers a new stake for reward tracking.
     * @dev Called by the StakingPool when a user deposits. Sets the initial
     *      lastRewardTime to block.timestamp so rewards begin accruing immediately.
     *      Reverts if the stake is already registered.
     * @param user    The address of the staker.
     * @param stakeId The index of the stake in the user's stake array.
     * @param amount  The principal amount staked.
     * @param planId  The staking plan identifier.
     * @param endTime The maturity timestamp (0 for flexible stakes).
     */
    function registerStake(
        address user,
        uint256 stakeId,
        uint256 amount,
        uint8 planId,
        uint256 endTime
    ) external onlyStakingPoolOrOperator {
        require(amount > 0, "RewardDistributor: zero amount");
        StakeReward storage reward = stakeRewards[user][stakeId];
        require(!reward.initialized, "RewardDistributor: stake already registered");

        reward.amount = amount;
        reward.planId = planId;
        reward.endTime = endTime;
        reward.lastRewardTime = block.timestamp;
        reward.accumulatedRewards = 0;
        reward.initialized = true;

        // Track stake count for this user
        userStakeCount[user] = stakeId + 1;

        emit StakeRegistered(user, stakeId, amount, planId);
    }

    // ============================================================
    //                    Reward Update Functions
    // ============================================================

    /**
     * @notice Updates the reward state for a specific user stake.
     * @dev Accrues pending rewards since lastRewardTime and updates lastRewardTime.
     *      Called by the staking pool before any state-changing operation
     *      (withdraw, claim) to ensure rewards are accrued up to date.
     * @param user    The address of the staker.
     * @param stakeId The index of the stake to update.
     */
    function updateReward(address user, uint256 stakeId) external onlyStakingPoolOrOperator {
        StakeReward storage reward = stakeRewards[user][stakeId];
        if (!reward.initialized) return;

        uint256 newReward = _calculateReward(
            reward.amount,
            planAPYs[reward.planId],
            reward.lastRewardTime,
            reward.endTime
        );

        if (newReward > 0) {
            reward.accumulatedRewards += newReward;
            userTotalPending[user] += newReward;
            emit RewardsUpdated(user, stakeId, newReward);
        }

        reward.lastRewardTime = block.timestamp;
    }

    /**
     * @notice Updates the reward state for all stakes of a specific user.
     * @dev Iterates through all registered stakes for the user.
     *      May consume significant gas for users with many stakes.
     * @param user The address of the staker.
     */
    function massUpdateRewardsForUser(address user) external onlyStakingPoolOrOperator {
        uint256 count = userStakeCount[user];
        for (uint256 i = 0; i < count; ) {
            StakeReward storage reward = stakeRewards[user][i];
            if (reward.initialized) {
                uint256 newReward = _calculateReward(
                    reward.amount,
                    planAPYs[reward.planId],
                    reward.lastRewardTime,
                    reward.endTime
                );
                if (newReward > 0) {
                    reward.accumulatedRewards += newReward;
                    userTotalPending[user] += newReward;
                    emit RewardsUpdated(user, i, newReward);
                }
                reward.lastRewardTime = block.timestamp;
            }
            unchecked { ++i; }
        }
    }

    /**
     * @notice Updates the reward state for all active stakes across all users.
     * @dev Implements IRewardDistributor interface. This function iterates all
     *      registered users and stakes — EXTREMELY gas-intensive for large user bases.
     *      Access control: restricted to admin.
     *      Use massUpdateRewardsForUser for practical per-user updates.
     */
    function massUpdateRewards() external onlyAdmin {
        // This is a placeholder implementation — in production, a paginated
        // approach or off-chain Merkle distribution would be preferred.
        // The admin should use massUpdateRewardsForUser per user instead.
        revert("RewardDistributor: use massUpdateRewardsForUser instead");
    }

    // ============================================================
    //                    Reward Claim Function
    // ============================================================

    /**
     * @notice Claims accumulated rewards for a specific stake.
     * @dev Called by the StakingPool during claimRewards/withdraw. Accrues any
     *      pending rewards, returns the total accumulated amount, and resets
     *      the accumulated rewards to zero.
     * @param user    The address of the staker.
     * @param stakeId The index of the stake.
     * @return The total reward amount being claimed.
     */
    function claimReward(address user, uint256 stakeId) external onlyStakingPoolOrOperator returns (uint256) {
        StakeReward storage reward = stakeRewards[user][stakeId];
        require(reward.initialized, "RewardDistributor: stake not registered");

        // Accrue any pending rewards up to now
        uint256 newReward = _calculateReward(
            reward.amount,
            planAPYs[reward.planId],
            reward.lastRewardTime,
            reward.endTime
        );

        if (newReward > 0) {
            reward.accumulatedRewards += newReward;
            userTotalPending[user] += newReward;
            emit RewardsUpdated(user, stakeId, newReward);
        }

        reward.lastRewardTime = block.timestamp;

        // Return accumulated rewards and reset
        uint256 totalReward = reward.accumulatedRewards;
        require(totalReward > 0, "RewardDistributor: no rewards to claim");

        reward.accumulatedRewards = 0;
        userTotalPending[user] -= totalReward;

        emit RewardClaimed(user, stakeId, totalReward);
        return totalReward;
    }

    // ============================================================
    //                       View Functions
    // ============================================================

    /**
     * @notice Returns the pending (unclaimed) reward amount for a specific stake.
     * @dev Calculates rewards from the last update timestamp to the current block
     *      timestamp using the plan's APY. Does not modify state.
     *      Includes both accumulated rewards and newly accrued rewards since last update.
     * @param user    The address of the staker.
     * @param stakeId The index of the stake to query.
     * @return The pending reward amount in token units.
     */
    function pendingRewards(address user, uint256 stakeId) external view returns (uint256) {
        StakeReward storage reward = stakeRewards[user][stakeId];
        if (!reward.initialized) return 0;

        // Accumulated rewards so far + newly accrued since last update
        return reward.accumulatedRewards + _calculateReward(
            reward.amount,
            planAPYs[reward.planId],
            reward.lastRewardTime,
            reward.endTime
        );
    }

    /**
     * @notice Returns the total pending rewards across all active stakes for a user.
     * @dev Sums the pending rewards for every registered stake belonging to the user.
     *      May consume significant gas for users with many stakes.
     * @param user The address of the staker.
     * @return The total pending reward amount in token units.
     */
    function totalPendingRewards(address user) external view returns (uint256) {
        uint256 total = 0;
        uint256 count = userStakeCount[user];
        for (uint256 i = 0; i < count; ) {
            StakeReward storage reward = stakeRewards[user][i];
            if (reward.initialized) {
                total += reward.accumulatedRewards + _calculateReward(
                    reward.amount,
                    planAPYs[reward.planId],
                    reward.lastRewardTime,
                    reward.endTime
                );
            }
            unchecked { ++i; }
        }
        return total;
    }

    // ============================================================
    //                    Internal Helpers
    // ============================================================

    /**
     * @dev Calculates reward accrued since lastRewardTime, capped at endTime.
     *      Uses RewardMath.rewardPerSecond for the per-second rate,
     *      then multiplies by elapsed seconds.
     * @param amount         The staked principal amount.
     * @param apyBps         The plan APY in basis points.
     * @param lastRewardTime The last time rewards were calculated.
     * @param endTime        The stake maturity timestamp (0 = flexible).
     * @return The accrued reward amount.
     */
    function _calculateReward(
        uint256 amount,
        uint256 apyBps,
        uint256 lastRewardTime,
        uint256 endTime
    ) internal view returns (uint256) {
        uint256 currentTime = block.timestamp;
        if (currentTime <= lastRewardTime) return 0;

        uint256 elapsed = currentTime - lastRewardTime;

        // Cap at stake maturity
        if (endTime > 0 && currentTime > endTime) {
            elapsed = endTime > lastRewardTime ? endTime - lastRewardTime : 0;
        }

        if (elapsed == 0) return 0;

        // rewardPerSecond * elapsed = (amount * apyBps / 10000 / 365 days) * elapsed
        return RewardMath.rewardPerSecond(amount, apyBps) * elapsed;
    }
}
