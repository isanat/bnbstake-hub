// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IMLMNetwork.sol";
import "./AccessControl.sol";

/**
 * @title ReferralNFT
 * @notice Soulbound ERC-721 NFT representing a user's position in the StakeBNB MLM network.
 * @dev Each registered MLM user receives a unique, non-transferable NFT with their referral
 *      code and registration timestamp stored on-chain. The NFT is "soulbound" — it cannot
 *      be transferred or approved, as it represents the user's identity in the network.
 *
 *      Minimal ERC-721 implementation (no OpenZeppelin dependency):
 *      - balanceOf, ownerOf, tokenURI, name, symbol
 *      - approve, transferFrom, safeTransferFrom → REVERT (soulbound)
 *      - getApproved → address(0), isApprovedForAll → false
 *      - Transfer and Approval events for ERC-721 compliance
 *
 *      MINT FLOW:
 *      - Only authorized operators (MLMNetwork contract) can mint
 *      - One NFT per registered MLM user (enforced on mint)
 *      - Auto-minted when a user registers in the MLM network
 *      - Referral code is fetched from MLMNetwork at mint time
 *
 *      SECURITY MODEL:
 *      - Only operators can mint (MLMNetwork, admin)
 *      - Soulbound: all transfer/approval functions permanently revert
 *      - Admin can update base URI for off-chain metadata resolution
 *      - Token URI falls back to on-chain JSON if no base URI is set
 */
