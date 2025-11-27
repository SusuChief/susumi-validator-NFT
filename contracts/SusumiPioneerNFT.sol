// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title SusumiPioneerNFT
 * @dev ERC-1155 contract for Susumi Rank NFTs (Pioneer Series)
 * Token IDs: 5001 (Commander/GC5), 10001 (Counsellor/RC10), 12001 (Chancellor/RC12)
 * This contract stores rank metadata and enforces max supply limits
 */
contract SusumiPioneerNFT is ERC1155, ERC1155Supply, ERC2981, AccessControl, Pausable {
    using Strings for uint256;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Token IDs for each rank tier
    uint256 public constant COMMANDER_TOKEN_ID = 5001;
    uint256 public constant COUNSELLOR_TOKEN_ID = 10001;
    uint256 public constant CHANCELLOR_TOKEN_ID = 12001;

    // Max supply limits per tier
    uint256 public constant COMMANDER_MAX_SUPPLY = 4500;
    uint256 public constant COUNSELLOR_MAX_SUPPLY = 400;
    uint256 public constant CHANCELLOR_MAX_SUPPLY = 100;

    /**
     * @dev Rank configuration structure
     * @param seriesCode Rank code (GC5, RC10, RC12)
     * @param rankTitle Human-readable rank name
     * @param veTier veNFT tier level (1 or 2)
     * @param fundAccess Fund access level (1=Basic, 2=Enterprise, 3=Community)
     * @param isValidator Whether this rank has validator privileges
     * @param l1Share Royalty share for L1 (basis points)
     * @param l2Share Royalty share for L2 (basis points)
     * @param l3Share Royalty share for L3 (basis points)
     */
    struct RankConfig {
        string seriesCode;
        string rankTitle;
        uint8 veTier;
        uint8 fundAccess;
        bool isValidator;
        uint16 l1Share;
        uint16 l2Share;
        uint16 l3Share;
    }

    mapping(uint256 => RankConfig) private _rankConfigs;
    string private _baseURI;

    error InvalidTokenId();
    error ExceedsMaxSupply();
    error InvalidConfig();

    event RankConfigUpdated(uint256 indexed tokenId, RankConfig config);
    event BaseURIUpdated(string newBaseURI);

    /**
     * @dev Constructor initializes the contract with admin roles and default royalty
     * @param defaultAdmin Address that will have admin privileges
     * @param treasury Address that receives royalty payments (5% default)
     * @param baseURI_ Base URI for token metadata
     */
    constructor(
        address defaultAdmin,
        address treasury,
        string memory baseURI_
    ) ERC1155("") {
        if (defaultAdmin == address(0) || treasury == address(0)) revert InvalidConfig();
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(ADMIN_ROLE, defaultAdmin);
        _setDefaultRoyalty(treasury, 500); // 5% royalty (500 basis points)
        _baseURI = baseURI_;
        _initializeRankConfigs();
    }

    /**
     * @dev Initialize rank configurations for all three tiers
     * Sets up metadata for Commander, Counsellor, and Chancellor ranks
     */
    function _initializeRankConfigs() internal {
        _rankConfigs[COMMANDER_TOKEN_ID] = RankConfig({
            seriesCode: "GC5",
            rankTitle: "Commander",
            veTier: 1,
            fundAccess: 2,
            isValidator: true,
            l1Share: 0,
            l2Share: 0,
            l3Share: 0
        });

        _rankConfigs[COUNSELLOR_TOKEN_ID] = RankConfig({
            seriesCode: "RC10",
            rankTitle: "Counsellor",
            veTier: 2,
            fundAccess: 3,
            isValidator: true,
            l1Share: 0,
            l2Share: 0,
            l3Share: 0
        });

        _rankConfigs[CHANCELLOR_TOKEN_ID] = RankConfig({
            seriesCode: "RC12",
            rankTitle: "Chancellor",
            veTier: 2,
            fundAccess: 3,
            isValidator: true,
            l1Share: 0,
            l2Share: 0,
            l3Share: 0
        });
    }

    /**
     * @dev Mint NFTs (only callable by Launchpad contract with MINTER_ROLE)
     * @param to Address to mint tokens to
     * @param id Token ID (must be valid rank token ID)
     * @param amount Number of tokens to mint
     */
    function mint(
        address to,
        uint256 id,
        uint256 amount
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (!_isValidTokenId(id)) revert InvalidTokenId();
        uint256 currentSupply = totalSupply(id);
        uint256 maxSupply = getMaxSupply(id);
        if (currentSupply + amount > maxSupply) revert ExceedsMaxSupply();
        _mint(to, id, amount, "");
    }

    /**
     * @dev Batch mint NFTs for multiple token IDs
     * @param to Address to mint tokens to
     * @param ids Array of token IDs to mint
     * @param amounts Array of amounts corresponding to each token ID
     */
    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        uint256 length = ids.length;
        if (length != amounts.length) revert InvalidConfig();
        
        for (uint256 i = 0; i < length;) {
            uint256 id = ids[i];
            if (!_isValidTokenId(id)) revert InvalidTokenId();
            uint256 currentSupply = totalSupply(id);
            uint256 maxSupply = getMaxSupply(id);
            if (currentSupply + amounts[i] > maxSupply) revert ExceedsMaxSupply();
            unchecked { ++i; }
        }

        _mintBatch(to, ids, amounts, "");
    }

    /**
     * @dev Get max supply for a token ID
     * @param id Token ID
     * @return Max supply for the given token ID
     */
    function getMaxSupply(uint256 id) public pure returns (uint256) {
        if (id == COMMANDER_TOKEN_ID) return COMMANDER_MAX_SUPPLY;
        if (id == COUNSELLOR_TOKEN_ID) return COUNSELLOR_MAX_SUPPLY;
        if (id == CHANCELLOR_TOKEN_ID) return CHANCELLOR_MAX_SUPPLY;
        revert InvalidTokenId();
    }

    /**
     * @dev Get series code for a token ID (e.g., "GC5", "RC10", "RC12")
     * @param id Token ID
     * @return Series code string
     */
    function getSeriesCode(uint256 id) external view returns (string memory) {
        if (_rankConfigs[id].veTier == 0) revert InvalidTokenId();
        return _rankConfigs[id].seriesCode;
    }

    /**
     * @dev Get rank title for a token ID
     * @param id Token ID
     * @return Rank title string
     */
    function getRankTitle(uint256 id) external view returns (string memory) {
        if (_rankConfigs[id].veTier == 0) revert InvalidTokenId();
        return _rankConfigs[id].rankTitle;
    }

    /**
     * @dev Get veNFT tier for a token ID
     * @param id Token ID
     * @return veTier (1 or 2)
     */
    function getVETier(uint256 id) external view returns (uint8) {
        if (_rankConfigs[id].veTier == 0) revert InvalidTokenId();
        return _rankConfigs[id].veTier;
    }

    /**
     * @dev Get fund access level for a token ID
     * @param id Token ID
     * @return fundAccess (1=Basic, 2=Enterprise, 3=Community)
     */
    function getFundAccess(uint256 id) external view returns (uint8) {
        if (_rankConfigs[id].veTier == 0) revert InvalidTokenId();
        return _rankConfigs[id].fundAccess;
    }

    /**
     * @dev Check if token ID is a validator rank
     * @param id Token ID
     * @return true if validator rank, false otherwise
     */
    function isValidatorRank(uint256 id) external view returns (bool) {
        if (_rankConfigs[id].veTier == 0) revert InvalidTokenId();
        return _rankConfigs[id].isValidator;
    }

    /**
     * @dev Get royalty shares for a token ID
     * @param id Token ID
     * @return l1 L1 royalty share
     * @return l2 L2 royalty share
     * @return l3 L3 royalty share
     */
    function getRoyaltyShares(uint256 id) external view returns (uint16 l1, uint16 l2, uint16 l3) {
        if (_rankConfigs[id].veTier == 0) revert InvalidTokenId();
        RankConfig memory config = _rankConfigs[id];
        return (config.l1Share, config.l2Share, config.l3Share);
    }

    /**
     * @dev Get full rank configuration for a token ID
     * @param id Token ID
     * @return Complete RankConfig struct
     */
    function getRankConfig(uint256 id) external view returns (RankConfig memory) {
        if (_rankConfigs[id].veTier == 0) revert InvalidTokenId();
        return _rankConfigs[id];
    }

    /**
     * @dev Update rank configuration (admin only)
     * @param id Token ID
     * @param config New rank configuration
     */
    function updateRankConfig(uint256 id, RankConfig calldata config) external onlyRole(ADMIN_ROLE) {
        if (!_isValidTokenId(id)) revert InvalidTokenId();
        _rankConfigs[id] = config;
        emit RankConfigUpdated(id, config);
    }

    /**
     * @dev Set base URI for metadata (admin only)
     * @param baseURI_ New base URI string
     */
    function setBaseURI(string memory baseURI_) external onlyRole(ADMIN_ROLE) {
        _baseURI = baseURI_;
        emit BaseURIUpdated(baseURI_);
    }

    /**
     * @dev Override URI function to return token-specific URI
     * @param id Token ID
     * @return Complete URI string for the token metadata
     */
    function uri(uint256 id) public view override returns (string memory) {
        return string(abi.encodePacked(_baseURI, id.toString(), ".json"));
    }

    /**
     * @dev Pause contract (emergency stop) - admin only
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause contract - admin only
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Set default royalty for all tokens (admin only)
     * @param receiver Address to receive royalties
     * @param feeNumerator Royalty fee in basis points (e.g., 500 = 5%)
     */
    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyRole(ADMIN_ROLE) {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    /**
     * @dev Set token-specific royalty (admin only)
     * @param tokenId Token ID
     * @param receiver Address to receive royalties
     * @param feeNumerator Royalty fee in basis points
     */
    function setTokenRoyalty(
        uint256 tokenId,
        address receiver,
        uint96 feeNumerator
    ) external onlyRole(ADMIN_ROLE) {
        _setTokenRoyalty(tokenId, receiver, feeNumerator);
    }

    /**
     * @dev Internal helper to validate token ID
     * @param id Token ID to validate
     * @return true if valid, false otherwise
     */
    function _isValidTokenId(uint256 id) private pure returns (bool) {
        return id == COMMANDER_TOKEN_ID || id == COUNSELLOR_TOKEN_ID || id == CHANCELLOR_TOKEN_ID;
    }

    /**
     * @dev Override _update to enforce pausable state
     */
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override(ERC1155, ERC1155Supply) whenNotPaused {
        super._update(from, to, ids, values);
    }

    /**
     * @dev Override supportsInterface for ERC1155, ERC2981, and AccessControl
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC1155, ERC2981, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
