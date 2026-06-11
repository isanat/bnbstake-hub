// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RewardMath
 * @notice Library for staking reward calculations using basis points precision.
 * @dev All calculations use uint256 fixed-point arithmetic with basis points (BPS).
 *      1 BPS = 0.01%, so 10000 BPS = 100%.
 *
 *      Key design decisions:
 *      - Multiply-first-divide-last to minimize precision loss.
 *      - `block.timestamp` is only used inside `view` functions — never in
 *        state-modifying functions, keeping all state transitions deterministic.
 *      - Overflow protection: Solidity ^0.8.x reverts on overflow by default.
 */
library RewardMath {
    // ──────────────────────────────────────────────
    // Constants
    // ──────────────────────────────────────────────

    /// @notice Number of basis points in 100%.
    uint256 internal constant BPS_DENOMINATOR = 10_000;

    /// @notice Seconds in a calendar year (365 days). Used for APY → daily conversion.
    uint256 internal constant SECONDS_PER_YEAR = 365 days;

    /// @notice Seconds in a day.
    uint256 internal constant SECONDS_PER_DAY = 1 days;

    // ──────────────────────────────────────────────
    // Reward Rate Calculations
    // ──────────────────────────────────────────────

    /**
     * @notice Calculate the daily reward rate from an annualized APY.
     * @dev Formula: dailyRateBps = apyBps / 365
     *      This is a simple linear division — we divide BPS by 365 days.
     *      The result is in BPS so it can be reused in other calculations.
     *
     *      Example: APY 2500 BPS (25%) → daily rate = 2500 / 365 ≈ 6 BPS (0.06%/day)
     *
     *      Note: Integer division truncates (rounds down). This is acceptable
     *      for reward calculations as it slightly favors the protocol over users.
     *
     * @param apyBps APY in basis points (e.g., 2500 = 25%).
     * @return dailyRateBps Daily rate in basis points.
     */
    function apyToDailyRate(
        uint256 apyBps
    ) internal pure returns (uint256 dailyRateBps) {
        dailyRateBps = apyBps / 365;
    }

    /**
     * @notice Calculate reward earned per second from APY and staked amount.
     * @dev Formula: rewardPerSecond = (amount * apyBps) / BPS_DENOMINATOR / SECONDS_PER_YEAR
     *      This is the canonical per-second accrual rate used for real-time reward accounting.
     *
     *      Multiply-first-divide-last: amount * apyBps is computed first to preserve
     *      precision, then divided by 10000 (BPS→fraction), then by seconds per year.
     *
     *      Overflow analysis: amount * apyBps is safe for any amount < 2^256 / 10_000
     *      (~1.15e73), far beyond any real-world token supply (even 18-decimal tokens
     *      max out at ~1e27 for 1 billion supply).
     *
     * @param amount  The staked amount (in token smallest units).
     * @param apyBps  APY in basis points (e.g., 2500 = 25%).
     * @return rewardPerSecond The reward earned per second (in token smallest units).
     */
    function rewardPerSecond(
        uint256 amount,
        uint256 apyBps
    ) internal pure returns (uint256) {
        // @dev Order of operations: (amount * apyBps) / 10000 / 365 days
        //   This preserves maximum precision by delaying division.
        //   Overflow-safe for all practical token amounts.
        return (amount * apyBps) / BPS_DENOMINATOR / SECONDS_PER_YEAR;
    }

    // ──────────────────────────────────────────────
    // Pending Reward Calculation
    // ──────────────────────────────────────────────

    /**
     * @notice Calculate pending rewards based on time elapsed.
     * @dev Computes the accumulated unclaimed rewards since the last claim.
     *      Uses `block.timestamp` (safe in a view function).
     *
     *      Time capping logic:
     *      - If `endTime > 0` (fixed-term stake) and `block.timestamp > endTime`,
     *        the elapsed time is capped at `endTime - lastClaimTime` so rewards
     *        stop accruing after the stake matures.
     *      - If `endTime == 0` (flexible stake), rewards accrue indefinitely.
     *
     *      Formula:
     *        effectiveElapsed = min(block.timestamp, endTime) - lastClaimTime  (if endTime > 0)
     *        effectiveElapsed = block.timestamp - lastClaimTime                (if endTime == 0)
     *        pendingRewards = amount * apyBps * effectiveElapsed / BPS_DENOMINATOR / SECONDS_PER_YEAR
     *
     *      Multiply-first-divide-last: the triple product amount * apyBps * effectiveElapsed
     *      is safe from overflow for all practical values (see analysis below).
     *
     *      Overflow analysis for worst case:
     *        amount max  = 1e30 (1 billion tokens with 18 decimals + buffer)
     *        apyBps max  = 1_000_000 (10,000% APY — extreme)
     *        elapsed max = 1e10 (~317 years in seconds)
     *        Product     = 1e46 << 2^256 ≈ 1.16e77 ✓ Safe
     *
     * @param amount        The staked amount.
     * @param apyBps        APY in basis points.
     * @param startTime     Timestamp when staking started.
     * @param lastClaimTime Timestamp of last claim (or startTime if never claimed).
     * @param endTime       Timestamp when stake matures (0 = flexible, no cap).
     * @return pendingRewards The accumulated unclaimed rewards.
     */
    function calculatePendingRewards(
        uint256 amount,
        uint256 apyBps,
        uint256 startTime,
        uint256 lastClaimTime,
        uint256 endTime
    ) internal view returns (uint256 pendingRewards) {
        // ── Determine the effective elapsed time ──
        uint256 elapsed;

        if (endTime != 0) {
            // Fixed-term stake: cap elapsed time at maturity
            // @dev If the stake has already matured, use endTime as the cap.
            //   If still active, use current block timestamp.
            uint256 currentTime = block.timestamp > endTime
                ? endTime
                : block.timestamp;
            elapsed = currentTime > lastClaimTime
                ? currentTime - lastClaimTime
                : 0;
        } else {
            // Flexible stake: no cap, accrue up to current time
            elapsed = block.timestamp > lastClaimTime
                ? block.timestamp - lastClaimTime
                : 0;
        }

        // ── Sanity: lastClaimTime should never be before startTime ──
        // If it is (corrupted state), cap elapsed to startTime..now
        if (lastClaimTime < startTime && block.timestamp > startTime) {
            elapsed = block.timestamp > startTime
                ? block.timestamp - startTime
                : 0;
            if (endTime != 0 && block.timestamp > endTime) {
                elapsed = endTime - startTime;
            }
        }

        // ── Calculate rewards ──
        if (elapsed == 0) {
            return 0;
        }

        // @dev Multiply-first-divide-last for precision.
        //   amount * apyBps * elapsed / BPS_DENOMINATOR / SECONDS_PER_YEAR
        //   Overflow is safe for all practical values (see NatSpec above).
        pendingRewards =
            (amount * apyBps * elapsed) /
            BPS_DENOMINATOR /
            SECONDS_PER_YEAR;
    }

    // ──────────────────────────────────────────────
    // Penalty & Effective APY
    // ──────────────────────────────────────────────

    /**
     * @notice Calculate early withdrawal penalty.
     * @dev Formula: penaltyAmount = (amount * penaltyBps) / BPS_DENOMINATOR
     *      Multiply-first-divide-last to preserve precision.
     *
     *      Example: 5% penalty on 1000 tokens → penalty = 1000 * 500 / 10000 = 50 tokens.
     *
     * @param amount      The principal amount being withdrawn early.
     * @param penaltyBps  Penalty rate in basis points (e.g., 500 = 5%).
     * @return penaltyAmount The penalty amount deducted from the principal.
     */
    function calculateEarlyPenalty(
        uint256 amount,
        uint256 penaltyBps
    ) internal pure returns (uint256 penaltyAmount) {
        penaltyAmount = (amount * penaltyBps) / BPS_DENOMINATOR;
    }

    /**
     * @notice Calculate the effective APY for a given plan over its duration.
     * @dev For fixed-term plans, the effective APY represents the annualized
     *      return over the actual lock period. This accounts for compounding
     *      expectations and provides a normalized comparison metric.
     *
     *      Formula: effectiveAPYBps = (apyBps * SECONDS_PER_YEAR) / durationSeconds
     *
     *      If durationSeconds < SECONDS_PER_YEAR, effective APY > nominal APY
     *      (because you earn the full APY in less than a year).
     *      If durationSeconds > SECONDS_PER_YEAR, effective APY < nominal APY.
     *
     *      Example: 25% APY over 180 days (15,552,000 seconds):
     *        effectiveAPY = 2500 * 31536000 / 15552000 ≈ 5069 BPS (≈50.7%)
     *
     *      Note: For durations less than 1 year, the effective APY
     *      exceeds the nominal APY — this is correct by design as it
     *      annualizes the return for comparison purposes.
     *
     * @param apyBps           Annual APY in basis points.
     * @param durationSeconds  Plan duration in seconds.
     * @return effectiveAPYBps The effective APY over the given duration, in BPS.
     */
    function effectiveAPY(
        uint256 apyBps,
        uint256 durationSeconds
    ) internal pure returns (uint256 effectiveAPYBps) {
        // @dev Guard against division by zero (zero-duration plan).
        //   A zero-duration plan is invalid; return 0.
        if (durationSeconds == 0) {
            return 0;
        }
        // @dev Multiply-first-divide-last for precision.
        //   apyBps * SECONDS_PER_YEAR is safe from overflow for all
        //   practical APY values (apyBps < 1e20 is already extreme).
        effectiveAPYBps = (apyBps * SECONDS_PER_YEAR) / durationSeconds;
    }
}
