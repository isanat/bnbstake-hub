// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IMLMNetwork.sol";
import "./AccessControl.sol";
import "./libraries/BinaryTree.sol";

/**
 * @title MLMNetwork
 * @notice Binary tree MLM network management contract for the StakeBNB system.
 * @dev Manages user registration with auto-placement (BFS), referral code generation,
 *      direct referral tracking, and binary volume propagation. Inherits AccessControl
 *      for operator-gated volume updates.
 *
 *      ARCHITECTURE:
 *      - Binary tree: Each user occupies a node with left/right children. New users
 *        are auto-placed via BFS (breadth-first search) to ensure level-by-level filling.
 *      - Unilevel chain: Each user has a single direct referrer, forming a separate
 *        referral chain from the binary tree structure.
 *      - Volumes: Left/right subtree volumes are propagated up the binary tree on stake
 *        events. Volumes are flushed (reduced) after binary bonus claims.
 *
 *      SECURITY:
 *      - Reentrancy guard on register() and updateBinaryVolumes()
 *      - Only operators can update or flush volumes
 *      - Double registration prevented
 *      - Referrer must exist before registration
 *      - Referral code uniqueness guaranteed with retry mechanism
 */
contract MLMNetwork is IMLMNetwork, AccessControl {
    // ============================================================
    //                        State Variables
    // ============================================================

    /// @notice Binary tree node data for each registered user
    mapping(address => BinaryTree.Node) public nodes;

    /// @notice Maps referral code → user address
    mapping(string => address) public referralCodeToAddress;

    /// @notice Maps user address → referral code
    mapping(address => string) public addressToReferralCode;

    /// @notice Direct referrals for each user (unilevel chain, separate from binary children)
    mapping(address => address[]) private _directReferrals;

    /// @notice All registered user addresses (for enumeration)
    address[] public allUsers;

    /// @notice Total number of registered users
    uint256 public totalUsers;

    /// @notice Maximum unilevel depth for commission distribution
    uint256 public constant MAX_UNILEVEL_DEPTH = 10;

    /// @notice Address of the ReferralNFT contract for auto-minting on registration
    address public referralNFT;

    // ── Reentrancy Guard ──

    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    // ============================================================
    //                          Modifiers
    // ============================================================

    modifier nonReentrant() {
        require(_status != _ENTERED, "MLMNetwork: reentrancy");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    // ============================================================
    //                        Constructor
    // ============================================================

    /**
     * @notice Initializes the MLM network with the deployer as the root user.
     * @dev The root user has no parent, no referrer, and placementSide = None.
     *      A referral code is auto-generated for the root.
     */
    constructor() {
        _status = _NOT_ENTERED;

        // Register deployer as the root user
        address root = msg.sender;
        BinaryTree.Node storage rootNode = nodes[root];
        rootNode.parent = address(0);
        rootNode.leftChild = address(0);
        rootNode.rightChild = address(0);
        rootNode.referrer = address(0);
        rootNode.leftVolume = 0;
        rootNode.rightVolume = 0;
        rootNode.directRefCount = 0;
        rootNode.exists = true;
        rootNode.placementSide = BinaryTree.Side.None;

        // Generate referral code for root
        string memory code = _generateUniqueReferralCode(root);
        referralCodeToAddress[code] = root;
        addressToReferralCode[root] = code;

        allUsers.push(root);
        totalUsers = 1;

        emit UserRegistered(root, address(0), 0);
    }

    // ============================================================
    //                    Admin Functions
    // ============================================================

    /**
     * @notice Sets the ReferralNFT contract address for auto-minting on registration.
     * @dev Only admin can call this. Once set, each newly registered user will
     *      automatically receive a ReferralNFT. Uses try/catch for graceful
     *      degradation — if the NFT mint fails, registration still succeeds.
     * @param _referralNFT The ReferralNFT contract address (set to address(0) to disable).
     */
    function setReferralNFT(address _referralNFT) external onlyAdmin {
        referralNFT = _referralNFT;
    }

    // ============================================================
    //                    State-Changing Functions
    // ============================================================

    /**
     * @notice Registers a new user in the MLM network under the specified referrer.
     * @dev The new user is auto-placed in the binary tree using BFS (first available
     *      position under the referrer's subtree). A unique 8-character alphanumeric
     *      referral code is auto-generated. The direct referral is tracked separately
     *      from the binary placement (due to spillover).
     *
     *      Reverts if:
     *      - Caller is already registered
     *      - Referrer is not registered
     *      - Referral code collision occurs (extremely unlikely)
     *
     * @param referrer The address of the referring user.
     * @return positionId The unique position identifier (index in allUsers array).
     */
    function register(address referrer) external nonReentrant whenNotPaused returns (uint256 positionId) {
        require(!nodes[msg.sender].exists, "MLMNetwork: already registered");
        require(nodes[referrer].exists, "MLMNetwork: referrer not registered");
        require(msg.sender != address(0), "MLMNetwork: zero address");

        // Find available binary position via BFS under the referrer
        (address binaryParent, BinaryTree.Side side) = BinaryTree.findAvailablePosition(nodes, referrer);

        // Insert node into binary tree
        BinaryTree.insertNode(nodes, msg.sender, referrer, binaryParent, side);

        // Track direct referral (unilevel chain, independent of binary placement)
        _directReferrals[referrer].push(msg.sender);

        // Generate and assign unique referral code
        string memory code = _generateUniqueReferralCode(msg.sender);
        referralCodeToAddress[code] = msg.sender;
        addressToReferralCode[msg.sender] = code;

        // Track user in enumeration
        positionId = allUsers.length;
        allUsers.push(msg.sender);
        totalUsers++;

        emit UserRegistered(msg.sender, referrer, positionId);

        // Auto-mint ReferralNFT for the newly registered user
        // Uses try/catch for graceful degradation — if the NFT contract is not set
        // or the mint fails, registration still succeeds
        if (referralNFT != address(0)) {
            // solhint-disable-next-line avoid-low-level-calls
            (bool success,) = referralNFT.call(
                abi.encodeWithSignature("mint(address)", msg.sender)
            );
            // Intentionally ignore success — NFT mint is optional, not critical
            success; // Suppress unused variable warning
        }
    }

    /**
     * @notice Updates binary tree volumes when a user stakes.
     * @dev Called by the StakingPool contract (operator) when someone stakes.
     *      Propagates the volume up the binary tree from the user to the root,
     *      incrementing leftVolume or rightVolume at each ancestor based on
     *      which side the child occupies.
     *
     *      Only authorized operators can call this function.
     *
     * @param user   The address of the user whose stake triggered the volume update.
     * @param amount The stake amount to add to ancestor volumes.
     */
    function updateBinaryVolumes(address user, uint256 amount) external onlyOperator nonReentrant whenNotPaused {
        require(nodes[user].exists, "MLMNetwork: user not registered");
        require(amount > 0, "MLMNetwork: zero amount");

        BinaryTree.updateVolumesUp(nodes, user, amount);

        // Emit event for the triggering user with their current volumes
        // Note: The user's own leftVolume/rightVolume are not changed by this call;
        // only their ancestors' volumes are updated. This event signals that a
        // volume update occurred in the user's subtree.
        emit VolumesUpdated(user, nodes[user].leftVolume, nodes[user].rightVolume);
    }

    /**
     * @notice Sets a user's left and right volumes directly (for flushing after binary claims).
     * @dev Called by the BinaryDistributor (operator) after a binary bonus claim.
     *      Computes the volume delta and propagates the reduction up the tree to
     *      keep ancestor volumes consistent.
     *
     *      SECURITY: Only operators can call this. The delta propagation ensures
     *      that ancestor volumes remain accurate after flushing.
     *
     * @param user    The address whose volumes to set.
     * @param leftVol The new left-leg volume.
     * @param rightVol The new right-leg volume.
     */
    function setUserVolumes(address user, uint256 leftVol, uint256 rightVol) external onlyOperator {
        require(nodes[user].exists, "MLMNetwork: user not registered");

        uint256 oldTotal = nodes[user].leftVolume + nodes[user].rightVolume;
        uint256 newTotal = leftVol + rightVol;

        // Propagate reduction up the tree if volumes decreased
        if (oldTotal > newTotal) {
            _reduceVolumesUp(user, oldTotal - newTotal);
        }

        nodes[user].leftVolume = leftVol;
        nodes[user].rightVolume = rightVol;

        emit VolumesUpdated(user, leftVol, rightVol);
    }

    // ============================================================
    //                       View Functions
    // ============================================================

    /**
     * @notice Returns the direct referrer of the specified user.
     * @param user The address to query.
     * @return The referrer's address (address(0) for root or unregistered users).
     */
    function getReferrer(address user) external view returns (address) {
        return nodes[user].referrer;
    }

    /**
     * @notice Returns all direct referrals made by the specified user.
     * @dev Direct referrals are users who registered with this user as their referrer,
     *      independent of binary tree placement (which may differ due to spillover).
     * @param user The address to query.
     * @return An array of directly referred user addresses.
     */
    function getDirectReferrals(address user) external view returns (address[] memory) {
        return _directReferrals[user];
    }

    /**
     * @notice Returns the left child of the specified user in the binary tree.
     * @param user The address to query.
     * @return The left child's address (address(0) if none).
     */
    function getLeftChild(address user) external view returns (address) {
        return nodes[user].leftChild;
    }

    /**
     * @notice Returns the right child of the specified user in the binary tree.
     * @param user The address to query.
     * @return The right child's address (address(0) if none).
     */
    function getRightChild(address user) external view returns (address) {
        return nodes[user].rightChild;
    }

    /**
     * @notice Returns the total staking volume in the left subtree of the specified user.
     * @param user The address to query.
     * @return The cumulative left-leg volume in token units.
     */
    function getLeftVolume(address user) external view returns (uint256) {
        return nodes[user].leftVolume;
    }

    /**
     * @notice Returns the total staking volume in the right subtree of the specified user.
     * @param user The address to query.
     * @return The cumulative right-leg volume in token units.
     */
    function getRightVolume(address user) external view returns (uint256) {
        return nodes[user].rightVolume;
    }

    /**
     * @notice Returns the total number of descendants in the binary tree for a user.
     * @dev Uses iterative DFS with bounded stack. Gas-intensive for large subtrees;
     *      prefer off-chain calls for deep trees.
     * @param user The address to query.
     * @return The total network size (number of descendants).
     */
    function getNetworkSize(address user) external view returns (uint256) {
        return BinaryTree.countDescendants(nodes, user);
    }

    /**
     * @notice Returns the referral code associated with the specified user.
     * @param user The address to query.
     * @return The referral code string (empty if not registered).
     */
    function getReferralCode(address user) external view returns (string memory) {
        return addressToReferralCode[user];
    }

    /**
     * @notice Returns the user address associated with the given referral code.
     * @param code The referral code to look up.
     * @return The user address (address(0) if the code is not assigned).
     */
    function getUserByReferralCode(string calldata code) external view returns (address) {
        return referralCodeToAddress[code];
    }

    /**
     * @notice Checks whether the specified user is registered in the MLM network.
     * @param user The address to check.
     * @return True if the user is registered, false otherwise.
     */
    function isRegistered(address user) external view returns (bool) {
        return nodes[user].exists;
    }

    // ============================================================
    //                     Internal Helpers
    // ============================================================

    /**
     * @dev Generates a unique 8-character alphanumeric referral code.
     *      Uses keccak256 hash of user address, timestamp, total user count,
     *      and attempt counter to ensure uniqueness. Retries up to 10 times
     *      on collision (astronomically unlikely with 36^8 ≈ 2.8T possibilities).
     *
     * @param user The user address to generate a code for.
     * @return code The unique 8-character referral code.
     */
    function _generateUniqueReferralCode(address user) internal view returns (string memory) {
        bytes memory alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

        for (uint256 attempt = 0; attempt < 10; attempt++) {
            bytes32 hash = keccak256(abi.encodePacked(user, block.timestamp, totalUsers, attempt));
            bytes memory code = new bytes(8);
            for (uint256 i = 0; i < 8; i++) {
                code[i] = alphabet[uint8(hash[i]) % 36];
            }
            string memory codeStr = string(code);
            if (referralCodeToAddress[codeStr] == address(0)) {
                return codeStr;
            }
        }
        revert("MLMNetwork: failed to generate unique code");
    }

    /**
     * @dev Propagates a volume reduction up the binary tree from a user to the root.
     *      This is the inverse of `BinaryTree.updateVolumesUp` — it subtracts
     *      `amount` from each ancestor's leftVolume or rightVolume based on the
     *      child's placement side.
     *
     *      Called internally by `setUserVolumes` when volumes decrease (e.g., after
     *      binary bonus claim flushing).
     *
     *      Safety: Underflow is prevented because the reduction amount is computed
     *      as the exact difference between old and new total volumes.
     *
     * @param user   The starting user address.
     * @param amount The volume reduction to propagate up the tree.
     */
    function _reduceVolumesUp(address user, uint256 amount) internal {
        address current = user;

        while (current != address(0)) {
            BinaryTree.Node storage currentNode = nodes[current];
            address parentAddr = currentNode.parent;

            // Reached the root — stop
            if (parentAddr == address(0)) {
                break;
            }

            // Reduce the parent's volume on the appropriate side
            BinaryTree.Node storage parentNode = nodes[parentAddr];

            if (currentNode.placementSide == BinaryTree.Side.Left) {
                parentNode.leftVolume -= amount;
            } else if (currentNode.placementSide == BinaryTree.Side.Right) {
                parentNode.rightVolume -= amount;
            }

            // Move up to the parent
            current = parentAddr;
        }
    }
}
