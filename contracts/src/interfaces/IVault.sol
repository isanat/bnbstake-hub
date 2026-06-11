// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IVault
 * @notice Interface for the treasury vault contract that holds protocol funds.
 * @dev The vault manages deposits and withdrawals of ERC20 tokens.
 *      Only authorized contracts (staking pool, reward distributors) may call
 *      state-changing functions. Emergency withdrawal is restricted to the
 *      protocol admin / governance multisig.
 */
interface IVault {
    // ============================================================
    //                      State-Changing Functions
    // ============================================================

    /**
     * @notice Deposits ERC20 tokens into the vault.
     * @dev The caller must have pre-approved the vault to transfer `amount` tokens.
     *      Access control: restricted to authorized depositors (staking pool, fee manager).
     * @param token  The address of the ERC20 token to deposit.
     * @param amount The number of tokens to deposit.
     */
    function deposit(address token, uint256 amount) external;

    /**
     * @notice Withdraws ERC20 tokens from the vault to a specified recipient.
     * @dev Access control: restricted to authorized withdrawers (staking pool, reward distributors).
     *      Reverts if the vault has insufficient token balance.
     * @param token  The address of the ERC20 token to withdraw.
     * @param to     The recipient address.
     * @param amount The number of tokens to withdraw.
     */
    function withdraw(address token, address to, uint256 amount) external;

    /**
     * @notice Emergency withdrawal of the entire token balance to a specified recipient.
     * @dev Access control: restricted to protocol admin / governance multisig only.
     *      Intended for emergency scenarios (e.g., security incident, contract migration).
     *      Emits {EmergencyWithdrawn} event with the full balance amount.
     * @param token The address of the ERC20 token to withdraw.
     * @param to    The recipient address.
     */
    function emergencyWithdraw(address token, address to) external;

    // ============================================================
    //                       View Functions
    // ============================================================

    /**
     * @notice Returns the vault's balance of the specified token.
     * @param token The address of the ERC20 token to query.
     * @return The vault's token balance.
     */
    function getBalance(address token) external view returns (uint256);

    // ============================================================
    //                          Events
    // ============================================================

    /**
     * @notice Emitted when tokens are deposited into the vault.
     * @param token  The address of the deposited ERC20 token.
     * @param from   The address that initiated the deposit.
     * @param amount The number of tokens deposited.
     */
    event Deposited(address indexed token, address indexed from, uint256 amount);

    /**
     * @notice Emitted when tokens are withdrawn from the vault.
     * @param token  The address of the withdrawn ERC20 token.
     * @param to     The recipient address.
     * @param amount The number of tokens withdrawn.
     */
    event Withdrawn(address indexed token, address indexed to, uint256 amount);

    /**
     * @notice Emitted when an emergency withdrawal is executed.
     * @param token  The address of the withdrawn ERC20 token.
     * @param to     The recipient address.
     * @param amount The total number of tokens withdrawn (entire balance).
     */
    event EmergencyWithdrawn(address indexed token, address indexed to, uint256 amount);
}
