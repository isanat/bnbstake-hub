// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IERC20Extended
 * @notice Extended ERC20 interface with EIP-2612 permit functionality for gasless approvals.
 * @dev Combines the standard ERC20 interface (IERC20) with the permit function
 *      defined in EIP-2612, enabling meta-transaction approvals via off-chain signatures.
 */
interface IERC20Extended {
    // ============================================================
    //                       ERC20 Standard
    // ============================================================

    /**
     * @notice Returns the total supply of tokens.
     * @return The total number of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @notice Returns the token balance of the specified account.
     * @param account The address to query the balance of.
     * @return The token balance of the account.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @notice Transfers tokens from the caller to the specified recipient.
     * @param to The recipient address.
     * @param amount The number of tokens to transfer.
     * @return True if the transfer succeeded, reverts otherwise.
     */
    function transfer(address to, uint256 amount) external returns (bool);

    /**
     * @notice Returns the remaining number of tokens that `spender` is allowed
     *         to spend on behalf of `owner` through {transferFrom}.
     * @param owner The address that owns the tokens.
     * @param spender The address authorized to spend the tokens.
     * @return The remaining allowance.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @notice Sets `amount` as the allowance of `spender` over the caller's tokens.
     * @dev Beware that changing an allowance with this method brings the risk that
     *      someone may use both the old and the new allowance by unfortunate transaction
     *      ordering. Consider using {increaseAllowance} / {decreaseAllowance} in production.
     * @param spender The address authorized to spend.
     * @param amount The maximum number of tokens `spender` may spend.
     * @return True if the approval succeeded.
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @notice Moves `amount` tokens from `from` to `to` using the allowance mechanism.
     * @dev `amount` is then deducted from the caller's allowance.
     * @param from The address to transfer tokens from.
     * @param to The address to transfer tokens to.
     * @param amount The number of tokens to transfer.
     * @return True if the transfer succeeded.
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    // ============================================================
    //                      ERC20 Metadata
    // ============================================================

    /**
     * @notice Returns the name of the token.
     * @return The token name string.
     */
    function name() external view returns (string memory);

    /**
     * @notice Returns the symbol of the token.
     * @return The token symbol string.
     */
    function symbol() external view returns (string memory);

    /**
     * @notice Returns the number of decimals used for token amounts.
     * @return The decimal places (typically 18).
     */
    function decimals() external view returns (uint8);

    // ============================================================
    //                    EIP-2612 Permit
    // ============================================================

    /**
     * @notice Sets `value` as the allowance of `spender` over `owner`'s tokens,
     *         given `owner`'s signed approval.
     * @dev Implements EIP-2612 permit for gasless approvals. The `deadline` must be
     *      a timestamp in the future. The signature (v, r, s) must be valid for the
     *      EIP-712 structured data hash of the permit message.
     *
     *      IMPORTANT: The `owner` must not have already set a non-zero allowance for
     *      `spender`, unless the spender has reset it to zero first. This prevents
     *      the front-running of approval transactions (see EIP-2612 security considerations).
     *
     * @param owner    The address whose tokens are being approved.
     * @param spender  The address being authorized to spend.
     * @param value    The allowance amount being set.
     * @param deadline The timestamp by which the signature must be used (UNIX epoch).
     * @param v        The recovery byte of the signature.
     * @param r        The first 32 bytes of the signature.
     * @param s        The second 32 bytes of the signature.
     */
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    // ============================================================
    //                        ERC20 Events
    // ============================================================

    /**
     * @notice Emitted when `value` tokens are moved from `from` to `to`.
     * @dev Also emitted when minting (from = address(0)) and burning (to = address(0)).
     * @param from  The sender address (address(0) for minting).
     * @param to    The recipient address (address(0) for burning).
     * @param value The amount of tokens transferred.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @notice Emitted when the allowance of `spender` for `owner` is set by a call to {approve} or {permit}.
     * @param owner   The address that owns the tokens.
     * @param spender The address authorized to spend.
     * @param value   The new allowance amount.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);
}