contract ReferralNFT is AccessControl {
    // ============================================================
    //                        State Variables
    // ============================================================

    /// @notice Reference to the MLM Network contract for referral code lookups
    IMLMNetwork public mlmNetwork;

    /// @notice Base URI for off-chain token metadata resolution
    string private _baseURI;

    /// @notice Auto-incrementing token ID counter (starts at 1; 0 is invalid)
    uint256 private _nextTokenId;

    /// @notice Mapping from token ID to owner address
    mapping(uint256 => address) private _owners;

    /// @notice Mapping from owner address to balance (always 0 or 1)
    mapping(address => uint256) private _balances;

    /// @notice Mapping from token ID to the user's referral code at mint time
    mapping(uint256 => string) private _tokenReferralCodes;

    /// @notice Mapping from token ID to the registration timestamp
    mapping(uint256 => uint256) private _tokenRegistrationTimes;

    /// @notice Mapping from user address to their assigned token ID (0 = no NFT)
    mapping(address => uint256) public userTokenId;

    /// @notice Mapping from user address to whether they have been minted an NFT
    mapping(address => bool) private _hasMinted;

    // ============================================================
    //                          Events
    // ============================================================

    /// @dev ERC-721 compliance: Emitted when a token is transferred (only on mint/burn).
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    /// @dev ERC-721 compliance: Emitted when an approval is set (never fires — soulbound).
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);

    /// @dev ERC-721 compliance: Emitted when operator approval is set (never fires — soulbound).
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    /// @notice Emitted when an NFT is minted for a user.
    event NFTMinted(address indexed user, uint256 indexed tokenId, string referralCode);

    /// @notice Emitted when an NFT is burned.
    event NFTBurned(uint256 indexed tokenId);

    /// @notice Emitted when the base URI is updated by admin.
    event BaseURIUpdated(string newBaseURI);

    // ============================================================
    //                        Constructor
    // ============================================================

    /**
     * @notice Initializes the ReferralNFT with the MLM Network contract address.
     * @param _mlmNetwork Address of the MLM Network contract for referral code lookups.
     */
    constructor(address _mlmNetwork) {
        require(_mlmNetwork != address(0), "ReferralNFT: zero mlmNetwork address");
        mlmNetwork = IMLMNetwork(_mlmNetwork);
        _nextTokenId = 1; // Token IDs start at 1 (0 = invalid/nonexistent)
    }

    // ============================================================
    //                  ERC-721 Metadata Functions
    // ============================================================

    /**
     * @notice Returns the NFT collection name.
     * @return The name string.
     */
    function name() external pure returns (string memory) {
        return "StakeBNB Referral";
    }

    /**
     * @notice Returns the NFT collection symbol.
     * @return The symbol string.
     */
    function symbol() external pure returns (string memory) {
        return "SBNB-R";
    }

    /**
     * @notice Returns the token URI for a given token ID.
     * @dev If _baseURI is set, returns _baseURI + tokenId (off-chain metadata).
     *      Otherwise, constructs on-chain JSON metadata with referral code and
     *      registration date. The JSON is returned as a data URI.
     *
     *      Reverts if the token does not exist.
     * @param tokenId The token ID to query.
     * @return The token URI string.
     */
    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_owners[tokenId] != address(0), "ReferralNFT: token does not exist");

        // If base URI is set, use off-chain metadata
        if (bytes(_baseURI).length > 0) {
            return string(abi.encodePacked(_baseURI, _toString(tokenId)));
        }

        // Fallback: construct on-chain JSON metadata
        string memory referralCode = _tokenReferralCodes[tokenId];
        uint256 regTime = _tokenRegistrationTimes[tokenId];

        return string(abi.encodePacked(
            "data:application/json;utf8,{",
            '"name":"StakeBNB Referral #', _toString(tokenId), '",',
            '"description":"Soulbound NFT representing your position in the StakeBNB MLM network",',
            '"attributes":[',
            '{"trait_type":"Referral Code","value":"', referralCode, '"},',
            '{"trait_type":"Registration Date","display_type":"date","value":', _toString(regTime), '}',
            ']',
            '}'
        ));
    }

    // ============================================================
    //                  ERC-721 View Functions
    // ============================================================

    /**
     * @notice Returns the number of NFTs owned by an address (0 or 1).
     * @dev Reverts if the owner is the zero address (ERC-721 requirement).
     * @param owner The address to query.
     * @return The balance (0 or 1).
     */
    function balanceOf(address owner) external view returns (uint256) {
        require(owner != address(0), "ReferralNFT: balance query for zero address");
        return _balances[owner];
    }

    /**
     * @notice Returns the owner of a given token ID.
     * @dev Reverts if the token does not exist.
     * @param tokenId The token ID to query.
     * @return The owner address.
     */
    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "ReferralNFT: owner query for nonexistent token");
        return owner;
    }

    /**
     * @notice Returns the approved address for a token ID (always address(0) — soulbound).
     * @dev Reverts if the token does not exist.
     * @param tokenId The token ID to query.
     * @return The approved address (always address(0)).
     */
    function getApproved(uint256 tokenId) external view returns (address) {
        require(_owners[tokenId] != address(0), "ReferralNFT: approved query for nonexistent token");
        return address(0); // Soulbound: no approvals possible
    }

    /**
     * @notice Returns whether an operator is approved for an owner (always false — soulbound).
     * @return Always false.
     */
    function isApprovedForAll(address, address) external pure returns (bool) {
        return false; // Soulbound: no operator approvals possible
    }

    // ============================================================
    //               ERC-721 Soulbound Reversions
    // ============================================================

    /**
     * @notice Transfer function — DISABLED (soulbound token).
     * @dev Reverts with a clear error message. The NFT represents the user's
     *      identity in the MLM network and cannot be transferred.
     */
    function transferFrom(address, address, uint256) external pure {
        revert("ReferralNFT: soulbound - cannot transfer");
    }

    /**
     * @notice Safe transfer function — DISABLED (soulbound token).
     * @dev Reverts with a clear error message.
     */
    function safeTransferFrom(address, address, uint256) external pure {
        revert("ReferralNFT: soulbound - cannot transfer");
    }

    /**
     * @notice Safe transfer with data function — DISABLED (soulbound token).
     * @dev Reverts with a clear error message.
     */
    function safeTransferFrom(address, address, uint256, bytes calldata) external pure {
        revert("ReferralNFT: soulbound - cannot transfer");
    }

    /**
     * @notice Approve function — DISABLED (soulbound token).
     * @dev Reverts with a clear error message. No approvals are possible.
     */
    function approve(address, uint256) external pure {
        revert("ReferralNFT: soulbound - cannot approve");
    }

    /**
     * @notice Set approval for all function — DISABLED (soulbound token).
     * @dev Reverts with a clear error message. No operator approvals are possible.
     */
    function setApprovalForAll(address, bool) external pure {
        revert("ReferralNFT: soulbound - cannot approve");
    }

    // ============================================================
    //                       Mint Function
    // ============================================================

    /**
     * @notice Mints a new ReferralNFT for a registered MLM user.
     * @dev Only authorized operators (MLMNetwork contract) can call this.
     *      Reverts if the user already has an NFT or is not registered in MLMNetwork.
     *      Fetches the referral code from MLMNetwork and stores it on-chain.
     *      Emits a Transfer event from address(0) to the user (ERC-721 compliance).
     *
     *      SECURITY: One NFT per user is enforced by the _hasMinted mapping.
     *      The caller must be an operator or admin.
     *
     * @param user The address of the registered MLM user.
     * @return tokenId The ID of the newly minted NFT.
     */
    function mint(address user) external onlyOperator whenNotPaused returns (uint256 tokenId) {
        require(user != address(0), "ReferralNFT: cannot mint to zero address");
        require(!_hasMinted[user], "ReferralNFT: user already has NFT");
        require(mlmNetwork.isRegistered(user), "ReferralNFT: user not registered in MLM");

        tokenId = _nextTokenId;
        unchecked { ++_nextTokenId; }

        // Store ownership and balance
        _owners[tokenId] = user;
        _balances[user] = 1;

        // Store referral code and registration time
        _tokenReferralCodes[tokenId] = mlmNetwork.getReferralCode(user);
        _tokenRegistrationTimes[tokenId] = block.timestamp;

        // Map user → tokenId
        userTokenId[user] = tokenId;
        _hasMinted[user] = true;

        // ERC-721 compliance: emit Transfer from zero address (mint)
        emit Transfer(address(0), user, tokenId);
        emit NFTMinted(user, tokenId, _tokenReferralCodes[tokenId]);
    }

    // ============================================================
    //                       Burn Function
    // ============================================================

    /**
     * @dev Burns a token, clearing all associated state.
     *      Emits a Transfer event from the owner to address(0) (ERC-721 compliance).
     *      Only callable internally (e.g., by admin-triggered logic).
     * @param tokenId The token ID to burn.
     */
    function _burn(uint256 tokenId) internal {
        address owner = _owners[tokenId];
        require(owner != address(0), "ReferralNFT: cannot burn nonexistent token");

        // Clear state
        _balances[owner] = 0;
        _owners[tokenId] = address(0);
        userTokenId[owner] = 0;
        _hasMinted[owner] = false;

        // Note: referral code and registration time are not cleared (gas optimization;
        // they remain readable for historical queries but the token no longer exists)

        // ERC-721 compliance: emit Transfer to zero address (burn)
        emit Transfer(owner, address(0), tokenId);
        emit NFTBurned(tokenId);
    }

    // ============================================================
    //                     Admin Functions
    // ============================================================

    /**
     * @notice Updates the base URI for off-chain token metadata resolution.
     * @dev Only admin can call this. If set, tokenURI returns baseURI + tokenId.
     *      Set to empty string to revert to on-chain JSON metadata.
     * @param newBaseURI The new base URI (e.g., "https://api.stakebnb.com/nft/").
     */
    function updateBaseURI(string memory newBaseURI) external onlyAdmin {
        _baseURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    /**
     * @notice Updates the MLM Network contract reference.
     * @dev Only admin can call this. Useful if the MLM Network is migrated.
     * @param _mlmNetwork The new MLM Network contract address.
     */
    function setMLMNetwork(address _mlmNetwork) external onlyAdmin {
        require(_mlmNetwork != address(0), "ReferralNFT: zero address");
        mlmNetwork = IMLMNetwork(_mlmNetwork);
    }

    /**
     * @notice Burns a specific NFT (admin only, for compliance or cleanup).
     * @dev Only admin can burn tokens. This is a privileged operation.
     * @param tokenId The token ID to burn.
     */
    function burn(uint256 tokenId) external onlyAdmin {
        _burn(tokenId);
    }

    // ============================================================
    //                      View Helpers
    // ============================================================

    /**
     * @notice Returns the token ID owned by a user.
     * @dev Returns 0 if the user does not have an NFT.
     * @param user The address to query.
     * @return The token ID (0 = no NFT).
     */
    function getTokenId(address user) external view returns (uint256) {
        return userTokenId[user];
    }

    /**
     * @notice Returns the referral code associated with a token.
     * @dev Reverts if the token does not exist.
     * @param tokenId The token ID to query.
     * @return The referral code string.
     */
    function getReferralCode(uint256 tokenId) external view returns (string memory) {
        require(_owners[tokenId] != address(0), "ReferralNFT: token does not exist");
        return _tokenReferralCodes[tokenId];
    }

    /**
     * @notice Returns the registration timestamp associated with a token.
     * @dev Reverts if the token does not exist.
     * @param tokenId The token ID to query.
     * @return The registration timestamp (Unix epoch).
     */
    function getRegistrationTime(uint256 tokenId) external view returns (uint256) {
        require(_owners[tokenId] != address(0), "ReferralNFT: token does not exist");
        return _tokenRegistrationTimes[tokenId];
    }

    /**
     * @notice Checks whether a user has been minted a ReferralNFT.
     * @param user The address to check.
     * @return True if the user has an NFT, false otherwise.
     */
    function hasNFT(address user) external view returns (bool) {
        return _hasMinted[user];
    }

    /**
     * @notice Returns the total number of NFTs minted (including burned ones).
     * @dev Equal to _nextTokenId - 1 since IDs start at 1.
     * @return The total minted count.
     */
    function totalMinted() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    /**
     * @notice Returns the current base URI for metadata resolution.
     * @dev Admin-only view for verifying the base URI setting.
     * @return The base URI string.
     */
    function baseURI() external view onlyAdmin returns (string memory) {
        return _baseURI;
    }

    // ============================================================
    //                    Internal Helpers
    // ============================================================

    /**
     * @dev Converts a uint256 value to its decimal string representation.
     *      Standard implementation used by OpenZeppelin's Strings library.
     * @param value The uint256 value to convert.
     * @return The decimal string representation.
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";

        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }

        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }

        return string(buffer);
    }
}
