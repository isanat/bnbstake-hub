// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IUnilevelDistributor
 * @notice Interface for the unilevel commission distribution contract.
 * @dev Distributes referral commissions through the unilevel (single-leg) lineage.
 *      Each level has a configurable commission rate expressed in basis points.
 *      Commissions flow upward through the referrer chain up to the configured max depth.
 *
 *      Access control:
 *      - `distributeUnilevel` is restricted to the staking pool contract.
 *      - `setLevelRate` is restricted to protocol admin / governance.
 */
interface IUnilevelDistributor {
    // ============================================================
    //                      State-Changing Functions
    // ============================================================

    /**
     * @notice Distributes unilevel commissions for a user's staking activity.
     * @dev Traverses the referrer chain from `user` upward, distributing commission
     *      at each level according to the configured level rates. Stops when:
     *      - The root of the referrer tree is reached, or
     *      - The maximum unilevel depth is exceeded, or
     *      - The remaining amount rounds to zero.
     *      Access control: restricted to the staking pool contract.
     * @param user   The address of the staker whose activity triggers the distribution.
     * @param amount The base amount to distribute commissions on (typically the stake amount).
     * @return totalDistributed The total commission amount distributed across all levels.
     */
    function distributeUnilevel(address user, uint256 amount) external returns (uint256 totalDistributed);

    /**
     * @notice Sets the commission rate for a specific unilevel level.
     * @dev Access control: restricted to protocol admin / governance.
     *      The rate is expressed in basis points (e.g., 500 = 5%).
     *      Setting a level's rate to 0 effectively disables that level.
     * @param level The unilevel level (0 = first referrer, 1 = second, etc.).
     * @param rate  The commission rate in basis points.
     */
    function setLevelRate(uint256 level, uint256 rate) external;

    // ============================================================
    //                       View Functions
    // ============================================================

    /**
     * @notice Returns the total unilevel earnings accumulated by a user across all levels.
     * @param user The address to query.
     * @return The total unilevel commission earned in token units.
     */
    function getUnilevelEarnings(address user) external view returns (uint256);

    /**
     * @notice Returns the unilevel earnings accumulated by a user at a specific level.
     * @dev Useful for analytics and reporting per-level commission breakdowns.
     * @param user  The address to query.
     * @param level The unilevel level to query.
     * @return The commission earned at the specified level in token units.
     */
    function getUnilevelEarningsByLevel(address user, uint256 level) external view returns (uint256);

    /**
     * @notice Returns the commission rate for a specific unilevel level.
     * @param level The unilevel level to query.
     * @return The commission rate in basis points (0 if the level is not configured).
     */
    function getLevelRate(uint256 level) external view returns (uint256);

    // ============================================================
    //                          Events
    // ============================================================

    /**
     * @notice Emitted when unilevel commissions are distributed for a user's activity.
     * @param user              The address of the staker that triggered the distribution.
     * @param amount            The base amount the commissions were calculated on.
     * @param totalDistributed  The total commission amount distributed across all levels.
     */
    event UnilevelDistributed(address indexed user, uint256 amount, uint256 totalDistributed);

    /**
     * @notice Emitted when the commission rate for a unilevel level is changed.
     * @param level  The unilevel level that was modified.
     * @param oldRate The previous commission rate in basis points.
     * @param newRate The new commission rate in basis points.
     */
    event LevelRateChanged(uint256 indexed level, uint256 oldRate, uint256 newRate);
}
