// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AccessControl
 * @notice Role-based access control with emergency pause for the PolyStake system.
 * @dev Implements:
 *      - Default admin role (deployer)
 *      - Operator role (for authorized contracts like Vault, Distributors)
 *      - Emergency pause mechanism
 *      - Two-step ownership transfer (propose + accept) for safety
 *      - Timelock for critical parameter changes
 *
 *      SECURITY MODEL:
 *      - Admin: Full control over operators, pause, timelock, and admin transfer
 *      - Operators: Authorized contracts (StakingPool, RewardDistributor, etc.)
 *      - Admin always passes onlyOperator checks even if operator flag is cleared
 *      - Two-step admin transfer prevents accidental ownership loss
 *      - Timelock (2 days) protects critical parameter changes
 */
contract AccessControl {
    // ============================================================
    //                       State Variables
    // ============================================================

    /// @notice Current admin address
    address public admin;

    /// @notice Pending admin address (two-step transfer)
    address public pendingAdmin;

    /// @notice Mapping of authorized operator addresses
    mapping(address => bool) public operators;

    /// @notice Emergency pause flag — when true, all protocol operations are halted
    bool public paused;

    /// @notice Mapping of action hashes to their earliest execution timestamp
    mapping(bytes32 => uint256) public timelockedActions;

    /// @notice Duration that a timelocked action must wait before execution
    uint256 public constant TIMELOCK_DURATION = 2 days;

    // ============================================================
    //                          Events
    // ============================================================

    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);
    event AdminChangeProposed(address indexed currentAdmin, address indexed pendingAdmin);
    event OperatorAdded(address indexed operator);
    event OperatorRemoved(address indexed operator);
    event Paused(address indexed admin);
    event Unpaused(address indexed admin);
    event ActionTimelocked(bytes32 indexed actionHash, uint256 executionTime);
    event ActionCancelled(bytes32 indexed actionHash);

    // ============================================================
    //                         Modifiers
    // ============================================================

    modifier onlyAdmin() {
        require(msg.sender == admin, "AccessControl: caller is not admin");
        _;
    }

    modifier onlyOperator() {
        require(
            operators[msg.sender] || msg.sender == admin,
            "AccessControl: caller is not operator"
        );
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "AccessControl: contract is paused");
        _;
    }

    modifier whenPaused() {
        require(paused, "AccessControl: contract is not paused");
        _;
    }

    // ============================================================
    //                        Constructor
    // ============================================================

    constructor() {
        admin = msg.sender;
        operators[msg.sender] = true;
        emit AdminChanged(address(0), msg.sender);
        emit OperatorAdded(msg.sender);
    }

    // ============================================================
    //                     Admin Functions
    // ============================================================

    /**
     * @notice Proposes a new admin via two-step transfer process.
     * @dev Step 1: Current admin proposes a new admin. The proposed admin must
     *      call {acceptAdmin} to complete the transfer. This prevents accidental
     *      transfer to a wrong or unreachable address.
     * @param newAdmin The address of the proposed new admin.
     */
    function proposeAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "AccessControl: zero address");
        require(newAdmin != admin, "AccessControl: same admin");
        pendingAdmin = newAdmin;
        emit AdminChangeProposed(admin, newAdmin);
    }

    /**
     * @notice Accepts the admin role (step 2 of two-step transfer).
     * @dev Must be called by the pending admin address. Clears the pending admin
     *      and transfers operator status from old admin to new admin.
     */
    function acceptAdmin() external {
        require(msg.sender == pendingAdmin, "AccessControl: caller is not pending admin");
        address oldAdmin = admin;
        admin = msg.sender;
        pendingAdmin = address(0);

        // Transfer operator status to new admin
        operators[oldAdmin] = false;
        operators[msg.sender] = true;

        emit AdminChanged(oldAdmin, msg.sender);
    }

    /**
     * @notice Adds an address as an authorized operator.
     * @dev Operators are trusted contracts (StakingPool, RewardDistributor, etc.)
     *      that can call restricted functions on other protocol contracts.
     * @param operator The address to add as an operator.
     */
    function addOperator(address operator) external onlyAdmin {
        require(operator != address(0), "AccessControl: zero address");
        require(!operators[operator], "AccessControl: already operator");
        operators[operator] = true;
        emit OperatorAdded(operator);
    }

    /**
     * @notice Removes an address from the authorized operator set.
     * @dev Cannot remove the current admin's operator status to maintain consistency.
     *      The admin always passes onlyOperator checks regardless of operator flag.
     * @param operator The address to remove as an operator.
     */
    function removeOperator(address operator) external onlyAdmin {
        require(operators[operator], "AccessControl: not operator");
        require(operator != admin, "AccessControl: cannot remove admin as operator");
        operators[operator] = false;
        emit OperatorRemoved(operator);
    }

    /**
     * @notice Triggers emergency pause, halting all protocol operations.
     * @dev Can only be called by admin when contract is not already paused.
     *      Use this for security incidents or critical vulnerabilities.
     */
    function pause() external onlyAdmin whenNotPaused {
        paused = true;
        emit Paused(msg.sender);
    }

    /**
     * @notice Lifts the emergency pause, resuming protocol operations.
     * @dev Can only be called by admin when contract is currently paused.
     */
    function unpause() external onlyAdmin whenPaused {
        paused = false;
        emit Unpaused(msg.sender);
    }

    // ============================================================
    //                    Timelock Functions
    // ============================================================

    /**
     * @notice Schedules a timelocked action for future execution.
     * @dev Actions cannot be executed until TIMELOCK_DURATION has passed.
     *      This gives the community time to review and react to critical changes.
     * @param actionHash The keccak256 hash identifying the action to schedule.
     */
    function scheduleAction(bytes32 actionHash) public onlyAdmin {
        require(timelockedActions[actionHash] == 0, "AccessControl: already scheduled");
        timelockedActions[actionHash] = block.timestamp + TIMELOCK_DURATION;
        emit ActionTimelocked(actionHash, block.timestamp + TIMELOCK_DURATION);
    }

    /**
     * @notice Cancels a previously scheduled timelocked action.
     * @param actionHash The keccak256 hash identifying the action to cancel.
     */
    function cancelAction(bytes32 actionHash) external onlyAdmin {
        require(timelockedActions[actionHash] > 0, "AccessControl: not scheduled");
        timelockedActions[actionHash] = 0;
        emit ActionCancelled(actionHash);
    }

    /**
     * @notice Executes a timelocked action after the timelock period has passed.
     * @dev Internal function — called by derived contracts after verifying the action.
     *      Clears the timelock entry to prevent re-execution.
     * @param actionHash The keccak256 hash identifying the action to execute.
     */
    function executeAction(bytes32 actionHash) internal {
        require(timelockedActions[actionHash] > 0, "AccessControl: action not scheduled");
        require(
            timelockedActions[actionHash] <= block.timestamp,
            "AccessControl: timelock not expired"
        );
        timelockedActions[actionHash] = 0; // Clear after execution (prevents re-execution)
    }

    /**
     * @notice Checks if a timelocked action is ready for execution.
     * @param actionHash The keccak256 hash identifying the action.
     * @return True if the action has been scheduled and the timelock has expired.
     */
    function isActionReady(bytes32 actionHash) external view returns (bool) {
        return timelockedActions[actionHash] > 0 && timelockedActions[actionHash] <= block.timestamp;
    }
}
