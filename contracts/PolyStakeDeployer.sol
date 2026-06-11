// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./src/Vault.sol";
import "./src/MLMNetwork.sol";
import "./src/RewardDistributor.sol";
import "./src/FeeManager.sol";
import "./src/UnilevelDistributor.sol";
import "./src/BinaryDistributor.sol";
import "./src/StakingPool.sol";
import "./src/ReferralNFT.sol";

/**
 * @title PolyStakeDeployer
 * @notice Deployment helper contract that deploys all PolyStake system contracts in the
 *         correct order with proper initialization, wiring, and operator setup.
 * @dev This contract serves as a REFERENCE deployment script. It documents the exact
 *      deployment order, initialization parameters, and cross-contract wiring required
 *      for the PolyStake system.
 *
 *      NOTE: Due to the contract size limit (24KB on Polygon), this contract may exceed
 *      the deployment limit. For production deployment, use Hardhat or Foundry scripts
 *      that deploy each contract individually in separate transactions, following the
 *      same order and initialization steps documented here.
 *
 *      DEPLOYMENT ORDER:
 *      1. Vault            — requires USDT address
 *      2. MLMNetwork       — no constructor dependencies (registers deployer as root)
 *      3. FeeManager       — no constructor dependencies
 *      4. RewardDistributor — no constructor dependencies
 *      5. UnilevelDistributor — requires MLMNetwork, Vault, USDT
 *      6. BinaryDistributor   — requires MLMNetwork, Vault, USDT
 *      7. StakingPool      — requires USDT address; other contracts set via setters
 *      8. ReferralNFT      — requires MLMNetwork
 *
 *      POST-DEPLOYMENT WIRING:
 *      - Set all cross-contract references on StakingPool
 *      - Set StakingPool on RewardDistributor (one-time)
 *      - Set ReferralNFT on MLMNetwork
 *      - Add operators to each contract
 *      - Add default staking plans (3 plans)
 *      - Schedule APY changes on RewardDistributor (timelocked — 2 days)
 *
 *      POST-DEPLOYMENT STEPS (by multisig after timelock):
 *      1. Accept admin on all contracts via acceptAdmin()
 *      2. Wait 2 days for timelocked APY changes
 *      3. Execute scheduled APY changes on RewardDistributor
 *      4. Verify all contract addresses and operator settings
 */
