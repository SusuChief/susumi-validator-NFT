// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./SusumiPioneerNFT.sol";

/**
 * @title SusumiLaunchpad
 * @dev Launchpad contract for Validator NFT pre-sale with dynamic pricing and SUSU+ entitlement tracking
 * Features:
 * - 4-phase dynamic pricing per tier (price increases as supply increases)
 * - SUSU+ token entitlement tracking per user and token ID
 * - Payment in USDT/USDC (6 decimals)
 * - Per-wallet mint limits
 * - Automatic phase progression based on supply
 */
contract SusumiLaunchpad is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Token IDs matching NFT contract
    uint256 public constant COMMANDER_TOKEN_ID = 5001;
    uint256 public constant COUNSELLOR_TOKEN_ID = 10001;
    uint256 public constant CHANCELLOR_TOKEN_ID = 12001;

    // Phase thresholds for Commander (4 phases, 1,125 NFTs per phase)
    uint256 private constant COMMANDER_PHASE_1_MAX = 1125;
    uint256 private constant COMMANDER_PHASE_2_MAX = 2250;
    uint256 private constant COMMANDER_PHASE_3_MAX = 3375;
    uint256 private constant COMMANDER_PHASE_4_MAX = 4500;

    // Phase thresholds for Counsellor (4 phases, 100 NFTs per phase)
    uint256 private constant COUNSELLOR_PHASE_1_MAX = 100;
    uint256 private constant COUNSELLOR_PHASE_2_MAX = 200;
    uint256 private constant COUNSELLOR_PHASE_3_MAX = 300;
    uint256 private constant COUNSELLOR_PHASE_4_MAX = 400;

    // Phase thresholds for Chancellor (4 phases, 25 NFTs per phase)
    uint256 private constant CHANCELLOR_PHASE_1_MAX = 25;
    uint256 private constant CHANCELLOR_PHASE_2_MAX = 50;
    uint256 private constant CHANCELLOR_PHASE_3_MAX = 75;
    uint256 private constant CHANCELLOR_PHASE_4_MAX = 100;

    SusumiPioneerNFT public immutable nftContract;

    /**
     * @dev Phase configuration structure
     * @param priceUsd Price in USD scaled by 1e6 (6 decimals, e.g., 250 * 1e6 = $250)
     * @param susuPlusEntitlement SUSU+ tokens per NFT at this phase
     */
    struct PhaseConfig {
        uint256 priceUsd;
        uint256 susuPlusEntitlement;
    }

    // Payment token whitelist (USDT, USDC)
    mapping(address => bool) public acceptedPaymentTokens;
    // Dynamic pricing: [tokenId][phase] => PhaseConfig
    mapping(uint256 => mapping(uint8 => PhaseConfig)) public tierPricing;
    // Current supply per token ID
    mapping(uint256 => uint256) public supply;
    // User SUSU+ entitlement: [user][tokenId] => total entitlement
    mapping(address => mapping(uint256 => uint256)) public pioneerSUSUPlusEntitlement;
    // Current phase SUSU+ entitlement per NFT (for reference)
    mapping(uint256 => uint256) public SUSUPlusPerNFT;
    // Max NFTs per wallet per token ID
    mapping(uint256 => uint256) public maxPerWallet;
    // Wallet mint count: [user][tokenId] => count
    mapping(address => mapping(uint256 => uint256)) public walletMintCount;

    address public treasury;
    bool public saleOpen;

    error InvalidTokenId();
    error SaleNotOpen();
    error InvalidAmount();
    error PaymentTokenNotAccepted();
    error ExceedsMaxSupply();
    error ExceedsPerWalletLimit();
    error InvalidPhase();
    error InvalidTreasury();

    event NFTPurchased(
        address indexed buyer,
        uint256 indexed tokenId,
        uint256 amount,
        uint256 totalPrice,
        address paymentToken,
        uint8 phase,
        uint256 susuPlusEntitlement
    );

    event PioneerEntitlementAssigned(
        address indexed user,
        uint256 indexed tokenId,
        uint256 entitlement
    );

    event PaymentTokenUpdated(address indexed token, bool accepted);
    event TreasuryUpdated(address indexed newTreasury);
    event MaxPerWalletUpdated(uint256 indexed tokenId, uint256 newLimit);
    event SaleStatusUpdated(bool isOpen);

    /**
     * @dev Constructor initializes launchpad with NFT contract, admin, and payment tokens
     * @param nftContractAddress Address of SusumiPioneerNFT contract
     * @param defaultAdmin Address with admin privileges
     * @param treasury_ Address that receives payment proceeds
     * @param usdtAddress USDT token address (6 decimals)
     * @param usdcAddress USDC token address (6 decimals)
     */
    constructor(
        address nftContractAddress,
        address defaultAdmin,
        address treasury_,
        address usdtAddress,
        address usdcAddress
    ) {
        if (nftContractAddress == address(0) || defaultAdmin == address(0) || treasury_ == address(0)) {
            revert InvalidTreasury();
        }
        nftContract = SusumiPioneerNFT(nftContractAddress);
        treasury = treasury_;
        saleOpen = false;

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(ADMIN_ROLE, defaultAdmin);

        acceptedPaymentTokens[usdtAddress] = true;
        acceptedPaymentTokens[usdcAddress] = true;

        _initializePricing();

        // Default per-wallet limits
        maxPerWallet[COMMANDER_TOKEN_ID] = 10;
        maxPerWallet[COUNSELLOR_TOKEN_ID] = 5;
        maxPerWallet[CHANCELLOR_TOKEN_ID] = 3;
    }

    /**
     * @dev Initialize dynamic pricing for all tiers and phases
     * Prices are in USD scaled by 1e6 (6 decimals)
     * SUSU+ entitlements decrease as phases progress
     */
    function _initializePricing() internal {
        tierPricing[COMMANDER_TOKEN_ID][1] = PhaseConfig(250 * 1e6, 250000);
        tierPricing[COMMANDER_TOKEN_ID][2] = PhaseConfig(300 * 1e6, 200000);
        tierPricing[COMMANDER_TOKEN_ID][3] = PhaseConfig(350 * 1e6, 150000);
        tierPricing[COMMANDER_TOKEN_ID][4] = PhaseConfig(400 * 1e6, 100000);

        tierPricing[COUNSELLOR_TOKEN_ID][1] = PhaseConfig(750 * 1e6, 750000);
        tierPricing[COUNSELLOR_TOKEN_ID][2] = PhaseConfig(900 * 1e6, 550000);
        tierPricing[COUNSELLOR_TOKEN_ID][3] = PhaseConfig(1200 * 1e6, 350000);
        tierPricing[COUNSELLOR_TOKEN_ID][4] = PhaseConfig(1500 * 1e6, 200000);

        tierPricing[CHANCELLOR_TOKEN_ID][1] = PhaseConfig(2500 * 1e6, 2500000);
        tierPricing[CHANCELLOR_TOKEN_ID][2] = PhaseConfig(3200 * 1e6, 1900000);
        tierPricing[CHANCELLOR_TOKEN_ID][3] = PhaseConfig(4000 * 1e6, 1300000);
        tierPricing[CHANCELLOR_TOKEN_ID][4] = PhaseConfig(5000 * 1e6, 900000);
    }

    /**
     * @dev Get current phase for a token ID based on supply
     * Phase automatically progresses as supply increases
     * @param tokenId Token ID to check
     * @return Current phase (1-4)
     */
    function getCurrentPhase(uint256 tokenId) public view returns (uint8) {
        uint256 currentSupply = supply[tokenId];

        if (tokenId == COMMANDER_TOKEN_ID) {
            if (currentSupply < COMMANDER_PHASE_1_MAX) return 1;
            if (currentSupply < COMMANDER_PHASE_2_MAX) return 2;
            if (currentSupply < COMMANDER_PHASE_3_MAX) return 3;
            return 4;
        } else if (tokenId == COUNSELLOR_TOKEN_ID) {
            if (currentSupply < COUNSELLOR_PHASE_1_MAX) return 1;
            if (currentSupply < COUNSELLOR_PHASE_2_MAX) return 2;
            if (currentSupply < COUNSELLOR_PHASE_3_MAX) return 3;
            return 4;
        } else if (tokenId == CHANCELLOR_TOKEN_ID) {
            if (currentSupply < CHANCELLOR_PHASE_1_MAX) return 1;
            if (currentSupply < CHANCELLOR_PHASE_2_MAX) return 2;
            if (currentSupply < CHANCELLOR_PHASE_3_MAX) return 3;
            return 4;
        }

        revert InvalidTokenId();
    }

    /**
     * @dev Get current dynamic price for a token ID
     * @param tokenId Token ID to check
     * @return Price in USD scaled by 1e6 (6 decimals)
     */
    function getDynamicPrice(uint256 tokenId) public view returns (uint256) {
        uint8 phase = getCurrentPhase(tokenId);
        return tierPricing[tokenId][phase].priceUsd;
    }

    /**
     * @dev Get current SUSU+ entitlement for a token ID at current phase
     * @param tokenId Token ID to check
     * @return SUSU+ tokens per NFT at current phase
     */
    function getSUSUPlusEntitlement(uint256 tokenId) public view returns (uint256) {
        uint8 phase = getCurrentPhase(tokenId);
        return tierPricing[tokenId][phase].susuPlusEntitlement;
    }

    /**
     * @dev Get next phase threshold (supply at which next phase starts)
     * @param tokenId Token ID to check
     * @return Supply threshold for next phase
     */
    function getNextPhaseThreshold(uint256 tokenId) public view returns (uint256) {
        uint8 currentPhase = getCurrentPhase(tokenId);
        
        if (tokenId == COMMANDER_TOKEN_ID) {
            if (currentPhase == 1) return COMMANDER_PHASE_2_MAX;
            if (currentPhase == 2) return COMMANDER_PHASE_3_MAX;
            if (currentPhase == 3) return COMMANDER_PHASE_4_MAX;
            return COMMANDER_PHASE_4_MAX;
        } else if (tokenId == COUNSELLOR_TOKEN_ID) {
            if (currentPhase == 1) return COUNSELLOR_PHASE_2_MAX;
            if (currentPhase == 2) return COUNSELLOR_PHASE_3_MAX;
            if (currentPhase == 3) return COUNSELLOR_PHASE_4_MAX;
            return COUNSELLOR_PHASE_4_MAX;
        } else if (tokenId == CHANCELLOR_TOKEN_ID) {
            if (currentPhase == 1) return CHANCELLOR_PHASE_2_MAX;
            if (currentPhase == 2) return CHANCELLOR_PHASE_3_MAX;
            if (currentPhase == 3) return CHANCELLOR_PHASE_4_MAX;
            return CHANCELLOR_PHASE_4_MAX;
        }

        revert InvalidTokenId();
    }

    /**
     * @dev Main mint function - buy Validator NFTs
     * Handles payment, minting, supply tracking, and SUSU+ entitlement assignment
     * @param tokenId Token ID to mint (5001, 10001, or 12001)
     * @param amount Number of NFTs to mint
     * @param paymentToken Payment token address (USDT or USDC)
     * 
     * Requirements:
     * - Sale must be open
     * - Token ID must be valid
     * - Amount must be > 0
     * - Payment token must be accepted
     * - Must not exceed max supply
     * - Must not exceed per-wallet limit
     * - User must have approved payment token
     */
    function mintValidatorNFT(
        uint256 tokenId,
        uint256 amount,
        address paymentToken
    ) external nonReentrant whenNotPaused {
        if (!saleOpen) revert SaleNotOpen();
        if (!_isValidTokenId(tokenId)) revert InvalidTokenId();
        if (amount == 0) revert InvalidAmount();
        if (!acceptedPaymentTokens[paymentToken]) revert PaymentTokenNotAccepted();

        uint256 maxSupply = nftContract.getMaxSupply(tokenId);
        uint256 currentSupply = supply[tokenId];
        if (currentSupply + amount > maxSupply) revert ExceedsMaxSupply();

        uint256 walletCount = walletMintCount[msg.sender][tokenId];
        if (walletCount + amount > maxPerWallet[tokenId]) revert ExceedsPerWalletLimit();

        // Get current phase and pricing (phase may change during transaction)
        uint8 phase = getCurrentPhase(tokenId);
        PhaseConfig memory phaseConfig = tierPricing[tokenId][phase];
        uint256 totalPrice = phaseConfig.priceUsd * amount;

        // Transfer payment from user to treasury
        IERC20(paymentToken).safeTransferFrom(msg.sender, treasury, totalPrice);
        
        // Mint NFTs to user
        nftContract.mint(msg.sender, tokenId, amount);

        // Update supply and wallet count (unchecked: overflow checked above)
        unchecked {
            supply[tokenId] += amount;
            walletMintCount[msg.sender][tokenId] = walletCount + amount;
        }

        // Calculate and track SUSU+ entitlement
        uint256 totalEntitlement = phaseConfig.susuPlusEntitlement * amount;
        unchecked {
            pioneerSUSUPlusEntitlement[msg.sender][tokenId] += totalEntitlement;
        }
        SUSUPlusPerNFT[tokenId] = phaseConfig.susuPlusEntitlement;

        emit NFTPurchased(
            msg.sender,
            tokenId,
            amount,
            totalPrice,
            paymentToken,
            phase,
            totalEntitlement
        );

        emit PioneerEntitlementAssigned(msg.sender, tokenId, totalEntitlement);
    }

    /**
     * @dev Get user's total SUSU+ entitlement across all tiers
     * @param user User address
     * @return Total SUSU+ entitlement
     */
    function getUserTotalEntitlement(address user) external view returns (uint256) {
        return
            pioneerSUSUPlusEntitlement[user][COMMANDER_TOKEN_ID] +
            pioneerSUSUPlusEntitlement[user][COUNSELLOR_TOKEN_ID] +
            pioneerSUSUPlusEntitlement[user][CHANCELLOR_TOKEN_ID];
    }

    /**
     * @dev Get user's SUSU+ entitlement for a specific token ID
     * @param user User address
     * @param tokenId Token ID
     * @return SUSU+ entitlement for the token ID
     */
    function getUserEntitlement(address user, uint256 tokenId) external view returns (uint256) {
        return pioneerSUSUPlusEntitlement[user][tokenId];
    }

    /**
     * @dev Set accepted payment token (admin only)
     * @param token Token address
     * @param accepted Whether token is accepted
     */
    function setPaymentToken(address token, bool accepted) external onlyRole(ADMIN_ROLE) {
        acceptedPaymentTokens[token] = accepted;
        emit PaymentTokenUpdated(token, accepted);
    }

    /**
     * @dev Update treasury address (admin only)
     * @param treasury_ New treasury address
     */
    function setTreasury(address treasury_) external onlyRole(ADMIN_ROLE) {
        if (treasury_ == address(0)) revert InvalidTreasury();
        treasury = treasury_;
        emit TreasuryUpdated(treasury_);
    }

    /**
     * @dev Set max per wallet limit for a token ID (admin only)
     * @param tokenId Token ID
     * @param limit Max NFTs per wallet
     */
    function setMaxPerWallet(uint256 tokenId, uint256 limit) external onlyRole(ADMIN_ROLE) {
        maxPerWallet[tokenId] = limit;
        emit MaxPerWalletUpdated(tokenId, limit);
    }

    /**
     * @dev Open/close sale (admin only)
     * @param isOpen Whether sale is open
     */
    function setSaleOpen(bool isOpen) external onlyRole(ADMIN_ROLE) {
        saleOpen = isOpen;
        emit SaleStatusUpdated(isOpen);
    }

    /**
     * @dev Update phase pricing (emergency only, admin only)
     * @param tokenId Token ID
     * @param phase Phase number (1-4)
     * @param priceUsd Price in USD scaled by 1e6
     * @param susuPlusEntitlement SUSU+ tokens per NFT
     */
    function updatePhasePricing(
        uint256 tokenId,
        uint8 phase,
        uint256 priceUsd,
        uint256 susuPlusEntitlement
    ) external onlyRole(ADMIN_ROLE) {
        if (phase < 1 || phase > 4) revert InvalidPhase();
        tierPricing[tokenId][phase] = PhaseConfig(priceUsd, susuPlusEntitlement);
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
     * @dev Get remaining supply for a token ID
     * @param tokenId Token ID
     * @return Remaining NFTs available to mint
     */
    function getRemainingSupply(uint256 tokenId) external view returns (uint256) {
        uint256 maxSupply = nftContract.getMaxSupply(tokenId);
        uint256 currentSupply = supply[tokenId];
        return maxSupply > currentSupply ? maxSupply - currentSupply : 0;
    }

    /**
     * @dev Internal helper to validate token ID
     * @param id Token ID to validate
     * @return true if valid, false otherwise
     */
    function _isValidTokenId(uint256 id) private pure returns (bool) {
        return id == COMMANDER_TOKEN_ID || id == COUNSELLOR_TOKEN_ID || id == CHANCELLOR_TOKEN_ID;
    }
}
