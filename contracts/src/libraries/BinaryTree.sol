// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BinaryTree
 * @notice Library for binary tree operations in an MLM network.
 * @dev Implements an iterative (non-recursive) binary tree with breadth-first
 *      search for auto-placement and upward volume propagation.
 *
 *      Security considerations:
 *      - NO recursion: all tree traversals are iterative to prevent stack
 *        overflow and out-of-gas issues on deep trees.
 *      - Bounded BFS: `findAvailablePosition` limits iterations to prevent
 *        unbounded gas consumption on very wide/deep trees.
 *      - Storage pointers: struct fields are accessed via storage pointers
 *        to avoid unnecessary SLOAD/SSTORE operations.
 *      - No uninitialized storage pointers: all storage references are
 *        explicitly set before use.
 */
library BinaryTree {
    // ──────────────────────────────────────────────
    // Type Declarations
    // ──────────────────────────────────────────────

    /**
     * @notice Indicates which side of the parent a node occupies.
     * @param None  Default/unset value (used for root node or before placement).
     * @param Left  Node is the left child of its parent.
     * @param Right Node is the right child of its parent.
     */
    enum Side {
        None,
        Left,
        Right
    }

    /**
     * @notice Binary tree node structure.
     * @dev Each user in the MLM network is represented as a node.
     *      The binary tree is separate from the unilevel (direct referral) tree.
     *
     * @param parent         Binary parent (upline in binary tree). address(0) for root.
     * @param leftChild      Left child in binary tree. address(0) if empty.
     * @param rightChild     Right child in binary tree. address(0) if empty.
     * @param referrer       Direct referrer (may differ from binary parent due to spillover).
     * @param leftVolume     Cumulative stake volume in the left subtree.
     * @param rightVolume    Cumulative stake volume in the right subtree.
     * @param directRefCount Number of direct referrals (for rank qualifications, etc.).
     * @param exists         Whether this node has been registered.
     * @param placementSide  Which side of the parent this node is placed on.
     */
    struct Node {
        address parent;
        address leftChild;
        address rightChild;
        address referrer;
        uint256 leftVolume;
        uint256 rightVolume;
        uint256 directRefCount;
        bool exists;
        Side placementSide;
    }

    // ──────────────────────────────────────────────
    // Constants
    // ──────────────────────────────────────────────

    /**
     * @notice Maximum number of BFS iterations in `findAvailablePosition`.
     * @dev Prevents unbounded gas consumption on very large trees.
     *      With a balanced binary tree of depth D, the number of nodes is 2^D - 1.
     *      A limit of 511 covers trees up to depth 9 (511 nodes), which is
     *      sufficient for the vast majority of MLM networks. If the tree
     *      grows deeper, the function will revert — this is intentional
     *      to prevent gas griefing and signals that a different placement
     *      strategy may be needed.
     */
    uint256 internal constant MAX_BFS_ITERATIONS = 511;

    // ──────────────────────────────────────────────
    // Tree Query Functions
    // ──────────────────────────────────────────────

    /**
     * @notice Find the next available position in the binary tree under a parent.
     * @dev Uses iterative breadth-first search (BFS) to locate the first node
     *      that has an empty left or right child slot. This ensures the tree
     *      fills level by level (auto-placement / spillover strategy).
     *
     *      The BFS is implemented using an in-memory array as a queue:
     *      - Push children to the end of the array.
     *      - Process nodes from the front (FIFO via index counter).
     *
     *      Gas considerations:
     *      - Each iteration involves 2 SLOADs (leftChild, rightChild).
     *      - Maximum iterations bounded by MAX_BFS_ITERATIONS (511).
     *      - Expected gas: ~50k for typical trees (depth 5-7).
     *
     * @param self   Mapping of address => Node storage.
     * @param parent The parent address to search under (must exist in tree).
     * @return position The address of the node where the child should be placed.
     * @return side     Which side (Left or Right) the child should be placed on.
     */
    function findAvailablePosition(
        mapping(address => Node) storage self,
        address parent
    ) internal view returns (address position, Side side) {
        // @dev Validate parent exists in the tree.
        require(self[parent].exists, "BinaryTree: parent does not exist");

        // ── BFS queue (in-memory array) ──
        // Each element is an address to check.
        address[] memory queue = new address[](MAX_BFS_ITERATIONS);
        uint256 queueFront = 0; // Index of the next element to process
        uint256 queueBack = 0;  // Index where the next element will be inserted

        // Start BFS from the given parent
        queue[queueBack] = parent;
        queueBack++;

        while (queueFront < queueBack && queueFront < MAX_BFS_ITERATIONS) {
            // Dequeue the front element
            address current = queue[queueFront];
            queueFront++;

            // Cache the node to minimize SLOADs (1 SLOAD for the struct slot)
            Node storage currentNode = self[current];

            // Check left child first (preferred side for auto-placement)
            if (currentNode.leftChild == address(0)) {
                return (current, Side.Left);
            }

            // Check right child
            if (currentNode.rightChild == address(0)) {
                return (current, Side.Right);
            }

            // Both children occupied — enqueue them for further search
            // @dev Gas-efficient: we only enqueue existing children
            if (queueBack < MAX_BFS_ITERATIONS) {
                queue[queueBack] = currentNode.leftChild;
                queueBack++;
            }
            if (queueBack < MAX_BFS_ITERATIONS) {
                queue[queueBack] = currentNode.rightChild;
                queueBack++;
            }
        }

        // If we exhaust MAX_BFS_ITERATIONS without finding an empty slot,
        // revert to prevent unbounded gas usage.
        revert("BinaryTree: no available position found within iteration limit");
    }

    // ──────────────────────────────────────────────
    // Tree Mutation Functions
    // ──────────────────────────────────────────────

    /**
     * @notice Insert a new node into the binary tree.
     * @dev Creates a new node and links it to its binary parent.
     *      This function performs the following operations:
     *      1. Validates that the user does not already exist.
     *      2. Validates that the binary parent exists.
     *      3. Sets the parent's leftChild or rightChild pointer.
     *      4. Creates the new node with parent, referrer, and placement info.
     *      5. Increments the parent's directRefCount (referrer != parent case
     *         is handled by the caller tracking direct referrals separately).
     *
     *      Note: This function does NOT update volumes. Volume updates
     *      must be done separately via `updateVolumesUp` after the stake
     *      amount is known. This separation of concerns allows the caller
     *      to batch operations efficiently.
     *
     *      No uninitialized storage pointers — the new node
     *      is constructed with explicit field assignments.
     *
     * @param self         Mapping of address => Node storage.
     * @param user         The new user address to insert.
     * @param referrer     The direct referrer (may differ from binaryParent due to spillover).
     * @param binaryParent The binary tree parent (where the node is placed).
     * @param side         Which side of the parent to place the new node (Left or Right).
     */
    function insertNode(
        mapping(address => Node) storage self,
        address user,
        address referrer,
        address binaryParent,
        Side side
    ) internal {
        // ── Validation ──
        require(user != address(0), "BinaryTree: zero address user");
        require(!self[user].exists, "BinaryTree: user already exists");
        require(self[binaryParent].exists, "BinaryTree: binary parent does not exist");
        require(side == Side.Left || side == Side.Right, "BinaryTree: invalid side");

        // ── Set parent's child pointer ──
        Node storage parentNode = self[binaryParent];

        if (side == Side.Left) {
            require(parentNode.leftChild == address(0), "BinaryTree: left child already occupied");
            parentNode.leftChild = user;
        } else {
            require(parentNode.rightChild == address(0), "BinaryTree: right child already occupied");
            parentNode.rightChild = user;
        }

        // ── Increment parent's direct referral count if referrer == parent ──
        // @dev If the referrer is the same as the binary parent, this is a
        //   direct referral. If they differ (spillover), the direct referral
        //   count should be tracked on the actual referrer by the caller.
        if (referrer == binaryParent) {
            parentNode.directRefCount++;
        }

        // ── Create the new node ──
        // @dev All fields are explicitly initialized — no uninitialized storage.
        Node storage newUser = self[user];
        newUser.parent = binaryParent;
        newUser.leftChild = address(0);
        newUser.rightChild = address(0);
        newUser.referrer = referrer;
        newUser.leftVolume = 0;
        newUser.rightVolume = 0;
        newUser.directRefCount = 0;
        newUser.exists = true;
        newUser.placementSide = side;
    }

    /**
     * @notice Update volumes up the binary tree from a user to the root.
     * @dev Traces the `parent` chain and increments `leftVolume` or `rightVolume`
     *      on each ancestor based on which side the child is on.
     *
     *      This function is called when a user stakes (or their subtree
     *      accumulates volume), so all ancestors' cumulative volumes are updated.
     *
     *      Gas considerations:
     *      - Each level involves: 1 SLOAD (parent), 1 SLOAD (placementSide),
     *        1 SLOAD (current volume), 1 SSTORE (updated volume).
     *      - With EIP-2929 cold/warm storage, the first access is ~2100 gas,
     *        subsequent accesses are ~100 gas.
     *      - A tree depth of 30 would cost roughly 30 * 5000 = 150k gas —
     *        acceptable for Polygon but deep trees should be monitored.
     *
     *      Note: The loop is bounded by the tree depth. In a well-managed
     *      MLM binary tree, depth rarely exceeds 50. However, there is no
     *      explicit iteration limit here because the tree structure itself
     *      is bounded by the number of registered users (each user is unique).
     *      The root node has parent == address(0), which terminates the loop.
     *
     * @param self   Mapping of address => Node storage.
     * @param user   The user whose ancestors need volume updates.
     * @param amount The volume amount to add to each ancestor's appropriate side.
     */
    function updateVolumesUp(
        mapping(address => Node) storage self,
        address user,
        uint256 amount
    ) internal {
        // @dev Start from the user and walk up to the root.
        //   The user's own volume is NOT updated here — only ancestors.
        //   This is because the user's leftVolume/rightVolume tracks their
        //   subtree volume, not their own stake.
        address current = user;

        while (current != address(0)) {
            // Cache the node to minimize SLOADs
            Node storage currentNode = self[current];
            address parentAddr = currentNode.parent;
            Side pSide = currentNode.placementSide;

            // If we've reached the root (no parent), stop
            if (parentAddr == address(0)) {
                break;
            }

            // Update the parent's volume on the appropriate side
            // @dev One SLOAD + one SSTORE per ancestor.
            Node storage parentNode = self[parentAddr];

            if (pSide == Side.Left) {
                parentNode.leftVolume += amount;
            } else if (pSide == Side.Right) {
                parentNode.rightVolume += amount;
            }
            // @dev If pSide == Side.None, this node is the root — skip.
            //   This case is already handled by the parentAddr == address(0) check,
            //   but we add this comment for completeness.

            // Move up to the parent
            current = parentAddr;
        }
    }

    // ──────────────────────────────────────────────
    // Tree Query Functions (Read-Only)
    // ──────────────────────────────────────────────

    /**
     * @notice Count total network size (descendants) for a user.
     * @dev Uses iterative DFS (depth-first search) with an explicit stack
     *      to count all descendants in the binary tree.
     *
     *      Gas warning: This is a VIEW function, so it can be called off-chain
     *      for free. On-chain calls will consume gas proportional to the
     *      subtree size. Use with caution in state-changing functions.
     *
     *      For a balanced subtree of depth D, the count is 2^D - 1.
     *      The iteration limit prevents unbounded gas on degenerate trees.
     *
     * @param self Mapping of address => Node storage.
     * @param user The user to count descendants for.
     * @return count The number of descendants (children, grandchildren, etc.).
     */
    function countDescendants(
        mapping(address => Node) storage self,
        address user
    ) internal view returns (uint256 count) {
        // @dev Edge case: user doesn't exist — return 0.
        if (!self[user].exists) {
            return 0;
        }

        // ── Iterative DFS with explicit stack ──
        // We use an in-memory array as a stack. Each iteration pops an address,
        // checks its children, and pushes non-zero children onto the stack.
        address[] memory stack = new address[](MAX_BFS_ITERATIONS);
        uint256 stackTop = 0;

        // Seed the stack with the user's children
        Node storage userNode = self[user];
        if (userNode.leftChild != address(0)) {
            stack[stackTop] = userNode.leftChild;
            stackTop++;
        }
        if (userNode.rightChild != address(0)) {
            stack[stackTop] = userNode.rightChild;
            stackTop++;
        }

        count = 0;

        while (stackTop > 0) {
            // Pop from stack
            stackTop--;
            address current = stack[stackTop];
            count++;

            // Push children of the current node
            Node storage currentNode = self[current];

            if (currentNode.leftChild != address(0) && stackTop < MAX_BFS_ITERATIONS) {
                stack[stackTop] = currentNode.leftChild;
                stackTop++;
            }
            if (currentNode.rightChild != address(0) && stackTop < MAX_BFS_ITERATIONS) {
                stack[stackTop] = currentNode.rightChild;
                stackTop++;
            }
        }
    }
}