contract PolyStakeDeployer {
    // ============================================================
    //                        Data Structures
    // ============================================================

    /**
     * @notice Contains the addresses of all deployed contracts.
     * @param vault               The Vault contract address.
     * @param mlmNetwork          The MLMNetwork contract address.
     * @param feeManager          The FeeManager contract address.
     * @param rewardDistributor   The RewardDistributor contract address.
     * @param unilevelDistributor The UnilevelDistributor contract address.
     * @param binaryDistributor   The BinaryDistributor contract address.
     * @param stakingPool         The StakingPool contract address.
     * @param referralNFT         The ReferralNFT contract address.
     */
    struct DeployedContracts {
        address vault;
        address mlmNetwork;
        address feeManager;
        address rewardDistributor;
        address unilevelDistributor;
        address binaryDistributor;
        address stakingPool;
        address referralNFT;
    }

    // ============================================================
    //                        State Variables
    // ============================================================

    /// @notice The admin address (deployer EOA or multisig).
    address public admin;

    /// @notice The addresses of all deployed contracts.
    DeployedContracts public deployed;

    /// @notice Whether the deployment has been executed (one-time).
    bool public isDeployed;

    /// @notice The multisig address proposed as admin for all contracts.
    address public proposedMultisig;

    // ============================================================
    //                        Constants
    // ============================================================

    /// @notice Default minimum stake amount: 100 USDT (18 decimals).
    uint256 private constant MIN_STAKE = 100 * 10 ** 18;

    /// @notice Plan 1 APY: 12% = 1200 basis points.
    uint256 private constant PLAN1_APY_BPS = 1200;

    /// @notice Plan 2 APY: 18% = 1800 basis points.
    uint256 private constant PLAN2_APY_BPS = 1800;

    /// @notice Plan 3 APY: 25% = 2500 basis points.
    uint256 private constant PLAN3_APY_BPS = 2500;

    /// @notice Plan 1 duration: 30 days.
    uint256 private constant PLAN1_DURATION = 30 days;

    /// @notice Plan 2 duration: 90 days.
    uint256 private constant PLAN2_DURATION = 90 days;

    /// @notice Plan 3 duration: 180 days.
    uint256 private constant PLAN3_DURATION = 180 days;

    /// @notice Plan 1 early withdrawal penalty: 5% = 500 bps.
    uint256 private constant PLAN1_PENALTY_BPS = 500;

    /// @notice Plan 2 early withdrawal penalty: 10% = 1000 bps.
    uint256 private constant PLAN2_PENALTY_BPS = 1000;

    /// @notice Plan 3 early withdrawal penalty: 15% = 1500 bps.
    uint256 private constant PLAN3_PENALTY_BPS = 1500;

    /// @notice Plan 1 maximum stake: 10,000 USDT.
    uint256 private constant PLAN1_MAX = 10000 * 10 ** 18;

    /// @notice Plan 2 maximum stake: 50,000 USDT.
    uint256 private constant PLAN2_MAX = 50000 * 10 ** 18;

    /// @notice Plan 3 maximum stake: 200,000 USDT.
    uint256 private constant PLAN3_MAX = 200000 * 10 ** 18;

    // ============================================================
    //                          Events
    // ============================================================

    /// @notice Emitted when the full deployment is completed.
    event DeploymentCompleted(DeployedContracts contracts);

    /// @notice Emitted when admin is proposed for transfer to multisig.
    event AdminProposed(address indexed multisig);

    // ============================================================
    //                        Constructor
    // ============================================================

    /**
     * @notice Initializes the Deployer with the admin address.
     * @dev The admin is the EOA that deploys this contract.
     */
    constructor() {
        admin = msg.sender;
    }

    // ============================================================
    //                    Modifiers
    // ============================================================

    modifier onlyAdmin() {
        require(msg.sender == admin, "PolyStakeDeployer: caller is not admin");
        _;
    }

    // ============================================================
    //                   Main Deploy Function
    // ============================================================

    /**
     * @notice Deploys all PolyStake contracts, wires them together, and configures defaults.
     * @dev Can only be called once by the admin. The `usdt` address must be a valid
     *      ERC-20 USDT contract on Polygon. The `multisig` address is the
     *      target admin address (typically a Gnosis Safe or hardware wallet).
     *
     *      After calling this function:
     *      1. The multisig must call `acceptAdmin()` on EACH deployed contract
     *      2. Wait 2 days for the timelocked APY changes on RewardDistributor
     *      3. The multisig must call `rewardDistributor.setAPY()` for each plan
     *
     * @param usdt     The USDT (ERC-20) token contract address on Polygon.
     * @param multisig The multisig wallet address to receive admin rights.
     * @return contracts The DeployedContracts struct with all deployed addresses.
     */
    function deploy(
        address usdt,
        address multisig
    ) external onlyAdmin returns (DeployedContracts memory) {
        require(!isDeployed, "PolyStakeDeployer: already deployed");
        require(usdt != address(0), "PolyStakeDeployer: zero USDT address");
        require(multisig != address(0), "PolyStakeDeployer: zero multisig address");

        proposedMultisig = multisig;

        // ────────────────────────────────────────────────────────────
        //  STEP 1: Deploy all contracts in dependency order
        // ────────────────────────────────────────────────────────────

        // 1. Vault — holds all deposited USDT
        Vault vault = new Vault(usdt);

        // 2. MLMNetwork — binary tree MLM structure (deployer = root user)
        MLMNetwork mlmNetwork = new MLMNetwork();

        // 3. FeeManager — early withdrawal penalties and fees
        FeeManager feeManager = new FeeManager();

        // 4. RewardDistributor — per-second reward accrual
        RewardDistributor rewardDistributor = new RewardDistributor();

        // 5. UnilevelDistributor — unilevel commission distribution
        //    Constructor initializes default rates: 10%, 5%, 3%, 2%, 1%
        UnilevelDistributor unilevelDistributor = new UnilevelDistributor(
            address(mlmNetwork),
            address(vault),
            usdt
        );

        // 6. BinaryDistributor — binary bonus based on weak leg volume
        //    Constructor initializes default rate: 10% (1000 bps)
        BinaryDistributor binaryDistributor = new BinaryDistributor(
            address(mlmNetwork),
            address(vault),
            usdt
        );

        // 7. StakingPool — main user-facing contract for deposits/withdrawals
        StakingPool stakingPool = new StakingPool(usdt);

        // 8. ReferralNFT — soulbound NFT for MLM network identity
        ReferralNFT referralNFT = new ReferralNFT(address(mlmNetwork));

        // ────────────────────────────────────────────────────────────
        //  STEP 2: Wire cross-contract references
        // ────────────────────────────────────────────────────────────

        _wireContracts(
            stakingPool,
            rewardDistributor,
            mlmNetwork,
            vault,
            feeManager,
            unilevelDistributor,
            binaryDistributor,
            referralNFT
        );

        // ────────────────────────────────────────────────────────────
        //  STEP 3: Add operators to each contract
        // ────────────────────────────────────────────────────────────

        _addOperators(
            vault,
            mlmNetwork,
            feeManager,
            rewardDistributor,
            unilevelDistributor,
            binaryDistributor,
            stakingPool,
            referralNFT
        );

        // ────────────────────────────────────────────────────────────
        //  STEP 4: Add default staking plans
        // ────────────────────────────────────────────────────────────

        _addDefaultPlans(stakingPool);

        // ────────────────────────────────────────────────────────────
        //  STEP 5: Schedule APY changes on RewardDistributor
        //  (Cannot execute immediately due to 2-day timelock)
        // ────────────────────────────────────────────────────────────

        _scheduleAPYChanges(rewardDistributor);

        // ────────────────────────────────────────────────────────────
        //  STEP 6: Propose admin transfer to multisig
        // ────────────────────────────────────────────────────────────

        _proposeAdminTransfer(
            multisig,
            vault,
            mlmNetwork,
            feeManager,
            rewardDistributor,
            unilevelDistributor,
            binaryDistributor,
            stakingPool,
            referralNFT
        );

        // ────────────────────────────────────────────────────────────
        //  Store deployed addresses and mark as deployed
        // ────────────────────────────────────────────────────────────

        deployed = DeployedContracts({
            vault: address(vault),
            mlmNetwork: address(mlmNetwork),
            feeManager: address(feeManager),
            rewardDistributor: address(rewardDistributor),
            unilevelDistributor: address(unilevelDistributor),
            binaryDistributor: address(binaryDistributor),
            stakingPool: address(stakingPool),
            referralNFT: address(referralNFT)
        });

        isDeployed = true;

        emit DeploymentCompleted(deployed);
        emit AdminProposed(multisig);

        return deployed;
    }

    // ============================================================
    //                Internal Wiring Functions
    // ============================================================

    /**
     * @dev Sets all cross-contract references.
     *      StakingPool needs references to all other contracts.
     *      RewardDistributor needs the StakingPool address (one-time set).
     *      MLMNetwork needs the ReferralNFT address for auto-minting.
     */
    function _wireContracts(
        StakingPool stakingPool,
        RewardDistributor rewardDistributor,
        MLMNetwork mlmNetwork,
        Vault vault,
        FeeManager feeManager,
        UnilevelDistributor uniDistributor,
        BinaryDistributor binDistributor,
        ReferralNFT referralNFT
    ) internal {
        // Set contract addresses on StakingPool
        stakingPool.setVault(address(vault));
        stakingPool.setMLMNetwork(address(mlmNetwork));
        stakingPool.setRewardDistributor(address(rewardDistributor));
        stakingPool.setUnilevelDistributor(address(uniDistributor));
        stakingPool.setBinaryDistributor(address(binDistributor));
        stakingPool.setFeeManager(address(feeManager));

        // Set StakingPool on RewardDistributor (one-time, irrevocable)
        rewardDistributor.setStakingPool(address(stakingPool));

        // Set ReferralNFT on MLMNetwork for auto-minting on registration
        mlmNetwork.setReferralNFT(address(referralNFT));
    }

    /**
     * @dev Adds operator addresses to each contract for cross-contract calls.
     *
     *      Operator assignments:
     *      - Vault: StakingPool, UnilevelDistributor, BinaryDistributor (withdraw)
     *      - MLMNetwork: StakingPool, BinaryDistributor (updateBinaryVolumes, setUserVolumes)
     *      - FeeManager: StakingPool (setPlanDuration from addPlan)
     *      - UnilevelDistributor: StakingPool (distributeUnilevel)
     *      - BinaryDistributor: StakingPool (updateBinaryVolumes)
     *      - ReferralNFT: MLMNetwork (mint on registration)
     */
    function _addOperators(
        Vault vault,
        MLMNetwork mlmNetwork,
        FeeManager feeManager,
        RewardDistributor, /* rewardDistributor */
        UnilevelDistributor unilevelDistributor,
        BinaryDistributor binaryDistributor,
        StakingPool stakingPool,
        ReferralNFT referralNFT
    ) internal {
        // Vault operators: can withdraw USDT
        vault.addOperator(address(stakingPool));
        vault.addOperator(address(unilevelDistributor));
        vault.addOperator(address(binaryDistributor));

        // MLMNetwork operators: can update/flush binary volumes
        mlmNetwork.addOperator(address(stakingPool));
        mlmNetwork.addOperator(address(binaryDistributor));

        // FeeManager operators: StakingPool calls setPlanDuration in addPlan
        feeManager.addOperator(address(stakingPool));

        // UnilevelDistributor operators: StakingPool calls distributeUnilevel
        unilevelDistributor.addOperator(address(stakingPool));

        // BinaryDistributor operators: StakingPool calls updateBinaryVolumes
        binaryDistributor.addOperator(address(stakingPool));

        // ReferralNFT operators: MLMNetwork calls mint on registration
        referralNFT.addOperator(address(mlmNetwork));
    }

    /**
     * @dev Adds three default staking plans:
     *      Plan 0 (Flex Staking): 12% APY, 30-day lock, 5% early withdrawal penalty, $100-$10,000
     *      Plan 1 (Pro Staking): 18% APY, 90-day lock, 10% early withdrawal penalty, $1,000-$50,000
     *      Plan 2 (Elite Staking): 25% APY, 180-day lock, 15% early withdrawal penalty, $5,000-$200,000
     *
     *      All plans have a minimum stake of 100 USDT.
     *
     *      Note: APY values on RewardDistributor are timelocked and must be
     *      set separately. See _scheduleAPYChanges.
     */
    function _addDefaultPlans(StakingPool stakingPool) internal {
        // Plan 0 (Flex Staking): 12% APY, 30 days, 5% penalty, $100-$10,000
        stakingPool.addPlan(
            PLAN1_DURATION,       // duration: 30 days
            PLAN1_APY_BPS,        // apyBps: 1200 (12%)
            MIN_STAKE,            // minStake: 100 USDT
            PLAN1_MAX,            // maxStake: 10,000 USDT
            PLAN1_PENALTY_BPS     // penaltyBps: 500 (5%)
        );

        // Plan 1 (Pro Staking): 18% APY, 90 days, 10% penalty, $1,000-$50,000
        stakingPool.addPlan(
            PLAN2_DURATION,       // duration: 90 days
            PLAN2_APY_BPS,        // apyBps: 1800 (18%)
            MIN_STAKE,            // minStake: 100 USDT
            PLAN2_MAX,            // maxStake: 50,000 USDT
            PLAN2_PENALTY_BPS     // penaltyBps: 1000 (10%)
        );

        // Plan 2 (Elite Staking): 25% APY, 180 days, 15% penalty, $5,000-$200,000
        stakingPool.addPlan(
            PLAN3_DURATION,       // duration: 180 days
            PLAN3_APY_BPS,        // apyBps: 2500 (25%)
            MIN_STAKE,            // minStake: 100 USDT
            PLAN3_MAX,            // maxStake: 200,000 USDT
            PLAN3_PENALTY_BPS     // penaltyBps: 1500 (15%)
        );
    }

    /**
     * @dev Schedules APY changes on RewardDistributor for each plan.
     *      APY changes are timelocked (2-day delay), so they cannot be
     *      executed during the deployment transaction. The multisig admin
     *      must execute them after the timelock expires.
     *
     *      POST-DEPLOYMENT: After 2 days, the multisig calls:
     *      - rewardDistributor.setAPY(0, 1200)
     *      - rewardDistributor.setAPY(1, 1800)
     *      - rewardDistributor.setAPY(2, 2500)
     */
    function _scheduleAPYChanges(RewardDistributor rewardDistributor) internal {
        rewardDistributor.scheduleSetAPY(0, PLAN1_APY_BPS);
        rewardDistributor.scheduleSetAPY(1, PLAN2_APY_BPS);
        rewardDistributor.scheduleSetAPY(2, PLAN3_APY_BPS);
    }

    /**
     * @dev Proposes admin transfer to the multisig on all deployed contracts.
     *      The multisig must call acceptAdmin() on each contract to complete
     *      the transfer (two-step process for safety).
     *
     *      IMPORTANT: After the multisig accepts admin, it becomes the sole
     *      admin on all contracts. The Deployer loses admin rights.
     */
    function _proposeAdminTransfer(
        address multisig,
        Vault vault,
        MLMNetwork mlmNetwork,
        FeeManager feeManager,
        RewardDistributor rewardDistributor,
        UnilevelDistributor unilevelDistributor,
        BinaryDistributor binaryDistributor,
        StakingPool stakingPool,
        ReferralNFT referralNFT
    ) internal {
        vault.proposeAdmin(multisig);
        mlmNetwork.proposeAdmin(multisig);
        feeManager.proposeAdmin(multisig);
        rewardDistributor.proposeAdmin(multisig);
        unilevelDistributor.proposeAdmin(multisig);
        binaryDistributor.proposeAdmin(multisig);
        stakingPool.proposeAdmin(multisig);
        referralNFT.proposeAdmin(multisig);
    }

    // ============================================================
    //                       View Functions
    // ============================================================

    /**
     * @notice Returns all deployed contract addresses.
     * @return The DeployedContracts struct.
     */
    function getDeployedContracts() external view returns (DeployedContracts memory) {
        return deployed;
    }
}
