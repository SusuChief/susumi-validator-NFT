# Susumi Smart Contracts

Smart contracts for the Susumi Validator NFT Pre-Sale Launchpad with dynamic pricing and SUSU+ entitlement tracking.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Contracts](#contracts)
- [Features](#features)
- [Installation](#installation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Integration](#integration)
- [Security](#security)
- [Gas Optimization](#gas-optimization)
- [Events](#events)
- [Network Configuration](#network-configuration)
- [Project Structure](#project-structure)

## 🎯 Overview

This repository contains the smart contracts for the Susumi Validator NFT Pre-Sale system. The system consists of two main contracts:

1. **SusumiPioneerNFT** - ERC-1155 NFT contract for Validator Rank NFTs
2. **SusumiLaunchpad** - Launchpad contract with dynamic pricing and SUSU+ entitlement tracking

The system implements a 4-phase dynamic pricing model where NFT prices and SUSU+ entitlements change based on supply milestones.

## 🏗️ Architecture

```
┌─────────────────────┐
│   SusumiLaunchpad   │
│  - Dynamic Pricing  │
│  - Payment Handling │
│  - Entitlement      │
└──────────┬──────────┘
           │
           │ mints
           ▼
┌─────────────────────┐
│  SusumiPioneerNFT   │
│  - ERC-1155         │
│  - Rank Metadata    │
│  - Royalties        │
└─────────────────────┘
```

## 📄 Contracts

### SusumiPioneerNFT.sol

ERC-1155 contract for Susumi Rank NFTs (Pioneer Series).

**Token IDs:**
- `5001` - Commander (GC5)
- `10001` - Counsellor (RC10)
- `12001` - Chancellor (RC12)

**Max Supplies:**
- Commander: 4,500 NFTs
- Counsellor: 400 NFTs
- Chancellor: 100 NFTs

**Features:**
- ✅ ERC-1155 standard implementation
- ✅ Rank metadata storage (seriesCode, rankTitle, veTier, fundAccess, isValidator)
- ✅ ERC-2981 royalty support (5% default, configurable per token)
- ✅ Pausable for emergency stops
- ✅ Access control with MINTER_ROLE and ADMIN_ROLE
- ✅ Max supply enforcement
- ✅ Batch minting support

**Key Functions:**
```solidity
// Minting
function mint(address to, uint256 id, uint256 amount) external onlyRole(MINTER_ROLE)
function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts) external

// Metadata Getters
function getSeriesCode(uint256 id) external view returns (string memory)
function getRankTitle(uint256 id) external view returns (string memory)
function getVETier(uint256 id) external view returns (uint8)
function getFundAccess(uint256 id) external view returns (uint8)
function isValidatorRank(uint256 id) external view returns (bool)
function getRoyaltyShares(uint256 id) external view returns (uint16 l1, uint16 l2, uint16 l3)
function getRankConfig(uint256 id) external view returns (RankConfig memory)

// Admin Functions
function updateRankConfig(uint256 id, RankConfig calldata config) external onlyRole(ADMIN_ROLE)
function setBaseURI(string memory baseURI_) external onlyRole(ADMIN_ROLE)
function pause() external onlyRole(ADMIN_ROLE)
function unpause() external onlyRole(ADMIN_ROLE)
```

### SusumiLaunchpad.sol

Launchpad contract for Validator NFT pre-sale with dynamic pricing and SUSU+ entitlement tracking.

**Features:**
- ✅ Dynamic 4-phase pricing per tier
- ✅ Automatic phase progression based on supply
- ✅ SUSU+ entitlement tracking per user and token ID
- ✅ Payment in USDT/USDC (6 decimals)
- ✅ Per-wallet mint limits (configurable)
- ✅ ReentrancyGuard protection
- ✅ Pausable for emergency stops
- ✅ Comprehensive event logging

**Pricing Phases:**

| Tier | Phase | Supply Range | Price | SUSU+ Entitlement |
|------|-------|--------------|-------|-------------------|
| **Commander** | 1 | 1-1,125 | $250 | 250,000 |
| | 2 | 1,126-2,250 | $300 | 200,000 |
| | 3 | 2,251-3,375 | $350 | 150,000 |
| | 4 | 3,376-4,500 | $400 | 100,000 |
| **Counsellor** | 1 | 1-100 | $750 | 750,000 |
| | 2 | 101-200 | $900 | 550,000 |
| | 3 | 201-300 | $1,200 | 350,000 |
| | 4 | 301-400 | $1,500 | 200,000 |
| **Chancellor** | 1 | 1-25 | $2,500 | 2,500,000 |
| | 2 | 26-50 | $3,200 | 1,900,000 |
| | 3 | 51-75 | $4,000 | 1,300,000 |
| | 4 | 76-100 | $5,000 | 900,000 |

**Key Functions:**
```solidity
// Minting
function mintValidatorNFT(uint256 tokenId, uint256 amount, address paymentToken) external

// Phase & Pricing
function getCurrentPhase(uint256 tokenId) public view returns (uint8)
function getDynamicPrice(uint256 tokenId) public view returns (uint256)
function getSUSUPlusEntitlement(uint256 tokenId) public view returns (uint256)
function getNextPhaseThreshold(uint256 tokenId) public view returns (uint256)

// Entitlement Queries
function getUserEntitlement(address user, uint256 tokenId) external view returns (uint256)
function getUserTotalEntitlement(address user) external view returns (uint256)
function getRemainingSupply(uint256 tokenId) external view returns (uint256)

// Admin Functions
function setPaymentToken(address token, bool accepted) external onlyRole(ADMIN_ROLE)
function setTreasury(address treasury_) external onlyRole(ADMIN_ROLE)
function setMaxPerWallet(uint256 tokenId, uint256 limit) external onlyRole(ADMIN_ROLE)
function setSaleOpen(bool isOpen) external onlyRole(ADMIN_ROLE)
function updatePhasePricing(uint256 tokenId, uint8 phase, uint256 priceUsd, uint256 susuPlusEntitlement) external onlyRole(ADMIN_ROLE)
function pause() external onlyRole(ADMIN_ROLE)
function unpause() external onlyRole(ADMIN_ROLE)
```

## ✨ Features

### Dynamic Pricing System
- Automatic phase progression as supply increases
- Price increases incentivize early participation
- SUSU+ entitlements decrease in later phases

### SUSU+ Entitlement Tracking
- Per-user, per-token ID entitlement tracking
- Cumulative entitlement across all tiers
- Events emitted for off-chain processing

### Security
- ReentrancyGuard on all state-changing functions
- Access control with role-based permissions
- Pausable for emergency situations
- Input validation on all functions
- Max supply and per-wallet limit enforcement

### Gas Optimization
- Custom errors instead of require strings
- Unchecked arithmetic where safe
- Storage variable caching
- Efficient phase calculation logic

## 🚀 Installation

### Prerequisites

- Node.js >= 16.0.0
- npm or yarn
- Hardhat >= 2.6.8

### Setup

1. **Clone the repository:**
```bash
git clone https://github.com/SusuChief/susumi-smart-contracts
cd susumi-smart-contracts
```

2. **Install dependencies:**
```bash
npm install
```

3. **Create `.env` file:**
```env
# Network Configuration
RPC_URL=<YOUR_RPC_URL>
PRIVATE_KEY=<YOUR_PRIVATE_KEY>
ETHERSCAN_API_KEY=<YOUR_ETHERSCAN_API_KEY>

# Deployment Configuration
DEFAULT_ADMIN=<YOUR_DEFAULT_ADMIN>
TREASURY=<YOUR_TREASURY>
BASE_URI=<YOUR_BASE_URI>

# Payment Tokens
USDT_ADDRESS=<YOUR_USDT_ADDRESS>
USDC_ADDRESS=<YOUR_USDC_ADDRESS>
```

4. **Compile contracts:**
```bash
npx hardhat compile
```

## 🧪 Testing

### Test Suite Overview

The test suite includes comprehensive coverage for both contracts:

- **67 tests total** (28 NFT + 39 Launchpad)
- **Mock contracts** for USDT and USDC (6 decimals)
- **Edge case testing** including phase transitions
- **Security testing** for access control and limits

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npx hardhat test test/SusumiPioneerNFT.test.js
npx hardhat test test/SusumiLaunchpad.test.js

# Run tests with gas reporting
REPORT_GAS=true npm test

# Run tests with coverage (if configured)
npx hardhat coverage
```

### Test Coverage

**SusumiPioneerNFT Tests:**
- ✅ Deployment and initialization
- ✅ Max supply validation
- ✅ Minting (single and batch)
- ✅ Rank metadata getters
- ✅ Admin functions
- ✅ Pausable functionality
- ✅ Token transfers
- ✅ Royalty configuration

**SusumiLaunchpad Tests:**
- ✅ Deployment and configuration
- ✅ Phase system (4 phases per tier)
- ✅ Dynamic pricing calculations
- ✅ Minting with payment (USDT/USDC)
- ✅ SUSU+ entitlement tracking
- ✅ Events emission
- ✅ Admin functions
- ✅ Supply tracking
- ✅ Edge cases and phase transitions
- ✅ Per-wallet limits
- ✅ Max supply enforcement

### Mock Contracts

The test suite includes mock ERC20 contracts:
- `MockUSDT.sol` - USDT mock with 6 decimals
- `MockUSDC.sol` - USDC mock with 6 decimals

These are automatically deployed in test setup and provide sufficient tokens for all test scenarios.

### Example Test Output

```
  SusumiPioneerNFT
    Deployment
      ✓ Should set the correct admin roles
      ✓ Should initialize rank configurations
    Minting
      ✓ Should mint NFTs to user
      ✓ Should enforce max supply
    ...

  SusumiLaunchpad
    Phase System
      ✓ Should return phase 1 initially
      ✓ Should progress to phase 2 after threshold
    Dynamic Pricing
      ✓ Should return correct price for phase 1
    ...

  67 passing (19s)
```

## 📦 Deployment

### Prerequisites

1. Ensure you have sufficient funds for deployment
2. Set up `.env` file with required variables
3. Verify network configuration in `hardhat.config.js`

### Deploy NFT Contract

```bash
npm run deploy:nft -- --network testnet
```

**What happens:**
1. Deploys `SusumiPioneerNFT` contract
2. Grants `MINTER_ROLE` to deployer (update to Launchpad address after deployment)
3. Sets default royalty to treasury (5%)
4. Initializes rank configurations for all three tiers

**Save the NFT contract address** - you'll need it for Launchpad deployment.

### Deploy Launchpad Contract

```bash
NFT_CONTRACT_ADDRESS=0x... npm run deploy:launchpad -- --network testnet
```

**What happens:**
1. Deploys `SusumiLaunchpad` contract
2. Grants `MINTER_ROLE` to Launchpad in NFT contract
3. Initializes dynamic pricing for all tiers and phases
4. Sets default per-wallet limits:
   - Commander: 10 NFTs
   - Counsellor: 5 NFTs
   - Chancellor: 3 NFTs
5. Configures USDT and USDC as accepted payment tokens

### Post-Deployment Setup

1. **Open the sale:**
```javascript
await launchpad.setSaleOpen(true);
```

2. **Verify payment tokens:**
```javascript
await launchpad.acceptedPaymentTokens(usdtAddress); // should be true
await launchpad.acceptedPaymentTokens(usdcAddress); // should be true
```

3. **Update per-wallet limits if needed:**
```javascript
await launchpad.setMaxPerWallet(COMMANDER_TOKEN_ID, 10);
await launchpad.setMaxPerWallet(COUNSELLOR_TOKEN_ID, 5);
await launchpad.setMaxPerWallet(CHANCELLOR_TOKEN_ID, 3);
```

4. **Verify phase pricing:**
```javascript
const phase1Price = await launchpad.tierPricing(COMMANDER_TOKEN_ID, 1);
console.log("Commander Phase 1 Price:", phase1Price.priceUsd.toString());
```

### Verification

After deployment, verify contracts on block explorer:

```bash
npx hardhat verify --network testnet <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

## 🔌 Integration

### Frontend Integration

#### 1. Get Current Pricing

```javascript
const { ethers } = require("ethers");

// Connect to contract
const launchpad = new ethers.Contract(launchpadAddress, launchpadABI, provider);

// Get current phase and pricing
const phase = await launchpad.getCurrentPhase(COMMANDER_TOKEN_ID);
const price = await launchpad.getDynamicPrice(COMMANDER_TOKEN_ID);
const entitlement = await launchpad.getSUSUPlusEntitlement(COMMANDER_TOKEN_ID);
const nextThreshold = await launchpad.getNextPhaseThreshold(COMMANDER_TOKEN_ID);

console.log(`Phase: ${phase}, Price: $${price / 1e6}, Entitlement: ${entitlement}`);
```

#### 2. Check User's Entitlement

```javascript
const userEntitlement = await launchpad.getUserEntitlement(userAddress, COMMANDER_TOKEN_ID);
const totalEntitlement = await launchpad.getUserTotalEntitlement(userAddress);

console.log(`User entitlement: ${userEntitlement.toString()}`);
console.log(`Total entitlement: ${totalEntitlement.toString()}`);
```

#### 3. Mint NFTs

```javascript
const signer = provider.getSigner();
const launchpadWithSigner = launchpad.connect(signer);
const paymentToken = new ethers.Contract(usdtAddress, erc20ABI, signer);

// Calculate total price
const amount = 2; // Number of NFTs to mint
const unitPrice = await launchpad.getDynamicPrice(COMMANDER_TOKEN_ID);
const totalPrice = unitPrice.mul(amount);

// Approve payment token
await paymentToken.approve(launchpadAddress, totalPrice);

// Mint NFTs
const tx = await launchpadWithSigner.mintValidatorNFT(
  COMMANDER_TOKEN_ID,
  amount,
  usdtAddress
);

await tx.wait();
console.log("Mint successful! TX:", tx.hash);
```

#### 4. Listen to Events

```javascript
// Listen for NFT purchases
launchpad.on("NFTPurchased", (buyer, tokenId, amount, totalPrice, paymentToken, phase, entitlement) => {
  console.log(`NFT Purchased: ${amount} x Token ${tokenId} by ${buyer}`);
  console.log(`Phase: ${phase}, Entitlement: ${entitlement.toString()}`);
});

// Listen for entitlement assignments
launchpad.on("PioneerEntitlementAssigned", (user, tokenId, entitlement) => {
  console.log(`Entitlement assigned: ${entitlement.toString()} SUSU+ to ${user}`);
});
```

### Backend Integration

For off-chain data aggregation, listen to events:

```javascript
// Get all purchase events
const filter = launchpad.filters.NFTPurchased();
const events = await launchpad.queryFilter(filter, fromBlock, toBlock);

// Process events
events.forEach(event => {
  const { buyer, tokenId, amount, totalPrice, phase, susuPlusEntitlement } = event.args;
  // Store in database, update analytics, etc.
});
```

## 🔒 Security

### Security Features

- **ReentrancyGuard**: All state-changing functions protected
- **Access Control**: Role-based permissions (ADMIN_ROLE, MINTER_ROLE)
- **Pausable**: Emergency stop functionality
- **Input Validation**: All inputs validated before processing
- **Safe Math**: Solidity 0.8.20 built-in overflow protection
- **Custom Errors**: Gas-efficient error handling

### Best Practices

1. **Multi-sig for Admin Functions**: Use a multi-sig wallet for admin operations
2. **Regular Audits**: Contracts should be audited before mainnet deployment
3. **Timelock for Critical Changes**: Consider timelock for treasury and pricing updates
4. **Monitor Events**: Set up monitoring for all events
5. **Rate Limiting**: Implement rate limiting on frontend

### Known Considerations

- Phase pricing can be updated by admin (emergency only)
- Treasury address can be changed by admin
- Per-wallet limits are configurable by admin
- Contracts are pausable for emergency situations

## ⛽ Gas Optimization

The contracts are optimized for gas efficiency:

- **Custom Errors**: ~50 gas saved per revert
- **Unchecked Arithmetic**: ~30-40 gas saved per operation
- **Storage Caching**: ~100-200 gas saved per transaction
- **Efficient Phase Logic**: Minimal storage reads

### Gas Estimates (approximate)

- `mintValidatorNFT`: ~150,000 - 200,000 gas (depending on phase)
- `getCurrentPhase`: ~2,500 gas (view function)
- `getDynamicPrice`: ~3,000 gas (view function)
- `getUserTotalEntitlement`: ~2,000 gas (view function)

## 📡 Events

### NFTPurchased

Emitted when NFTs are purchased:

```solidity
event NFTPurchased(
    address indexed buyer,
    uint256 indexed tokenId,
    uint256 amount,
    uint256 totalPrice,
    address paymentToken,
    uint8 phase,
    uint256 susuPlusEntitlement
);
```

**Use Cases:**
- Track all purchases
- Analytics and reporting
- Off-chain data aggregation
- User dashboard updates

### PioneerEntitlementAssigned

Emitted when SUSU+ entitlement is assigned:

```solidity
event PioneerEntitlementAssigned(
    address indexed user,
    uint256 indexed tokenId,
    uint256 entitlement
);
```

**Use Cases:**
- SUSU+ token vesting system
- User entitlement tracking
- Reward distribution

### Other Events

```solidity
event PaymentTokenUpdated(address indexed token, bool accepted);
event TreasuryUpdated(address indexed newTreasury);
event MaxPerWalletUpdated(uint256 indexed tokenId, uint256 newLimit);
event SaleStatusUpdated(bool isOpen);
```

## 🌐 Network Configuration

### Supported Networks

- **Polygon Amoy (Testnet)**
  - Chain ID: 80002
  - RPC: `https://rpc-amoy.polygon.technology`
  
- **Polygon PoS (Mainnet)**
  - Chain ID: 137
  - RPC: `https://polygon-mainnet.infura.io` (or your preferred provider)

### Network-Specific Addresses

Update these in your `.env` file:

**Polygon Mainnet:**
- USDT: `0xc2132D05D31c914a87C6611C10748AEb04B58e8F`
- USDC: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`

**Polygon Amoy (Testnet):**
- Use mock contracts or deploy test tokens

## 📁 Project Structure

```
susumi-smart-contracts/
├── contracts/
│   ├── SusumiPioneerNFT.sol       # Main NFT contract
│   ├── SusumiLaunchpad.sol        # Main Launchpad contract
│   ├── interfaces/                # Interface definitions
│   └── mocks/                     # Mock contracts for testing
│       ├── MockUSDT.sol
│       └── MockUSDC.sol
├── scripts/
│   └── deploy/
│       ├── 01_deploy_nft_contract.js
│       └── 02_deploy_launchpad_contract.js
├── test/
│   ├── SusumiPioneerNFT.test.js   # NFT contract tests
│   └── SusumiLaunchpad.test.js    # Launchpad contract tests
├── hardhat.config.js              # Hardhat configuration
├── package.json                   # Dependencies
└── README.md                      
```