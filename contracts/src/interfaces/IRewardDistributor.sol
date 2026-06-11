// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRewardDistributor
 * @notice Interface for the staking reward distribution contract.
 * @dev Manages reward accrual and distribution for all staking plans.
 *      Rewards are calculated based on each plan's APY and the stake duration.
 *
 *      Access control:
 *      - `updateReward` and `massUpdateRewards` are restricted to authorized contracts
 *        (staking pool).
 *      - `setAPY` is restricted to protocol admin / governance.
 */
interface IRewardDistributor {
    // ============================================================
    //                      State-Changing Functions
    // ============================================================

    /**
     * @notice Updates the reward state for a specific user stake.
     * @dev Called by the staking pool before any state-changing operation
     *      (deposit, withdraw, claim) to ensure rewards are accrued up to the
     *      current timestamp.
     *      Access control: restricted to the staking pool contract.
     * @param user    The address of the staker.
     * @param stakeId The index of the stake to update.
     */
    function updateReward(address user, uint256 stakeId) external;

    /**
     * @notice Updates the reward state for all active stakes across all users.
     * @dev Iterates through all active stakes and accrues pending rewards.
     *      Use with caution — may consume significant gas for large numbers of stakers.
     *      Access control: restricted to the staking pool contract or admin.
     */
    function massUpdateRewards() external;

    /**
     * @notice Registers a new stake for reward tracking.
     * @dev Called by the StakingPool when a user deposits. Sets the initial
     *      lastRewardTime to block.timestamp so rewards begin accruing immediately.
     *      Access control: restricted to the staking pool contract.
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
    ) external;

    /**
     * @notice Claims accumulated rewards for a specific stake.
     * @dev Accrues pending rewards, returns the total accumulated amount, and resets
     *      the accumulated rewards to zero. Called by the StakingPool during
     *      claimRewards or withdraw operations.
     *      Access control: restricted to the staking pool contract.
     * @param user    The address of the staker.
     * @param stakeId The index of the stake.
     * @return The total reward amount being claimed.
     */
    function claimReward(address user, uint256 stakeId) external returns (uint256);

    /**
     * @notice Sets a new APY for the specified staking plan.
     * @dev Access control: restricted to protocol admin / governance.
     *      The new APY applies to future reward calculations only; previously accrued
     *      rewards are not affected. APY is expressed in basis points (e.g., 1200 = 12%).
     * @param planId The staking plan identifier.
     * @param newAPY The new annual percentage yield in basis points.
     */
    function setAPY(uint8 planId, uint256 newAPY) external;

    // ============================================================
    //                       View Functions
    // ============================================================

    /**
     * @notice Returns the pending (unclaimed) reward amount for a specific stake.
     * @dev Calculates rewards from the last update timestamp to the current block timestamp
     *      using the plan's APY. Does not modify state.
     * @param user    The address of the staker.
     * @param stakeId The index of the stake to query.
     * @return The pending reward amount in token units.
     */
    function pendingRewards(address user, uint256 stakeId) external view returns (uint256);

    /**
     * @notice Returns the total pending rewards across all active stakes for a user.
     * @dev Sums the pending rewards for every active stake belonging to the user.
     *      May consume significant gas for users with many stakes.
     * @param user The address of the staker.
     * @return The total pending reward amount in token units.
     */
    function totalPendingRewards(address user) external view returns (uint256);

    // ============================================================
    //                          Events
    // ============================================================

    /**
     * @notice Emitted when rewards are updated (accrued) for a stake.
     * @param user    The address of the staker.
     * @param stakeId The index of the stake.
     * @param reward  The newly accrued reward amount since the last update.
     */
    event RewardsUpdated(address indexed user, uint256 indexed stakeId, uint256 reward);

    /**
     * @notice Emitted when the APY for a staking plan is changed.
     * @param planId The staking plan identifier.
     * @param oldAPY The previous APY in basis points.
     * @param newAPY The new APY in basis points.
     */
    event APYChanged(uint8 indexed planId, uint256 oldAPY, uint256 newAPY);
}
