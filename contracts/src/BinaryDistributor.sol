// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IBinaryDistributor.sol";
import "./interfaces/IMLMNetwork.sol";
import "./interfaces/IVault.sol";
import "./interfaces/IERC20Extended.sol";
import "./AccessControl.sol";
import "./libraries/CommissionMath.sol";

/**
 * @title BinaryDistributor
 * @notice Calculates and distributes binary bonus based on weak leg volume.
 * @dev In the binary compensation plan, each user has a left and right subtree.
 *      The binary bonus is calculated as a percentage of the weaker leg's volume,
 *      ensuring the bonus never exceeds what the network can sustain. After claiming,
 *      the weak leg volume is flushed (subtracted from both legs) to prevent
 *      double-claiming.
 *
 *      ARCHITECTURE:
 *      - Binary bonus = weakLegVolume × binaryBonusRateBps / 10000
 *      - Default rate: 10% (1000 BPS)
 *      - Maximum bonus per claim cycle is capped (configurable)
 *      - Users must manually claim their binary bonus
 *      - Volume flushing propagates up the tree via MLMNetwork.setUserVolumes
 *
 *      SECURITY:
 *      - Reentrancy guard on claimBinaryBonus
 *      - Bonus cap prevents excessive single-claim payouts
 *      - Volume flush prevents double-claiming the same volume
 *      - Only operators can update volumes
 *      - Rate changes are timelocked (2-day delay)
 *      - Admin-only flush (via external flushVolumes) for emergency reconciliation
 */
