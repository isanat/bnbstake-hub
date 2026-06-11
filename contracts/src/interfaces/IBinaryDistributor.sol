// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IBinaryDistributor
 * @notice Interface for the binary bonus distribution contract.
 * @dev Calculates and distributes binary bonuses based on the weaker leg volume
 *      in each user's binary tree. The bonus is a percentage of the weak leg volume,
 *      and volumes are flushed (reset) after each claim to prevent double-counting.
 *
 *      Access control:
 *      - `updateBinaryVolumes` is restricted to the staking pool or MLM network contract.
 *      - `claimBinaryBonus` is publicly callable by registered users.
 *      - `setBinaryBonusRate` is restricted to protocol admin / governance.
 *      - `flushVolumes` is restricted to authorized contracts or admin.
 */
interface IBinaryDistributor {
    // ============================================================
    //                      State-Changing Functions
    // ============================================================

    /**
     * @notice Updates the binary volumes for a user when they or their downline stake.
     * @dev Propagates the volume up the binary tree from the user to the root,
     *      updating left/right leg volumes at each ancestor.
     *      Access control: restricted to the staking pool or MLM network contract.
     * @param user   The address of the user whose staking triggered the update.
     * @param amount The stake amount to add to the volume.
     */
    function updateBinaryVolumes(address user, uint256 amount) external;

    /**
     * @notice Claims the accumulated binary bonus for the caller.
     * @dev The bonus is calculated as `binaryBonusRate * weakLegVolume`.
     *      After claiming, both leg volumes are flushed (reset) to prevent
     *      double-claiming. The claimed amount is transferred from the vault.
     *      Reverts if the caller is not a registered user or if no bonus is available.
     * @return The amount of binary bonus claimed.
     */
    function claimBinaryBonus() external returns (uint256);

    /**
     * @notice Sets the binary bonus rate.
     * @dev Access control: restricted to protocol admin / governance.
     *      The rate is expressed in basis points (e.g., 1000 = 10% of weak leg volume).
     * @param rate The new binary bonus rate in basis points.
     */
    function setBinaryBonusRate(uint256 rate) external;

    /**
     * @notice Flushes (resets) both leg volumes for a user to zero.
     * @dev Access control: restricted to authorized contracts or protocol admin.
     *      Typically called after a binary bonus claim or during volume reconciliation.
     *      Use with caution — flushing without claiming will forfeit the accrued bonus.
     * @param user The address whose volumes should be flushed.
     */
    function flushVolumes(address user) external;

    // ============================================================
    //                       View Functions
    // ============================================================

    /**
     * @notice Calculates the binary bonus available for a user without modifying state.
     * @dev The bonus equals `binaryBonusRate * weakLegVolume / 10_000`.
     * @param user The address to query.
     * @return The pending binary bonus amount in token units.
     */
    function calculateBinaryBonus(address user) external view returns (uint256);

    /**
     * @notice Returns the weak leg volume for a user.
     * @dev The weak leg is the binary tree leg (left or right) with the smaller volume.
     * @param user The address to query.
     * @return The weak leg volume in token units.
     */
    function getWeakLegVolume(address user) external view returns (uint256);

    /**
     * @notice Returns the strong leg volume for a user.
     * @dev The strong leg is the binary tree leg (left or right) with the larger volume.
     * @param user The address to query.
     * @return The strong leg volume in token units.
     */
    function getStrongLegVolume(address user) external view returns (uint256);

    // ============================================================
    //                          Events
    // ============================================================

    /**
     * @notice Emitted when a user claims their binary bonus.
     * @param user   The address of the claimer.
     * @param amount The amount of binary bonus claimed.
     */
    event BinaryBonusClaimed(address indexed user, uint256 amount);

    /**
     * @notice Emitted when binary volumes are updated for a user.
     * @param user        The address whose volumes were updated.
     * @param amount      The volume amount added.
     * @param leftVolume  The new cumulative left-leg volume after update.
     * @param rightVolume The new cumulative right-leg volume after update.
     */
    event BinaryVolumesUpdated(
        address indexed user,
        uint256 amount,
        uint256 leftVolume,
        uint256 rightVolume
    );

    /**
     * @notice Emitted when both leg volumes are flushed for a user.
     * @param user              The address whose volumes were flushed.
     * @param flushedLeftVolume The left-leg volume before flushing.
     * @param flushedRightVolume The right-leg volume before flushing.
     */
    event VolumesFlushed(
        address indexed user,
        uint256 flushedLeftVolume,
        uint256 flushedRightVolume
    );
}
