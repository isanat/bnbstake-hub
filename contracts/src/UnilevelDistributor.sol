// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IUnilevelDistributor.sol";
import "./interfaces/IMLMNetwork.sol";
import "./interfaces/IVault.sol";
import "./interfaces/IERC20Extended.sol";
import "./AccessControl.sol";
import "./libraries/CommissionMath.sol";

/**
 * @title UnilevelDistributor
 * @notice Distributes unilevel referral commissions up the referral chain.
 * @dev When a user stakes, the StakingPool calls `distributeUnilevel`, which walks
 *      up the referrer chain and pays a configurable commission at each level.
 *      Commission rates are expressed in basis points (BPS), and each level can be
 *      independently enabled or disabled.
 *
 *      ARCHITECTURE:
 *      - Level 1 = direct referrer, Level 2 = referrer's referrer, etc.
 *      - Maximum 10 levels (MAX_LEVELS)
 *      - Default rates: 10%, 5%, 3%, 2%, 1%, 0×5
 *      - Total default payout = 21% of stake amount
 *
 *      SECURITY:
 *      - Reentrancy guard on distributeUnilevel
 *      - Only operators (StakingPool) can distribute
 *      - Total distributed cannot exceed amount × sum of all active rates
 *      - Rate changes are timelocked (2-day delay)
 *      - Total rate validation: cannot exceed 100% across all levels
 */