contract BinaryDistributor is IBinaryDistributor, AccessControl {
    // ============================================================
    //                        Type Declarations
    // ============================================================

    /**
     * @notice Tracks a user's binary bonus accounting.
     * @param pendingBonus  Accumulated unclaimed binary bonus (for future claim-model changes).
     * @param totalClaimed  Total binary bonus claimed lifetime.
     * @param lastClaimTime Timestamp of the last successful claim.
     * @param cycleCount    Number of successful claim cycles.
     */
    struct BinaryAccount {
        uint256 pendingBonus;
        uint256 totalClaimed;
        uint256 lastClaimTime;
        uint256 cycleCount;
    }

    // ============================================================
    //                        State Variables
    // ============================================================

    /// @notice Reference to the MLM network contract for volume and registration queries
    IMLMNetwork public mlmNetwork;

    /// @notice Reference to the vault contract for USDT withdrawals
    IVault public vault;

    /// @notice USDT token address
    address public usdt;

    /// @notice Binary bonus rate in basis points (e.g., 1000 = 10% of weak leg)
    uint256 public binaryBonusRateBps;

    /// @notice Default binary bonus rate (10%)
    uint256 public constant DEFAULT_BINARY_RATE = 1000;

    /// @notice Maximum binary bonus that can be claimed in a single cycle
    uint256 public maxBonusPerCycle;

    /// @notice Binary accounting data per user
    mapping(address => BinaryAccount) public binaryAccounts;

    // ── Reentrancy Guard ──

    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    // ============================================================
    //                          Events
    // ============================================================

    /**
     * @notice Emitted when the binary bonus rate is changed.
     * @param oldRate The previous rate in basis points.
     * @param newRate The new rate in basis points.
     */
    event BinaryBonusRateChanged(uint256 oldRate, uint256 newRate);

    /**
     * @notice Emitted when the max bonus per cycle is changed.
     * @param oldMax The previous maximum bonus per cycle.
     * @param newMax The new maximum bonus per cycle.
     */
    event MaxBonusPerCycleChanged(uint256 oldMax, uint256 newMax);

    // ============================================================
    //                          Modifiers
    // ============================================================

    modifier nonReentrant() {
        require(_status != _ENTERED, "BinaryDistributor: reentrancy");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    // ============================================================
    //                        Constructor
    // ============================================================

    /**
     * @notice Initializes the BinaryDistributor with required contract references.
     * @param _mlmNetwork Address of the MLM network contract.
     * @param _vault      Address of the Vault contract.
     * @param _usdt       Address of the USDT (BEP-20) token contract.
     */
    constructor(address _mlmNetwork, address _vault, address _usdt) {
        require(_mlmNetwork != address(0), "BinaryDistributor: zero mlmNetwork");
        require(_vault != address(0), "BinaryDistributor: zero vault");
        require(_usdt != address(0), "BinaryDistributor: zero usdt");

        mlmNetwork = IMLMNetwork(_mlmNetwork);
        vault = IVault(_vault);
        usdt = _usdt;

        _status = _NOT_ENTERED;

        binaryBonusRateBps = DEFAULT_BINARY_RATE;
        // Default max bonus per cycle: 100,000 USDT (with 18 decimals = 100_000 * 10^18)
        maxBonusPerCycle = 100_000 * 10 ** 18;
    }

    // ============================================================
    //                    State-Changing Functions
    // ============================================================

    /**
     * @notice Updates binary volumes when a user stakes.
     * @dev Called by the StakingPool (operator) when someone stakes. Delegates
     *      to MLMNetwork.updateBinaryVolumes which propagates the volume up the tree.
     *      Emits BinaryVolumesUpdated with the user's new cumulative volumes.
     *
     * @param user   The address of the user whose stake triggered the update.
     * @param amount The stake amount to add to the binary tree volumes.
     */
    function updateBinaryVolumes(address user, uint256 amount) external onlyOperator whenNotPaused {
        require(mlmNetwork.isRegistered(user), "BinaryDistributor: user not registered");
        require(amount > 0, "BinaryDistributor: zero amount");

        // Delegate volume update to the MLM network (propagates up the tree)
        mlmNetwork.updateBinaryVolumes(user, amount);

        // Read back updated volumes for the event
        uint256 leftVol = mlmNetwork.getLeftVolume(user);
        uint256 rightVol = mlmNetwork.getRightVolume(user);

        emit BinaryVolumesUpdated(user, amount, leftVol, rightVol);
    }

    /**
     * @notice Claims the accumulated binary bonus for the caller.
     * @dev Calculates the bonus based on the weak leg volume, applies the bonus
     *      rate and cycle cap, flushes the volumes (reduces both legs by the weak
     *      leg amount), and transfers USDT from the vault.
     *
     *      The flush ensures that the same volume cannot be claimed twice.
     *      The volume reduction is propagated up the tree via MLMNetwork.setUserVolumes.
     *
     *      Returns 0 if:
     *      - The weak leg volume is zero (no balance between legs)
     *      - The calculated bonus rounds to zero
     *
     * @return The amount of binary bonus claimed.
     */
    function claimBinaryBonus() external whenNotPaused nonReentrant returns (uint256) {
        address user = msg.sender;
        require(mlmNetwork.isRegistered(user), "BinaryDistributor: not registered");

        uint256 leftVol = mlmNetwork.getLeftVolume(user);
        uint256 rightVol = mlmNetwork.getRightVolume(user);
        uint256 weakLeg = CommissionMath.getWeakLegVolume(leftVol, rightVol);

        // No bonus if no weak leg volume (legs are unbalanced)
        if (weakLeg == 0) return 0;

        uint256 bonus = CommissionMath.calculateBinaryBonus(weakLeg, binaryBonusRateBps);

        // Cap bonus per cycle
        if (bonus > maxBonusPerCycle) {
            bonus = maxBonusPerCycle;
        }

        // No bonus if calculation rounds to zero
        if (bonus == 0) return 0;

        // Flush volumes: subtract weak leg from both sides
        (uint256 newLeft, uint256 newRight) = CommissionMath.flushVolumes(leftVol, rightVol);

        // Update volumes in the MLM network (propagates reduction up the tree)
        mlmNetwork.setUserVolumes(user, newLeft, newRight);

        // Update accounting
        binaryAccounts[user].pendingBonus += bonus;
        binaryAccounts[user].totalClaimed += bonus;
        binaryAccounts[user].lastClaimTime = block.timestamp;
        binaryAccounts[user].cycleCount++;

        // Transfer USDT from vault to user
        vault.withdraw(usdt, user, bonus);

        emit BinaryBonusClaimed(user, bonus);
        emit VolumesFlushed(user, leftVol, rightVol);

        return bonus;
    }

    /**
     * @notice Sets the binary bonus rate (timelocked).
     * @dev Must be scheduled via `scheduleBinaryBonusRateChange` first. After the
     *      2-day timelock expires, this function executes the rate change.
     *
     *      Access control: admin only.
     *
     * @param rate The new binary bonus rate in basis points (e.g., 1000 = 10%).
     */
    function setBinaryBonusRate(uint256 rate) external onlyAdmin {
        require(rate <= 10_000, "BinaryDistributor: rate exceeds 100%");

        // Verify timelock
        bytes32 actionHash = keccak256(abi.encodePacked("setBinaryBonusRate", rate));
        executeAction(actionHash);

        uint256 oldRate = binaryBonusRateBps;
        binaryBonusRateBps = rate;

        emit BinaryBonusRateChanged(oldRate, rate);
    }

    /**
     * @notice Schedules a binary bonus rate change via the timelock mechanism.
     * @dev Must be called by admin before `setBinaryBonusRate` can be executed.
     *      After scheduling, there is a 2-day delay before execution is allowed.
     * @param rate The new binary bonus rate in basis points.
     */
    function scheduleBinaryBonusRateChange(uint256 rate) external onlyAdmin {
        bytes32 actionHash = keccak256(abi.encodePacked("setBinaryBonusRate", rate));
        scheduleAction(actionHash);
    }

    /**
     * @notice Flushes both leg volumes for a user to zero (after subtracting weak leg).
     * @dev Access control: restricted to operators or protocol admin.
     *      Typically called for emergency volume reconciliation or by the claim
     *      function internally. Use with caution — flushing without claiming
     *      will forfeit the accrued bonus for that volume.
     *
     * @param user The address whose volumes should be flushed.
     */
    function flushVolumes(address user) external onlyOperator {
        require(mlmNetwork.isRegistered(user), "BinaryDistributor: user not registered");

        uint256 leftVol = mlmNetwork.getLeftVolume(user);
        uint256 rightVol = mlmNetwork.getRightVolume(user);

        if (leftVol == 0 && rightVol == 0) return;

        (uint256 newLeft, uint256 newRight) = CommissionMath.flushVolumes(leftVol, rightVol);

        // Update volumes in the MLM network
        mlmNetwork.setUserVolumes(user, newLeft, newRight);

        emit VolumesFlushed(user, leftVol, rightVol);
    }

    /**
     * @notice Sets the maximum bonus per claim cycle (timelocked).
     * @dev Must be scheduled via `scheduleMaxBonusPerCycleChange` first.
     *      After the 2-day timelock expires, this function executes the change.
     *
     *      Access control: admin only.
     *
     * @param max The new maximum bonus per cycle in token units.
     */
    function setMaxBonusPerCycle(uint256 max) external onlyAdmin {
        // Verify timelock
        bytes32 actionHash = keccak256(abi.encodePacked("setMaxBonusPerCycle", max));
        executeAction(actionHash);

        uint256 oldMax = maxBonusPerCycle;
        maxBonusPerCycle = max;

        emit MaxBonusPerCycleChanged(oldMax, max);
    }

    /**
     * @notice Schedules a max bonus per cycle change via the timelock mechanism.
     * @dev Must be called by admin before `setMaxBonusPerCycle` can be executed.
     * @param max The new maximum bonus per cycle.
     */
    function scheduleMaxBonusPerCycleChange(uint256 max) external onlyAdmin {
        bytes32 actionHash = keccak256(abi.encodePacked("setMaxBonusPerCycle", max));
        scheduleAction(actionHash);
    }

    // ============================================================
    //                       View Functions
    // ============================================================

    /**
     * @notice Calculates the binary bonus available for a user without modifying state.
     * @dev The bonus equals weakLegVolume × binaryBonusRateBps / 10_000, capped
     *      by maxBonusPerCycle. This is a view function — no state changes.
     * @param user The address to query.
     * @return The pending binary bonus amount in token units.
     */
    function calculateBinaryBonus(address user) external view returns (uint256) {
        uint256 leftVol = mlmNetwork.getLeftVolume(user);
        uint256 rightVol = mlmNetwork.getRightVolume(user);
        uint256 weakLeg = CommissionMath.getWeakLegVolume(leftVol, rightVol);

        if (weakLeg == 0) return 0;

        uint256 bonus = CommissionMath.calculateBinaryBonus(weakLeg, binaryBonusRateBps);

        if (bonus > maxBonusPerCycle) {
            bonus = maxBonusPerCycle;
        }

        return bonus;
    }

    /**
     * @notice Returns the weak leg volume for a user.
     * @dev The weak leg is the binary tree leg with the smaller volume.
     * @param user The address to query.
     * @return The weak leg volume in token units.
     */
    function getWeakLegVolume(address user) external view returns (uint256) {
        uint256 leftVol = mlmNetwork.getLeftVolume(user);
        uint256 rightVol = mlmNetwork.getRightVolume(user);
        return CommissionMath.getWeakLegVolume(leftVol, rightVol);
    }

    /**
     * @notice Returns the strong leg volume for a user.
     * @dev The strong leg is the binary tree leg with the larger volume.
     * @param user The address to query.
     * @return The strong leg volume in token units.
     */
    function getStrongLegVolume(address user) external view returns (uint256) {
        uint256 leftVol = mlmNetwork.getLeftVolume(user);
        uint256 rightVol = mlmNetwork.getRightVolume(user);
        return leftVol >= rightVol ? leftVol : rightVol;
    }

    /**
     * @notice Returns the binary account data for a user.
     * @dev Convenience function to read all accounting fields at once.
     * @param user The address to query.
     * @return pendingBonus  Accumulated unclaimed bonus.
     * @return totalClaimed  Total lifetime claimed.
     * @return lastClaimTime Timestamp of last claim.
     * @return cycleCount    Number of claim cycles.
     */
    function getBinaryAccount(
        address user
    ) external view returns (uint256 pendingBonus, uint256 totalClaimed, uint256 lastClaimTime, uint256 cycleCount) {
        BinaryAccount memory account = binaryAccounts[user];
        return (account.pendingBonus, account.totalClaimed, account.lastClaimTime, account.cycleCount);
    }
}
