// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20Extended.sol";
import "./interfaces/IVault.sol";
import "./AccessControl.sol";

/**
 * @title Vault
 * @notice Secure treasury for the StakeBNB system. Holds all deposited USDT.
 * @dev Only authorized operators (StakingPool, Distributors) can withdraw funds.
 *      Admin can emergency withdraw (with timelock).
 *      Implements reentrancy guard for all state-changing functions.
 *
 *      SECURITY MODEL:
 *      - Operators: Can withdraw up to the vault's balance (checked per-call)
 *      - Admin: Can emergency withdraw (timelocked, 2-day delay)
 *      - Users: Deposit via the staking pool (not directly, though anyone can call deposit)
 *      - No single point of failure: Admin cannot steal funds without timelock
 *      - Balance-diff pattern on deposit handles fee-on-transfer tokens
 *      - Safe transfer helpers check return values for non-reverting token implementations
 */
contract Vault is IVault, AccessControl {
    // ============================================================
    //                        State Variables
    // ============================================================

    /// @notice The USDT (BEP-20) token contract — immutable for security
    IERC20Extended public immutable usdt;

    /// @notice Tracks total deposits per token (for accounting)
    mapping(address => uint256) public totalDeposits;

    /// @notice Tracks allocated (reserved but not yet withdrawn) amounts per token
    /// @dev Reserved for future use: pre-allocation to prevent operator race conditions.
    ///      Currently not enforced in withdraw() — relies on sequential tx execution on BSC.
    mapping(address => uint256) public allocatedFunds;

    /// @dev Reentrancy guard status
    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    // ============================================================
    //                        Modifiers
    // ============================================================

    modifier nonReentrant() {
        require(_status != _ENTERED, "Vault: reentrancy");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    // ============================================================
    //                        Constructor
    // ============================================================

    /**
     * @notice Initializes the Vault with the USDT token address.
     * @param _usdt The address of the USDT (BEP-20) token contract.
     */
    constructor(address _usdt) {
        require(_usdt != address(0), "Vault: zero address");
        usdt = IERC20Extended(_usdt);
        _status = _NOT_ENTERED;
    }

    // ============================================================
    //                    Internal Helpers
    // ============================================================

    /**
     * @dev Safely transfers ERC20 tokens, checking the return value.
     *      Some token implementations do not revert on failure — this guard
     *      catches those cases and reverts explicitly.
     * @param token The ERC20 token contract.
     * @param to The recipient address.
     * @param amount The amount to transfer.
     */
    function _safeTransfer(IERC20Extended token, address to, uint256 amount) internal {
        (bool success, bytes memory data) = address(token).call(
            abi.encodeCall(token.transfer, (to, amount))
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "Vault: transfer failed");
    }

    /**
     * @dev Safely transfers ERC20 tokens from `from` to `to`, checking the return value.
     * @param token The ERC20 token contract.
     * @param from The sender address (must have approved the vault).
     * @param to The recipient address.
     * @param amount The amount to transfer.
     */
    function _safeTransferFrom(IERC20Extended token, address from, address to, uint256 amount) internal {
        (bool success, bytes memory data) = address(token).call(
            abi.encodeCall(token.transferFrom, (from, to, amount))
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "Vault: transferFrom failed");
    }

    // ============================================================
    //                     External Functions
    // ============================================================

    /**
     * @notice Deposits USDT into the vault.
     * @dev Called by the StakingPool after user approves and transfers tokens.
     *      Anyone can deposit (the staking pool will call this with user funds).
     *      Uses balance-diff pattern to handle fee-on-transfer tokens correctly.
     * @param token The token address (must be USDT).
     * @param amount The amount to deposit.
     */
    function deposit(address token, uint256 amount) external nonReentrant whenNotPaused {
        require(token == address(usdt), "Vault: only USDT accepted");
        require(amount > 0, "Vault: zero amount");

        uint256 balanceBefore = usdt.balanceOf(address(this));
        _safeTransferFrom(usdt, msg.sender, address(this), amount);
        uint256 balanceAfter = usdt.balanceOf(address(this));

        // Use actual received amount (handles fee-on-transfer tokens)
        uint256 received = balanceAfter - balanceBefore;
        require(received > 0, "Vault: no tokens received");

        totalDeposits[token] += received;

        emit Deposited(token, msg.sender, received);
    }

    /**
     * @notice Withdraws USDT from the vault to a specified recipient.
     * @dev Only authorized operators can call this. The vault's actual balance
     *      is checked to ensure sufficient funds are available.
     * @param token The token address (must be USDT).
     * @param to The recipient address.
     * @param amount The amount to withdraw.
     */
    function withdraw(address token, address to, uint256 amount) external nonReentrant onlyOperator whenNotPaused {
        require(token == address(usdt), "Vault: only USDT accepted");
        require(to != address(0), "Vault: withdraw to zero address");
        require(amount > 0, "Vault: zero amount");
        require(usdt.balanceOf(address(this)) >= amount, "Vault: insufficient balance");

        _safeTransfer(usdt, to, amount);

        emit Withdrawn(token, to, amount);
    }

    /**
     * @notice Gets the USDT balance held by the vault.
     * @return The balance of USDT in the vault.
     */
    function getBalance(address /* token */) external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    /**
     * @notice Emergency withdrawal of the entire USDT balance to a specified recipient.
     * @dev Only admin can call this, and the action must be scheduled via timelock first.
     *      The timelock action hash is computed from "emergencyWithdraw" + token + to.
     *      This gives the community 2 days to review before execution.
     *
     *      SECURITY: The actionHash includes the `to` address, meaning a schedule
     *      for address A cannot be used to withdraw to address B.
     * @param token The token address (must be USDT).
     * @param to The recipient address.
     */
    function emergencyWithdraw(address token, address to) external nonReentrant onlyAdmin {
        require(token == address(usdt), "Vault: only USDT accepted");
        require(to != address(0), "Vault: withdraw to zero address");

        // Must be timelocked — the hash includes token and to for binding
        bytes32 actionHash = keccak256(abi.encodePacked("emergencyWithdraw", token, to));
        executeAction(actionHash);

        uint256 balance = usdt.balanceOf(address(this));
        require(balance > 0, "Vault: no balance");

        _safeTransfer(usdt, to, balance);

        emit EmergencyWithdrawn(token, to, balance);
    }

    /**
     * @notice Schedules an emergency withdrawal via the timelock mechanism.
     * @dev Must be called by admin before {emergencyWithdraw} can be executed.
     *      After scheduling, there is a 2-day delay before execution is allowed.
     * @param token The token address.
     * @param to The recipient address.
     */
    function scheduleEmergencyWithdraw(address token, address to) external onlyAdmin {
        bytes32 actionHash = keccak256(abi.encodePacked("emergencyWithdraw", token, to));
        scheduleAction(actionHash);
    }

    // ============================================================
    //                     View Functions
    // ============================================================

    /**
     * @notice Returns the available (unallocated) balance for a given token.
     * @dev The available balance is the vault's actual token balance minus allocated funds.
     *      Useful for operators to check how much they can withdraw.
     * @param token The token address.
     * @return The available balance (total balance minus allocated).
     */
    function availableBalance(address token) external view returns (uint256) {
        uint256 balance = usdt.balanceOf(address(this));
        uint256 allocated = allocatedFunds[token];
        // Guard against underflow if allocatedFunds exceeds balance (edge case)
        return balance >= allocated ? balance - allocated : 0;
    }
}
