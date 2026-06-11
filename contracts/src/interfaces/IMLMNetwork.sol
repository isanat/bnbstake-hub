// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IMLMNetwork
 * @notice Interface for the MLM binary tree network management contract.
 * @dev Manages user registration, binary tree placement, referral codes,
 *      and volume tracking for the MLM structure. Each user occupies a unique
 *      position in the binary tree with left and right child subtrees.
 *
 *      Access control:
 *      - `register` is publicly callable (self-registration).
 *      - Volume updates are restricted to authorized contracts (staking pool, distributors).
 */
interface IMLMNetwork {
    // ============================================================
    //                      State-Changing Functions
    // ============================================================

    /**
     * @notice Registers a new user in the MLM network under the specified referrer.
     * @dev Reverts if the caller is already registered or if the referrer is not registered.
     *      The new user is placed in the referrer's binary tree according to the
     *      placement algorithm (first available left or right position).
     * @param referrer The address of the referring user.
     * @return positionId The unique position identifier assigned to the new user.
     */
    function register(address referrer) external returns (uint256 positionId);

    /**
     * @notice Updates binary tree volumes when a user stakes.
     * @dev Propagates the volume up the binary tree from the user to the root,
     *      incrementing leftVolume or rightVolume at each ancestor based on
     *      which side the child occupies.
     *      Access control: restricted to authorized operators (staking pool, distributors).
     * @param user   The address of the user whose stake triggered the volume update.
     * @param amount The stake amount to add to ancestor volumes.
     */
    function updateBinaryVolumes(address user, uint256 amount) external;

    /**
     * @notice Sets a user's left and right volumes directly (for flushing after binary claims).
     * @dev Called by the BinaryDistributor after a binary bonus claim to flush volumes.
     *      Computes the volume delta and propagates the reduction up the tree.
     *      Access control: restricted to authorized operators.
     * @param user     The address whose volumes to set.
     * @param leftVol  The new left-leg volume.
     * @param rightVol The new right-leg volume.
     */
    function setUserVolumes(address user, uint256 leftVol, uint256 rightVol) external;

    // ============================================================
    //                       View Functions
    // ============================================================

    /**
     * @notice Returns the direct referrer of the specified user.
     * @param user The address to query.
     * @return The referrer's address (address(0) if the user has no referrer or is not registered).
     */
    function getReferrer(address user) external view returns (address);

    /**
     * @notice Returns all direct referrals made by the specified user.
     * @dev These are the users who registered directly under this user (first-level only).
     * @param user The address to query.
     * @return An array of directly referred user addresses.
     */
    function getDirectReferrals(address user) external view returns (address[] memory);

    /**
     * @notice Returns the left child of the specified user in the binary tree.
     * @param user The address to query.
     * @return The left child's address (address(0) if no left child exists).
     */
    function getLeftChild(address user) external view returns (address);

    /**
     * @notice Returns the right child of the specified user in the binary tree.
     * @param user The address to query.
     * @return The right child's address (address(0) if no right child exists).
     */
    function getRightChild(address user) external view returns (address);

    /**
     * @notice Returns the total staking volume in the left subtree of the specified user.
     * @dev This volume is used to calculate binary bonuses and determine the weak/strong leg.
     * @param user The address to query.
     * @return The cumulative left-leg volume in token units.
     */
    function getLeftVolume(address user) external view returns (uint256);

    /**
     * @notice Returns the total staking volume in the right subtree of the specified user.
     * @dev This volume is used to calculate binary bonuses and determine the weak/strong leg.
     * @param user The address to query.
     * @return The cumulative right-leg volume in token units.
     */
    function getRightVolume(address user) external view returns (uint256);

    /**
     * @notice Returns the total number of users in the downline network of the specified user.
     * @dev Counts all descendants in the binary tree, not just direct referrals.
     * @param user The address to query.
     * @return The total network size.
     */
    function getNetworkSize(address user) external view returns (uint256);

    /**
     * @notice Returns the unique referral code associated with the specified user.
     * @param user The address to query.
     * @return The referral code string (empty if the user is not registered).
     */
    function getReferralCode(address user) external view returns (string memory);

    /**
     * @notice Returns the user address associated with the given referral code.
     * @param code The referral code to look up.
     * @return The user address (address(0) if the code is not assigned).
     */
    function getUserByReferralCode(string calldata code) external view returns (address);

    /**
     * @notice Checks whether the specified user is registered in the MLM network.
     * @param user The address to check.
     * @return True if the user is registered, false otherwise.
     */
    function isRegistered(address user) external view returns (bool);

    // ============================================================
    //                          Events
    // ============================================================

    /**
     * @notice Emitted when a new user registers in the MLM network.
     * @param user       The address of the newly registered user.
     * @param referrer   The address of the referrer.
     * @param positionId The unique position identifier assigned to the new user.
     */
    event UserRegistered(address indexed user, address indexed referrer, uint256 positionId);

    /**
     * @notice Emitted when the binary tree volumes are updated for a user.
     * @dev Triggered by the staking pool or binary distributor when stake amounts change.
     * @param user        The address whose volumes were updated.
     * @param leftVolume  The new cumulative left-leg volume.
     * @param rightVolume The new cumulative right-leg volume.
     */
    event VolumesUpdated(address indexed user, uint256 leftVolume, uint256 rightVolume);
}
