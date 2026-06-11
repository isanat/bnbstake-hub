// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IFeeManager.sol";
import "./AccessControl.sol";
import "./libraries/CommissionMath.sol";

/**
 * @title FeeManager
 * @notice Manages early withdrawal penalties and standard withdrawal fees for the StakeBNB system.
 * @dev All rates are expressed in basis points (1 bp = 0.01%, e.g., 500 = 5%).
 *
 *      Early withdrawal penalties are plan-specific and may use a sliding scale
 *      that decreases the penalty as the stake approaches maturity.
 *
 *      Standard withdrawal fees are a flat percentage applied to all withdrawals.
 *
 *      SECURITY MODEL:
 *      - Penalty and fee changes are timelocked (2-day delay)
 *      - Maximum penalty rate is 50% (MAX_PENALTY_BPS = 5000)
 *      - Maximum withdrawal fee is 10% (MAX_WITHDRAW_FEE_BPS = 1000)
 *      - Admin-only configuration changes
 */
contract FeeManager is IFeeManager, AccessControl {
    // ============================================================
    //                        Data Structures
    // ============================================================

    /**
     * @notice Fee configuration for a specific staking plan.
     * @param earlyWithdrawPenaltyBps Penalty rate in basis points (e.g., 1000 = 10%).
     * @param planDuration           Plan lock duration in seconds (for maturity checks).
     * @param hasPenalty             Whether this plan has an early withdrawal penalty.
     */
    struct PlanFeeConfig {
        uint256 earlyWithdrawPenaltyBps;
        uint256 planDuration;
        bool hasPenalty;
    }

    // ============================================================
    //                        State Variables
    // ============================================================

    /// @notice Fee configuration per staking plan.
    mapping(uint8 => PlanFeeConfig) public planFeeConfigs;

    /// @notice General withdrawal fee in basis points (applies to all withdrawals).
    uint256 public withdrawFeeBps;

    /// @notice Maximum allowed early withdrawal penalty rate (50%).
    uint256 public constant MAX_PENALTY_BPS = 5000;

    /// @notice Maximum allowed withdrawal fee rate (10%).
    uint256 public constant MAX_WITHDRAW_FEE_BPS = 1000;

    /// @notice BPS denominator constant (10,000 = 100%).
    uint256 private constant BPS_DENOMINATOR = 10_000;

    /// @notice Seconds per day constant.
    uint256 private constant SECONDS_PER_DAY = 1 days;

    // ============================================================
    //                       View Functions
    // ============================================================

    /**
     * @notice Calculates the early withdrawal penalty for a given plan and staking duration.
     * @dev Returns 0 if the plan has no penalty or if the penalty rate is zero.
     *      Implements a sliding scale: penalty decreases as the stake approaches maturity.
     *
     *      Sliding scale tiers:
     *      - 0-25% of duration: full penalty rate
     *      - 25-50% of duration: 75% of penalty rate
     *      - 50-75% of duration: 50% of penalty rate
     *      - 75-100% of duration: 25% of penalty rate
     *
     *      This incentivizes longer holding by reducing the penalty over time.
     *
     * @param planId     The staking plan identifier.
     * @param amount     The principal amount being withdrawn early.
     * @param daysStaked The number of days the stake has been active.
     * @return The penalty amount in token units.
     */
    function calculateEarlyWithdrawPenalty(
        uint8 planId,
        uint256 amount,
        uint256 daysStaked
    ) external view returns (uint256) {
        PlanFeeConfig memory config = planFeeConfigs[planId];
        if (!config.hasPenalty || config.earlyWithdrawPenaltyBps == 0) return 0;

        // Check if stake is matured
        uint256 durationDays = config.planDuration / SECONDS_PER_DAY;
        if (durationDays > 0 && daysStaked >= durationDays) return 0;

        // Sliding scale: penalty decreases as stake approaches maturity
        uint256 penaltyRate = config.earlyWithdrawPenaltyBps;

        if (durationDays > 0) {
            // Calculate percentage of duration completed
            // Using 4 tiers for the sliding scale
            // progressBps = (daysStaked * 10000) / durationDays
            uint256 progressBps = (daysStaked * BPS_DENOMINATOR) / durationDays;

            if (progressBps < 2500) {
                // 0-25% of duration: full penalty
                // penaltyRate unchanged
            } else if (progressBps < 5000) {
                // 25-50% of duration: 75% penalty
                penaltyRate = (penaltyRate * 75) / 100;
            } else if (progressBps < 7500) {
                // 50-75% of duration: 50% penalty
                penaltyRate = (penaltyRate * 50) / 100;
            } else {
                // 75-100% of duration: 25% penalty
                penaltyRate = (penaltyRate * 25) / 100;
            }
        }

        return (amount * penaltyRate) / BPS_DENOMINATOR;
    }

    /**
     * @notice Calculates the standard withdrawal fee for a given amount.
     * @dev The fee is a flat percentage of the withdrawal amount.
     *      Returns 0 if no withdrawal fee is configured.
     * @param amount The withdrawal amount.
     * @return The fee amount in token units.
     */
    function calculateWithdrawFee(uint256 amount) external view returns (uint256) {
        if (withdrawFeeBps == 0) return 0;
        return (amount * withdrawFeeBps) / BPS_DENOMINATOR;
    }

    /**
     * @notice Checks if a stake has passed its lock period (is matured).
     * @param startTime The timestamp when the stake was created.
     * @param duration  The lock duration in seconds.
     * @return True if the stake is past the lock period, false otherwise.
     */
    function isMatured(uint256 startTime, uint256 duration) external view returns (bool) {
        if (duration == 0) return true; // Flexible plans are always "matured"
        return block.timestamp >= startTime + duration;
    }

    // ============================================================
    //                    State-Changing Functions
    // ============================================================

    /**
     * @notice Sets the early withdrawal penalty rate for a specific staking plan (timelocked).
     * @dev Must be scheduled via scheduleSetEarlyWithdrawPenalty first, then executed
     *      after the timelock period. The penalty rate cannot exceed MAX_PENALTY_BPS.
     * @param planId      The staking plan identifier.
     * @param penaltyBps  The new penalty rate in basis points (0 to disable).
     */
    function setEarlyWithdrawPenalty(uint8 planId, uint256 penaltyBps) external onlyAdmin {
        require(penaltyBps <= MAX_PENALTY_BPS, "FeeManager: penalty exceeds maximum");

        bytes32 actionHash = keccak256(abi.encodePacked("setEarlyWithdrawPenalty", planId, penaltyBps));
        executeAction(actionHash);

        uint256 oldRate = planFeeConfigs[planId].earlyWithdrawPenaltyBps;
        planFeeConfigs[planId].earlyWithdrawPenaltyBps = penaltyBps;
        planFeeConfigs[planId].hasPenalty = penaltyBps > 0;

        emit EarlyWithdrawPenaltyChanged(planId, oldRate, penaltyBps);
    }

    /**
     * @notice Schedules an early withdrawal penalty change via the timelock.
     * @param planId     The staking plan identifier.
     * @param penaltyBps The new penalty rate in basis points.
     */
    function scheduleSetEarlyWithdrawPenalty(uint8 planId, uint256 penaltyBps) external onlyAdmin {
        require(penaltyBps <= MAX_PENALTY_BPS, "FeeManager: penalty exceeds maximum");
        bytes32 actionHash = keccak256(abi.encodePacked("setEarlyWithdrawPenalty", planId, penaltyBps));
        scheduleAction(actionHash);
    }

    /**
     * @notice Sets the standard withdrawal fee rate (timelocked).
     * @dev Must be scheduled via scheduleSetWithdrawFee first, then executed
     *      after the timelock period. The fee rate cannot exceed MAX_WITHDRAW_FEE_BPS.
     * @param feeBps The new withdrawal fee rate in basis points (0 to disable).
     */
    function setWithdrawFee(uint256 feeBps) external onlyAdmin {
        require(feeBps <= MAX_WITHDRAW_FEE_BPS, "FeeManager: fee exceeds maximum");

        bytes32 actionHash = keccak256(abi.encodePacked("setWithdrawFee", feeBps));
        executeAction(actionHash);

        uint256 oldRate = withdrawFeeBps;
        withdrawFeeBps = feeBps;

        emit WithdrawFeeChanged(oldRate, feeBps);
    }

    /**
     * @notice Schedules a withdrawal fee change via the timelock.
     * @param feeBps The new fee rate in basis points.
     */
    function scheduleSetWithdrawFee(uint256 feeBps) external onlyAdmin {
        require(feeBps <= MAX_WITHDRAW_FEE_BPS, "FeeManager: fee exceeds maximum");
        bytes32 actionHash = keccak256(abi.encodePacked("setWithdrawFee", feeBps));
        scheduleAction(actionHash);
    }

    // ============================================================
    //                    Plan Duration Config
    // ============================================================

    /**
     * @notice Sets the plan duration for a staking plan (used for sliding scale calculation).
     * @dev Only operators or admin can call this. Typically called by StakingPool
     *      when a new plan is created (addPlan calls this internally).
     * @param planId   The staking plan identifier.
     * @param duration The lock duration in seconds.
     */
    function setPlanDuration(uint8 planId, uint256 duration) external onlyOperator {
        planFeeConfigs[planId].planDuration = duration;
    }
}