contract UnilevelDistributor is IUnilevelDistributor, AccessControl {
    // ============================================================
    //                        Type Declarations
    // ============================================================

    /**
     * @notice Configuration for a single unilevel level.
     * @param rateBps  Commission rate in basis points (e.g., 1000 = 10%).
     * @param active   Whether this level is eligible for commission distribution.
     */
    struct LevelConfig {
        uint256 rateBps;
        bool active;
    }

    // ============================================================
    //                        State Variables
    // ============================================================

    /// @notice Reference to the MLM network contract for referrer lookups
    IMLMNetwork public mlmNetwork;

    /// @notice Reference to the vault contract for USDT withdrawals
    IVault public vault;

    /// @notice USDT token address
    address public usdt;

    /// @notice Maximum number of unilevel levels
    uint256 public constant MAX_LEVELS = 10;

    /// @notice Commission configuration per level (1-indexed: level 1 to MAX_LEVELS)
    mapping(uint256 => LevelConfig) public levelConfigs;

    /// @notice Total unilevel earnings per user (across all levels)
    mapping(address => uint256) public totalUnilevelEarnings;

    /// @notice Earnings per user per level
    mapping(address => mapping(uint256 => uint256)) public earningsByLevel;

    // ── Reentrancy Guard ──

    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    // ============================================================
    //                          Events
    // ============================================================

    /**
     * @notice Emitted when a unilevel commission is paid at a specific level.
     * @param upline    The address receiving the commission.
     * @param staker    The address whose stake triggered the commission.
     * @param amount    The base amount the commission was calculated on.
     * @param commission The commission amount paid.
     * @param level     The unilevel level at which this commission was paid.
     */
    event UnilevelCommissionPaid(
        address indexed upline,
        address indexed staker,
        uint256 amount,
        uint256 commission,
        uint256 level
    );

    // ============================================================
    //                          Modifiers
    // ============================================================

    modifier nonReentrant() {
        require(_status != _ENTERED, "UnilevelDistributor: reentrancy");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    // ============================================================
    //                        Constructor
    // ============================================================

    /**
     * @notice Initializes the UnilevelDistributor with required contract references.
     * @param _mlmNetwork Address of the MLM network contract.
     * @param _vault      Address of the Vault contract.
     * @param _usdt       Address of the USDT (ERC-20) token contract.
     */
    constructor(address _mlmNetwork, address _vault, address _usdt) {
        require(_mlmNetwork != address(0), "UnilevelDistributor: zero mlmNetwork");
        require(_vault != address(0), "UnilevelDistributor: zero vault");
        require(_usdt != address(0), "UnilevelDistributor: zero usdt");

        mlmNetwork = IMLMNetwork(_mlmNetwork);
        vault = IVault(_vault);
        usdt = _usdt;

        _status = _NOT_ENTERED;

        // Initialize default level rates
        _initializeLevels();
    }

    // ============================================================
    //                    State-Changing Functions
    // ============================================================

    /**
     * @notice Distributes unilevel commissions for a user's staking activity.
     * @dev Walks up the referral chain from the user, distributing commission at
     *      each level according to the configured level rates. Stops when:
     *      - The root of the referrer tree is reached (address(0))
     *      - The maximum unilevel depth (10) is exceeded
     *      - A level is inactive or has zero rate
     *
     *      Only authorized operators (StakingPool) can call this function.
     *      Commission is transferred from the Vault to each eligible upline.
     *
     * @param user   The address of the staker whose activity triggers distribution.
     * @param amount The base amount to calculate commissions on (stake amount).
     * @return totalDistributed The total commission amount distributed across all levels.
     */
    function distributeUnilevel(
        address user,
        uint256 amount
    ) external onlyOperator nonReentrant whenNotPaused returns (uint256 totalDistributed) {
        require(user != address(0), "UnilevelDistributor: zero user address");
        require(amount > 0, "UnilevelDistributor: zero amount");

        // Safety cap: total distribution cannot exceed the stake amount
        // (sum of all active rates must be <= 100%, enforced by setLevelRate)
        uint256 maxDistribution = amount;

        address currentUser = mlmNetwork.getReferrer(user);
        uint256 level = 1;

        while (currentUser != address(0) && level <= MAX_LEVELS) {
            LevelConfig memory config = levelConfigs[level];

            if (config.active && config.rateBps > 0) {
                uint256 commission = CommissionMath.calculateUnilevelCommission(amount, config.rateBps);

                if (commission > 0 && totalDistributed + commission <= maxDistribution) {
                    totalUnilevelEarnings[currentUser] += commission;
                    earningsByLevel[currentUser][level] += commission;

                    // Transfer USDT from Vault to upline
                    vault.withdraw(usdt, currentUser, commission);

                    totalDistributed += commission;

                    emit UnilevelCommissionPaid(currentUser, user, amount, commission, level);
                }
            }

            // Walk up the referral chain
            currentUser = mlmNetwork.getReferrer(currentUser);
            level++;
        }

        emit UnilevelDistributed(user, amount, totalDistributed);
    }

    /**
     * @notice Sets the commission rate for a specific unilevel level (timelocked).
     * @dev Must be scheduled via `scheduleLevelRateChange` first. After the 2-day
     *      timelock expires, this function executes the rate change.
     *      Validates that the total rate across all levels does not exceed 100%.
     *
     *      Access control: admin only.
     *
     * @param level The unilevel level (1 to MAX_LEVELS).
     * @param rate  The new commission rate in basis points (0 to disable).
     */
    function setLevelRate(uint256 level, uint256 rate) external onlyAdmin {
        require(level >= 1 && level <= MAX_LEVELS, "UnilevelDistributor: invalid level");
        require(rate <= 10_000, "UnilevelDistributor: rate exceeds 100%");

        // Verify timelock
        bytes32 actionHash = keccak256(abi.encodePacked("setLevelRate", level, rate));
        executeAction(actionHash);

        // Validate total rate does not exceed 100%
        uint256 totalRate = rate;
        for (uint256 i = 1; i <= MAX_LEVELS; i++) {
            if (i != level) {
                totalRate += levelConfigs[i].rateBps;
            }
        }
        require(totalRate <= 10_000, "UnilevelDistributor: total rate exceeds 100%");

        // Apply the rate change
        uint256 oldRate = levelConfigs[level].rateBps;
        levelConfigs[level].rateBps = rate;
        levelConfigs[level].active = rate > 0;

        emit LevelRateChanged(level, oldRate, rate);
    }

    /**
     * @notice Schedules a level rate change via the timelock mechanism.
     * @dev Must be called by admin before `setLevelRate` can be executed.
     *      After scheduling, there is a 2-day delay before execution is allowed.
     * @param level The unilevel level to change.
     * @param rate  The new commission rate in basis points.
     */
    function scheduleLevelRateChange(uint256 level, uint256 rate) external onlyAdmin {
        require(level >= 1 && level <= MAX_LEVELS, "UnilevelDistributor: invalid level");
        bytes32 actionHash = keccak256(abi.encodePacked("setLevelRate", level, rate));
        scheduleAction(actionHash);
    }

    // ============================================================
    //                       View Functions
    // ============================================================

    /**
     * @notice Returns the total unilevel earnings accumulated by a user across all levels.
     * @param user The address to query.
     * @return The total unilevel commission earned in token units.
     */
    function getUnilevelEarnings(address user) external view returns (uint256) {
        return totalUnilevelEarnings[user];
    }

    /**
     * @notice Returns the unilevel earnings accumulated by a user at a specific level.
     * @param user  The address to query.
     * @param level The unilevel level to query.
     * @return The commission earned at the specified level in token units.
     */
    function getUnilevelEarningsByLevel(address user, uint256 level) external view returns (uint256) {
        return earningsByLevel[user][level];
    }

    /**
     * @notice Returns the commission rate for a specific unilevel level.
     * @param level The unilevel level to query.
     * @return The commission rate in basis points (0 if not configured or inactive).
     */
    function getLevelRate(uint256 level) external view returns (uint256) {
        if (level >= 1 && level <= MAX_LEVELS && levelConfigs[level].active) {
            return levelConfigs[level].rateBps;
        }
        return 0;
    }

    // ============================================================
    //                     Internal Helpers
    // ============================================================

    /**
     * @dev Initializes default unilevel commission rates.
     *      Level 1: 10% (1000 bps) — direct referrer
     *      Level 2: 5%  (500 bps)  — second-level upline
     *      Level 3: 3%  (300 bps)  — third-level upline
     *      Level 4: 2%  (200 bps)  — fourth-level upline
     *      Level 5: 1%  (100 bps)  — fifth-level upline
     *      Levels 6-10: 0% (inactive)
     *
     *      Total default payout: 21% of stake amount.
     */
    function _initializeLevels() internal {
        levelConfigs[1] = LevelConfig({rateBps: 1000, active: true});  // 10%
        levelConfigs[2] = LevelConfig({rateBps: 500, active: true});   // 5%
        levelConfigs[3] = LevelConfig({rateBps: 300, active: true});   // 3%
        levelConfigs[4] = LevelConfig({rateBps: 200, active: true});   // 2%
        levelConfigs[5] = LevelConfig({rateBps: 100, active: true});   // 1%

        // Levels 6-10 are inactive by default (rateBps=0, active=false)
        for (uint256 i = 6; i <= MAX_LEVELS; i++) {
            levelConfigs[i] = LevelConfig({rateBps: 0, active: false});
        }
    }
}
