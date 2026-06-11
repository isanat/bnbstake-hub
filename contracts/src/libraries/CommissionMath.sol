// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CommissionMath
 * @notice Library for MLM commission calculations using basis points precision.
 * @dev All calculations use uint256 fixed-point arithmetic with basis points (BPS).
 *      1 BPS = 1/100 of a percent = 0.01%. Therefore:
 *      - 100 BPS  = 1%
 *      - 1000 BPS = 10%
 *      - 10000 BPS = 100%
 *
 *      Overflow protection: Solidity ^0.8.x reverts on overflow by default.
 *      All multiplications are performed BEFORE divisions to minimize
 *      precision loss (multiply-first-divide-last pattern).
 */
library CommissionMath {
    // ──────────────────────────────────────────────
    // Constants
    // ──────────────────────────────────────────────

    /// @notice Number of basis points in 100% (used as the BPS denominator).
    uint256 internal constant BPS_DENOMINATOR = 10_000;

    // ──────────────────────────────────────────────
    // Commission Calculations
    // ──────────────────────────────────────────────

    /**
     * @notice Calculate unilevel commission for a specific level.
     * @dev Uses the formula: commission = (amount * rateBps) / BPS_DENOMINATOR
     *      Multiply-first-divide-last to preserve precision.
     *      No overflow risk for reasonable amounts (< 2^256 / 10_000 ≈ 10^73),
     *      which is far beyond any real-world token supply.
     *
     * @param amount  The base stake amount (in token smallest units, e.g., wei).
     * @param rateBps The commission rate in basis points (e.g., 1000 = 10%).
     * @return The commission amount, rounded down (integer division).
     */
    function calculateUnilevelCommission(
        uint256 amount,
        uint256 rateBps
    ) internal pure returns (uint256) {
        // @dev Overflow-safe: Solidity ^0.8 reverts on overflow.
        //   amount * rateBps is safe for any amount < 2^256 / 10_000
        //   which is astronomically large (~1.15e73).
        return (amount * rateBps) / BPS_DENOMINATOR;
    }

    /**
     * @notice Calculate binary bonus based on the weak leg volume.
     * @dev Binary bonus = weakLegVolume * rateBps / BPS_DENOMINATOR.
     *      The binary plan pays a percentage of the weaker leg's volume,
     *      ensuring the bonus never exceeds what the network can sustain.
     *      Multiply-first-divide-last to preserve precision.
     *
     * @param weakLegVolume The volume of the weak (smaller) leg.
     * @param rateBps       The binary bonus rate in basis points (e.g., 1000 = 10%).
     * @return The binary bonus amount, rounded down.
     */
    function calculateBinaryBonus(
        uint256 weakLegVolume,
        uint256 rateBps
    ) internal pure returns (uint256) {
        return (weakLegVolume * rateBps) / BPS_DENOMINATOR;
    }

    /**
     * @notice Determine the weak leg volume (the smaller of two legs).
     * @dev In a binary compensation plan, bonuses are based on the weaker leg
     *      to maintain sustainability. Returns the minimum of left and right.
     *
     * @param leftVolume  Left leg cumulative volume.
     * @param rightVolume Right leg cumulative volume.
     * @return weakVolume The smaller of the two volumes.
     */
    function getWeakLegVolume(
        uint256 leftVolume,
        uint256 rightVolume
    ) internal pure returns (uint256 weakVolume) {
        weakVolume = leftVolume < rightVolume ? leftVolume : rightVolume;
    }

    /**
     * @notice Flush (reset) volumes after binary bonus distribution.
     * @dev After paying the binary bonus on the weak leg, both legs must be
     *      reduced by the weak leg volume. The strong leg carries forward
     *      its excess volume for the next calculation period.
     *
     *      Example: left=500, right=300 → newLeft=200, newRight=0
     *
     *      Safety: This function does NOT check for underflow explicitly
     *      because Solidity ^0.8.x reverts on underflow by default. If
     *      weakLeg > leftVolume or weakLeg > rightVolume, the transaction
     *      will revert — this is the desired safety behavior.
     *
     * @param leftVolume  Left leg volume before flush.
     * @param rightVolume Right leg volume before flush.
     * @return newLeft  Left volume after flush (leftVolume - weakLeg).
     * @return newRight Right volume after flush (rightVolume - weakLeg).
     */
    function flushVolumes(
        uint256 leftVolume,
        uint256 rightVolume
    ) internal pure returns (uint256 newLeft, uint256 newRight) {
        uint256 weakLeg = getWeakLegVolume(leftVolume, rightVolume);
        // @dev Safe from underflow: weakLeg <= min(leftVolume, rightVolume)
        newLeft = leftVolume - weakLeg;
        newRight = rightVolume - weakLeg;
    }

    /**
     * @notice Convert basis points to actual percentage value.
     * @dev Useful for display purposes. 1 BPS = 0.01%, so divide by 100.
     *      Example: 1000 BPS → 10 (meaning 10%).
     *
     * @param bps Basis points (e.g., 1000 = 10%).
     * @return The percentage value (e.g., 10 = 10%).
     */
    function bpsToPercent(uint256 bps) internal pure returns (uint256) {
        return bps / 100;
    }
}
