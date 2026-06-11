// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IFeeManager
 * @notice Interface for the fee management contract.
 * @dev Calculates and manages fees for early withdrawals and standard withdrawals.
 *      Early withdrawal penalties are plan-specific and depend on how long the stake
 *      has been active. Standard withdrawal fees are a flat percentage of the amount.
 *
 *      All rates are expressed in basis points (1 bp = 0.01%, e.g., 500 = 5%).
 *
 *      Access control:
 *      - `setEarlyWithdrawPenalty` is restricted to protocol admin / governance.
 *      - `setWithdrawFee` is restricted to protocol admin / governance.
 */
interface IFeeManager {
    // ============================================================
    //                       View Functions
    // ============================================================

    /**
     * @notice Calculates the early withdrawal penalty for a given plan and staking duration.
     * @dev Returns 0 if the stake has been held for longer than the plan's lock duration
     *      (no penalty for on-time or late withdrawals). The penalty decreases
     *      proportionally as the stake approaches maturity.
     * @param planId     The staking plan identifier.
     * @param amount     The principal amount being withdrawn early.
     * @param daysStaked The number of days the stake has been active.
     * @return The penalty amount in token units.
     */
    function calculateEarlyWithdrawPenalty(
        uint8 planId,
        uint256 amount,
        uint256 daysStaked
    ) external view returns (uint256);

    /**
     * @notice Calculates the standard withdrawal fee for a given amount.
     * @dev The fee is a flat percentage of the withdrawal amount, regardless of
     *      staking duration or plan. Returns 0 if no withdrawal fee is configured.
     * @param amount The withdrawal amount.
     * @return The fee amount in token units.
     */
    function calculateWithdrawFee(uint256 amount) external view returns (uint256);

    // ============================================================
    //                      State-Changing Functions
    // ============================================================

    /**
     * @notice Sets the early withdrawal penalty rate for a specific staking plan.
     * @dev Access control: restricted to protocol admin / governance.
     *      The penalty rate is expressed in basis points (e.g., 1000 = 10%).
     *      Setting the rate to 0 disables early withdrawal penalties for the plan.
     * @param planId      The staking plan identifier.
     * @param penaltyRate The new early withdrawal penalty rate in basis points.
     */
    function setEarlyWithdrawPenalty(uint8 planId, uint256 penaltyRate) external;

    /**
     * @notice Sets the standard withdrawal fee rate.
     * @dev Access control: restricted to protocol admin / governance.
     *      The fee rate is expressed in basis points (e.g., 50 = 0.5%).
     *      Setting the rate to 0 disables withdrawal fees.
     * @param feeRate The new withdrawal fee rate in basis points.
     */
    function setWithdrawFee(uint256 feeRate) external;

    /**
     * @notice Sets the plan duration for a staking plan (used for sliding scale calculation).
     * @dev Access control: restricted to protocol admin / governance.
     *      Typically called by the StakingPool when a plan is created or updated.
     * @param planId   The staking plan identifier.
     * @param duration The lock duration in seconds.
     */
    function setPlanDuration(uint8 planId, uint256 duration) external;

    // ============================================================
    //                          Events
    // ============================================================

    /**
     * @notice Emitted when the early withdrawal penalty rate is changed for a plan.
     * @param planId     The staking plan identifier.
     * @param oldRate    The previous penalty rate in basis points.
     * @param newRate    The new penalty rate in basis points.
     */
    event EarlyWithdrawPenaltyChanged(uint8 indexed planId, uint256 oldRate, uint256 newRate);

    /**
     * @notice Emitted when the standard withdrawal fee rate is changed.
     * @param oldRate The previous fee rate in basis points.
     * @param newRate The new fee rate in basis points.
     */
    event WithdrawFeeChanged(uint256 oldRate, uint256 newRate);
}
