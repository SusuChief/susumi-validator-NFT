# Susumi Smart Contracts

Smart contracts for the Susumi Validator NFT Pre-Sale Launchpad with dynamic pricing and SUSU+ entitlement tracking.

## Table of Contents

- [Overview](#overview)
- [Contracts](#contracts)
- [Quick Start](#quick-start)
- [Testing](#testing)
- [Deployment](#deployment)
- [Integration](#integration)
- [Security](#security)
- [Deployed Contracts](#deployed-contracts)

## Overview

The system consists of two main contracts:

| Contract             | Purpose                                                       |
| -------------------- | ------------------------------------------------------------- |
| **SusumiPioneerNFT** | ERC-1155 NFT contract for Validator Rank NFTs                 |
| **SusumiLaunchpad**  | Dynamic pricing, payment handling, SUSU+ entitlement tracking |

### Architecture

```
┌─────────────────────────────────────┐
│         SusumiLaunchpad             │
│  • Dynamic 4-phase pricing          │
│  • USDT/USDC payments               │
│  • SUSU+ entitlement tracking       │
└──────────────────┬──────────────────┘
                   │ mints
                   ▼
┌─────────────────────────────────────┐
│         SusumiPioneerNFT            │
│  • ERC-1155 token standard          │
│  • Rank metadata storage            │
│  • ERC-2981 royalties (5%)          │
└─────────────────────────────────────┘
```

### NFT Tiers

| Tier       | Token ID | Max Supply | Phases |
| ---------- | :------: | :--------: | :----: |
| Commander  |   5001   |   4,500    |   4    |
| Counsellor |  10001   |    400     |   4    |
| Chancellor |  12001   |    100     |   4    |

### Dynamic Pricing

| Tier           | Phase | Supply      |  Price | SUSU+ Entitlement |
| -------------- | :---: | ----------- | -----: | ----------------: |
| **Commander**  |   1   | 1-1,125     |   $250 |           250,000 |
|                |   2   | 1,126-2,250 |   $300 |           200,000 |
|                |   3   | 2,251-3,375 |   $350 |           150,000 |
|                |   4   | 3,376-4,500 |   $400 |           100,000 |
| **Counsellor** |   1   | 1-100       |   $750 |           750,000 |
|                |   2   | 101-200     |   $900 |           550,000 |
|                |   3   | 201-300     | $1,200 |           350,000 |
|                |   4   | 301-400     | $1,500 |           200,000 |
| **Chancellor** |   1   | 1-25        | $2,500 |         2,500,000 |
|                |   2   | 26-50       | $3,200 |         1,900,000 |
|                |   3   | 51-75       | $4,000 |         1,300,000 |
|                |   4   | 76-100      | $5,000 |           900,000 |

## Contracts

### SusumiPioneerNFT.sol

ERC-1155 NFT contract with rank metadata and royalty support.

**Features:**
- ERC-1155 with max supply enforcement
- Rank metadata (seriesCode, rankTitle, veTier, fundAccess, isValidator)
- ERC-2981 royalties (5% default, configurable)
- Pausable with MINTER_ROLE and ADMIN_ROLE access control

**Key Functions:**

```solidity
// Minting (MINTER_ROLE required)
function mint(address to, uint256 id, uint256 amount) external
function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts) external

// Metadata
function getRankConfig(uint256 id) external view returns (RankConfig memory)
function getSeriesCode(uint256 id) external view returns (string memory)
function getRankTitle(uint256 id) external view returns (string memory)
function getVETier(uint256 id) external view returns (uint8)
```

### SusumiLaunchpad.sol

Launchpad contract with dynamic pricing and SUSU+ tracking.

**Features:**
- 4-phase dynamic pricing per tier
- Automatic phase progression based on supply
- SUSU+ entitlement tracking (per user, per token)
- USDT/USDC payments (6 decimals)
- Per-wallet mint limits
- ReentrancyGuard + Pausable

**Key Functions:**

```solidity
// Minting
function mintValidatorNFT(uint256 tokenId, uint256 amount, address paymentToken) external

// Pricing & Phase
function getCurrentPhase(uint256 tokenId) public view returns (uint8)
function getDynamicPrice(uint256 tokenId) public view returns (uint256)
function getSUSUPlusEntitlement(uint256 tokenId) public view returns (uint256)

// User Data
function getUserEntitlement(address user, uint256 tokenId) external view returns (uint256)
function getUserTotalEntitlement(address user) external view returns (uint256)
function getRemainingSupply(uint256 tokenId) external view returns (uint256)
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
cd susumi-smart-contracts
npm install
cp .env.example .env  # Configure your environment
npx hardhat compile
```

### Environment Variables

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

# Pioneer NFT
NFT_CONTRACT_ADDRESS=<YOUR_NFT_CONTRACT_ADDRESS>
```

## Testing

```bash
# Run all tests (67 tests)
npm test

# Run specific test file
npx hardhat test test/SusumiPioneerNFT.test.js
npx hardhat test test/SusumiLaunchpad.test.js

# With gas reporting
REPORT_GAS=true npm test

# Coverage
npx hardhat coverage
```

### Test Coverage

| Contract         | Tests | Coverage                                        |
| ---------------- | :---: | ----------------------------------------------- |
| SusumiPioneerNFT |  28   | Minting, metadata, royalties, access control    |
| SusumiLaunchpad  |  39   | Phases, pricing, payments, entitlements, limits |

## Deployment

### 1. Deploy Mock Stablecoins (Testnet Only)

```bash
npm run deploy:mocks --network testnet
```

### 2. Deploy NFT Contract

```bash
npm run deploy:nft --network testnet
```

### 3. Deploy Launchpad Contract

```bash
npm run deploy:launchpad --network testnet
```

### Post-Deployment

```javascript
// Open the sale
await launchpad.setSaleOpen(true);

// Verify payment tokens
await launchpad.acceptedPaymentTokens(usdtAddress); // true
await launchpad.acceptedPaymentTokens(usdcAddress); // true
```

### Verification

```bash
npx hardhat verify --network testnet <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

## Integration

### Get Pricing

```javascript
const phase = await launchpad.getCurrentPhase(COMMANDER_TOKEN_ID);
const price = await launchpad.getDynamicPrice(COMMANDER_TOKEN_ID);
const entitlement = await launchpad.getSUSUPlusEntitlement(COMMANDER_TOKEN_ID);
```

### Mint NFTs

```javascript
// 1. Calculate price
const amount = 2;
const unitPrice = await launchpad.getDynamicPrice(COMMANDER_TOKEN_ID);
const totalPrice = unitPrice * BigInt(amount);

// 2. Approve payment
await usdt.approve(launchpadAddress, totalPrice);

// 3. Mint
await launchpad.mintValidatorNFT(COMMANDER_TOKEN_ID, amount, usdtAddress);
```

### Listen to Events

```javascript
// NFT purchased
launchpad.on("NFTPurchased", (buyer, tokenId, amount, totalPrice, paymentToken, phase, entitlement) => {
  console.log(`${buyer} purchased ${amount}x Token ${tokenId}`);
});

// Entitlement assigned
launchpad.on("PioneerEntitlementAssigned", (user, tokenId, entitlement) => {
  console.log(`${user} earned ${entitlement} SUSU+`);
});
```

### Events Reference

| Event                        | Description                                |
| ---------------------------- | ------------------------------------------ |
| `NFTPurchased`               | Emitted on every NFT purchase              |
| `PioneerEntitlementAssigned` | Emitted when SUSU+ entitlement is assigned |
| `PaymentTokenUpdated`        | Payment token added/removed                |
| `TreasuryUpdated`            | Treasury address changed                   |
| `SaleStatusUpdated`          | Sale opened/closed                         |

## Security

### Features

| Feature         | Description                            |
| --------------- | -------------------------------------- |
| ReentrancyGuard | All state-changing functions protected |
| Access Control  | Role-based (ADMIN_ROLE, MINTER_ROLE)   |
| Pausable        | Emergency stop capability              |
| Safe Math       | Solidity 0.8.20 overflow protection    |
| Custom Errors   | Gas-efficient error handling           |

### Best Practices

- Use multi-sig wallet for admin operations
- Audit contracts before mainnet deployment
- Monitor events for anomalies
- Implement rate limiting on frontend

### Gas Estimates

| Function           |              Gas |
| ------------------ | ---------------: |
| `mintValidatorNFT` | ~150,000-200,000 |
| `getCurrentPhase`  |           ~2,500 |
| `getDynamicPrice`  |           ~3,000 |

## Project Structure

```
susumi-smart-contracts/
├── contracts/
│   ├── SusumiPioneerNFT.sol
│   ├── SusumiLaunchpad.sol
│   └── mocks/
│       ├── MockUSDT.sol
│       └── MockUSDC.sol
├── scripts/deploy/
│   ├── 00_deploy_mocks.js
│   ├── 01_deploy_nft_contract.js
│   └── 02_deploy_launchpad_contract.js
├── test/
│   ├── SusumiPioneerNFT.test.js
│   └── SusumiLaunchpad.test.js
├── hardhat.config.js
└── package.json
```

## Deployed Contracts

### Polygon Amoy Testnet (Chain ID: 80002)

| Contract         | Address                                                                                                                              | Verified |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ | :------: |
| SusumiPioneerNFT | [`0xd8B76474e00AAac540D4d9EB0b828e303320E6E5`](https://amoy.polygonscan.com/address/0xd8B76474e00AAac540D4d9EB0b828e303320E6E5#code) |    ✅     |
| SusumiLaunchpad  | [`0xc14062662Eeb45439e544BAD8a160201558F51E1`](https://amoy.polygonscan.com/address/0xc14062662Eeb45439e544BAD8a160201558F51E1#code) |    ✅     |
| MockUSDT         | [`0xe64CBB5eF8B421f42B3d7c7360914c1b851Bd20b`](https://amoy.polygonscan.com/address/0xe64CBB5eF8B421f42B3d7c7360914c1b851Bd20b#code) |    ✅     |
| MockUSDC         | [`0x604c89DB73DF4a2f62B736146A080094Bf47a08e`](https://amoy.polygonscan.com/address/0x604c89DB73DF4a2f62B736146A080094Bf47a08e#code) |    ✅     |

### Polygon Mainnet (Chain ID: 137)

| Contract         | Address                                                                                                                    | Verified |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- | :------: |
| SusumiPioneerNFT | TBD                                                                                                                        |    -     |
| SusumiLaunchpad  | TBD                                                                                                                        |    -     |
| USDT             | [`0xc2132D05D31c914a87C6611C10748AEb04B58e8F`](https://polygonscan.com/address/0xc2132D05D31c914a87C6611C10748AEb04B58e8F) |    ✅     |
| USDC             | [`0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359`](https://polygonscan.com/address/0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359) |    ✅     |

## Networks

| Network         | Chain ID | RPC                                   |
| --------------- | :------: | ------------------------------------- |
| Polygon Amoy    |  80002   | `https://rpc-amoy.polygon.technology` |
| Polygon Mainnet |   137    | `https://polygon-mainnet.infura.io`   |
