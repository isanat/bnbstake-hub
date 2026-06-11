// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IStakingPool
 * @notice Interface for the main staking pool contract on Polygon.
 * @dev Handles user deposits, withdrawals, and reward claims across multiple staking plans.
 *      All state-modifying functions require the caller to be a registered user.
 *      Access control is enforced at the implementation level.
 */
interface IStakingPool {
    // ============================================================
    //                        Data Structures
    // ============================================================

    /**
     * @notice Represents a single staking position.
     * @param amount       The principal amount of tokens staked.
     * @param startTime    The UNIX timestamp when the stake was created.
     * @param endTime      The UNIX timestamp when the stake matures (0 for flexible plans).
     * @param planId       The identifier of the staking plan.
     * @param claimed      The cumulative amount of rewards already claimed.
     * @param active       Whether the stake is currently active.
     */
    struct StakeInfo {
        uint256 amount;
        uint256 startTime;
        uint256 endTime;
        uint8 planId;
        uint256 claimed;
        bool active;
    }

    /**
     * @notice Represents a staking plan configuration.
     * @param duration      The lock duration in seconds (0 for flexible/no-lock plans).
     * @param apy           The annual percentage yield in basis points (e.g., 1200 = 12%).
     * @param minStake      The minimum stake amount for this plan.
     * @param maxStake      The maximum stake amount for this plan (0 = no limit).
     * @param earlyWithdrawPenalty Early withdrawal penalty rate in basis points.
     * @param active        Whether the plan is currently accepting new deposits.
     */
    struct PlanInfo {
        uint256 duration;
        uint256 apy;
        uint256 minStake;
        uint256 maxStake;
        uint256 earlyWithdrawPenalty;
        bool active;
    }

    // ============================================================
    //                      State-Changing Functions
    // ============================================================

    /**
     * @notice Deposits tokens into a specified staking plan.
     * @dev The caller must have pre-approved the staking pool to transfer `amount` tokens.
     *      Reverts if `planId` is inactive, if `amount` is outside plan limits,
     *      or if the caller is not a registered user.
     * @param amount The number of tokens to stake.
     * @param planId The staking plan identifier.
     */
    function deposit(uint256 amount, uint8 planId) external;

    /**
     * @notice Withdraws a specific stake and returns the principal.
     * @dev Early withdrawals before the plan's lock period expires incur a penalty.
     *      Rewards must be claimed separately via {claimRewards} before withdrawing,
     *      or they will be forfeited. The stake is marked as inactive after withdrawal.
     * @param stakeId The index of the stake in the caller's stake array.
     */
    function withdraw(uint256 stakeId) external;

    /**
     * @notice Claims accumulated rewards for a specific stake.
     * @dev Rewards are calculated based on elapsed time and the plan's APY.
     *      The claimed amount is transferred to the caller's wallet.
     * @param stakeId The index of the stake in the caller's stake array.
     */
    function claimRewards(uint256 stakeId) external;

    /**
     * @notice Claims accumulated rewards for all active stakes of the caller.
     * @dev Iterates over all of the caller's stakes and claims pending rewards.
     *      May consume significant gas if the caller has many active stakes.
     */
    function claimAllRewards() external;

    // ============================================================
    //                       View Functions
    // ============================================================

    /**
     * @notice Returns the details of a specific stake for a given user.
     * @param user    The address of the staker.
     * @param stakeId The index of the stake in the user's stake array.
     * @return The stake information struct.
     */
    function getStakeInfo(address user, uint256 stakeId) external view returns (StakeInfo memory);

    /**
     * @notice Returns the total number of stakes (both active and inactive) for a user.
     * @param user The address to query.
     * @return The number of stakes.
     */
    function getStakeCount(address user) external view returns (uint256);

    /**
     * @notice Returns the configuration details of a staking plan.
     * @param planId The staking plan identifier.
     * @return The plan information struct.
     */
    function getPlanInfo(uint8 planId) external view returns (PlanInfo memory);

    // ============================================================
    //                          Events
    // ============================================================

    /**
     * @notice Emitted when a user deposits tokens into a staking plan.
     * @param user    The address of the staker.
     * @param amount  The amount of tokens staked.
     * @param planId  The staking plan identifier.
     * @param stakeId The index of the newly created stake.
     */
    event Deposited(address indexed user, uint256 amount, uint8 indexed planId, uint256 stakeId);

    /**
     * @notice Emitted when a user withdraws a stake.
     * @param user    The address of the staker.
     * @param amount  The principal amount withdrawn (after penalty if applicable).
     * @param stakeId The index of the withdrawn stake.
     */
    event Withdrawn(address indexed user, uint256 amount, uint256 indexed stakeId);

    /**
     * @notice Emitted when a user claims staking rewards.
     * @param user    The address of the staker.
     * @param amount  The amount of rewards claimed.
     * @param stakeId The index of the stake for which rewards were claimed.
     */
    event RewardsClaimed(address indexed user, uint256 amount, uint256 indexed stakeId);
}
