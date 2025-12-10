# 🎮 Susumi Smart Contract Update Scripts

Professional script suite for managing and updating deployed Susumi smart contracts.

## ✨ Features

- **Winston Logging** - Professional logging with file output & rotation
- **Interactive CLI** - Menu-driven interface for all operations
- **Safety Prompts** - Confirmation required for all critical operations
- **Transaction Logging** - All transactions logged to files for audit
- **State Verification** - Automatic verification after updates

## 📁 Directory Structure

```
scripts/update/
├── config/
│   └── contracts.config.js        # Contract addresses & network config
├── helpers/
│   ├── logger.js                  # Winston-based logging system
│   ├── prompt.js                  # Interactive confirmation prompts
│   └── contract-loader.js         # Contract instance utilities
├── logs/                          # Auto-created log directory
│   ├── combined.log               # All logs
│   ├── error.log                  # Errors only
│   └── transactions.log           # Transaction records
├── nft/
│   ├── set-base-uri.js            # Update NFT metadata base URI
│   ├── update-royalty.js          # Update royalty settings (ERC2981)
│   ├── update-rank-config.js      # Update rank configuration
│   └── manage-roles.js            # Grant/revoke roles
├── launchpad/
│   ├── update-treasury.js         # Update treasury address
│   ├── update-pricing.js          # Update phase pricing
│   ├── update-wallet-limits.js    # Update per-wallet limits
│   ├── manage-payment-tokens.js   # Add/remove payment tokens
│   └── manage-sale.js             # Open/close sale
├── emergency/
│   ├── pause-all.js               # Emergency pause all contracts
│   └── unpause-all.js             # Resume all contracts
├── index.js                       # Interactive CLI manager
└── README.md                    
```

## ⚙️ Configuration

### 1. Set Contract Addresses

Add deployed contract addresses to your `.env` file:

```bash
# Testnet (Polygon Amoy)
NFT_CONTRACT_ADDRESS_TESTNET=0xd8B76474e00AAac540D4d9EB0b828e303320E6E5
LAUNCHPAD_CONTRACT_ADDRESS_TESTNET=0xc14062662Eeb45439e544BAD8a160201558F51E1
USDT_ADDRESS_TESTNET=0xe64CBB5eF8B421f42B3d7c7360914c1b851Bd20b
USDC_ADDRESS_TESTNET=0x604c89DB73DF4a2f62B736146A080094Bf47a08e

# Mainnet (Polygon)
NFT_CONTRACT_ADDRESS_MAINNET=0x...
LAUNCHPAD_CONTRACT_ADDRESS_MAINNET=0x...
USDT_ADDRESS_MAINNET=0xc2132D05D31c914a87C6611C10748AEb04B58e8F
USDC_ADDRESS_MAINNET=0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
```

Or update `config/contracts.config.js` directly.

### 2. Private Key

Ensure your deployer/admin private key is set:

```bash
PRIVATE_KEY=your_private_key_here
```

## 📦 Installation

Install the winston dependency:

```bash
cd susumi-smart-contracts
npm install
```

## 🚀 Usage

### NPM Scripts (Recommended)

```bash
# Interactive CLI Manager
npm run update -- testnet

# NFT Scripts
npm run update:uri -- testnet
npm run update:royalty -- testnet
npm run update:roles -- testnet

# Launchpad Scripts
npm run update:treasury -- testnet
npm run update:pricing -- testnet
npm run update:sale -- testnet
npm run update:limits -- testnet
npm run update:tokens -- testnet

# Emergency
npm run emergency:pause -- mainnet
npm run emergency:unpause -- mainnet
```

### Interactive CLI Manager

```bash
npx hardhat run scripts/update/index.js --network testnet
```

This shows current contract status and provides a menu for all operations.

### Individual Scripts (Direct)

#### NFT Contract Operations

```bash
# Update Base URI
NEW_BASE_URI="https://gateway.pinata.cloud/ipfs/Qm.../" npx hardhat run scripts/update/nft/set-base-uri.js --network mainnet

# Update Royalty (interactive)
npx hardhat run scripts/update/nft/update-royalty.js --network mainnet

# Or with environment variables
ROYALTY_RECEIVER=0x... ROYALTY_FEE=500 npx hardhat run scripts/update/nft/update-royalty.js --network mainnet

# Manage Roles
npx hardhat run scripts/update/nft/manage-roles.js --network mainnet

# Update Rank Configuration
npx hardhat run scripts/update/nft/update-rank-config.js --network mainnet
```

#### Launchpad Contract Operations

```bash
# Update Treasury Address
NEW_TREASURY=0x... npx hardhat run scripts/update/launchpad/update-treasury.js --network mainnet

# Update Phase Pricing (interactive)
npx hardhat run scripts/update/launchpad/update-pricing.js --network mainnet

# Manage Sale (open/close)
npx hardhat run scripts/update/launchpad/manage-sale.js --network mainnet

# Update Wallet Limits
npx hardhat run scripts/update/launchpad/update-wallet-limits.js --network mainnet

# Manage Payment Tokens
npx hardhat run scripts/update/launchpad/manage-payment-tokens.js --network mainnet
```

#### Emergency Operations

```bash
# 🚨 Emergency Pause (stops all operations)
npx hardhat run scripts/update/emergency/pause-all.js --network mainnet

# Resume Operations
npx hardhat run scripts/update/emergency/unpause-all.js --network mainnet
```

## 📋 Available Operations

### NFT Contract (SusumiPioneerNFT)

| Script                  | Description               | Env Vars                          |
| ----------------------- | ------------------------- | --------------------------------- |
| `set-base-uri.js`       | Update metadata base URI  | `NEW_BASE_URI`                    |
| `update-royalty.js`     | Update ERC2981 royalty    | `ROYALTY_RECEIVER`, `ROYALTY_FEE` |
| `update-rank-config.js` | Update tier configuration | - (interactive)                   |
| `manage-roles.js`       | Grant/revoke roles        | - (interactive)                   |

### Launchpad Contract (SusumiLaunchpad)

| Script                     | Description               | Env Vars        |
| -------------------------- | ------------------------- | --------------- |
| `update-treasury.js`       | Update treasury address   | `NEW_TREASURY`  |
| `update-pricing.js`        | Update phase pricing      | - (interactive) |
| `update-wallet-limits.js`  | Update per-wallet limits  | - (interactive) |
| `manage-payment-tokens.js` | Add/remove payment tokens | - (interactive) |
| `manage-sale.js`           | Open/close NFT sale       | - (interactive) |

### Emergency

| Script           | Description                   |
| ---------------- | ----------------------------- |
| `pause-all.js`   | Emergency pause all contracts |
| `unpause-all.js` | Resume all contracts          |

## 🔐 Role Requirements

| Role                 | Required For                      |
| -------------------- | --------------------------------- |
| `ADMIN_ROLE`         | All update operations             |
| `DEFAULT_ADMIN_ROLE` | Managing roles (grant/revoke)     |
| `MINTER_ROLE`        | Minting NFTs (Launchpad has this) |

## ⚠️ Safety Features

1. **Permission Checks** - Scripts verify you have required roles before executing
2. **Confirmation Prompts** - All operations require explicit confirmation
3. **Dangerous Operation Warnings** - Critical operations (treasury, roles) require typing "CONFIRM"
4. **State Verification** - Scripts verify changes after transactions complete
5. **Current vs New Display** - Shows before/after values for review

## 🛠️ PowerShell Environment Variables

On Windows PowerShell, set env vars like this:

```powershell
# Single variable
$env:NEW_BASE_URI="https://new-uri.com/"; npx hardhat run scripts/update/nft/set-base-uri.js --network testnet

# Multiple variables
$env:ROYALTY_RECEIVER="0x..."; $env:ROYALTY_FEE="500"; npx hardhat run scripts/update/nft/update-royalty.js --network testnet
```

Or set them separately:

```powershell
$env:NEW_TREASURY = "0x..."
npx hardhat run scripts/update/launchpad/update-treasury.js --network mainnet
```

## 📝 Winston Logging System

The update scripts use Winston for professional logging with:

### Log Files (in `scripts/update/logs/`)

| File               | Content                       |
| ------------------ | ----------------------------- |
| `combined.log`     | All log entries (JSON format) |
| `error.log`        | Errors only                   |
| `transactions.log` | All blockchain transactions   |

### Features

- **Log Rotation** - Files rotate at 5MB, keeps 5-10 files
- **JSON Format** - Structured logs for parsing/analysis
- **Session Tracking** - Each script run has unique session ID
- **Timestamps** - All entries have ISO timestamps
- **Error Stacks** - Full stack traces on errors

### Log Levels

Set `LOG_LEVEL` environment variable to control verbosity:

```bash
LOG_LEVEL=debug npm run update -- testnet  # All logs
LOG_LEVEL=info npm run update -- testnet   # Info and above
LOG_LEVEL=error npm run update -- testnet  # Errors only
```

### Sample Log Entry

```json
{
  "level": "tx",
  "message": "setBaseURI: 0x123...",
  "type": "transaction",
  "hash": "0x123abc...",
  "description": "setBaseURI",
  "timestamp": "2024-12-08 15:30:45"
}
```

### Console Output

Scripts log to console with:
- Transaction hash
- Block number
- Gas used
- Gas price

## 🔄 Verification

After each update, scripts automatically verify the new state matches expected values.

## 💡 Tips

1. **Always test on testnet first** before mainnet operations
2. **Keep your .env file secure** - never commit private keys
3. **Use the CLI manager** for an overview of current contract state
4. **Check gas prices** before mainnet transactions
5. **Have backup admin addresses** in case primary is compromised

## 🆘 Troubleshooting

### "Contract address not configured"
Set the appropriate env var or update `contracts.config.js`

### "Signer does not have ADMIN_ROLE"
Your wallet doesn't have admin permissions. Contact contract owner.

### "Transaction reverted"
Check the error message - usually insufficient funds or role issues.

### Gas estimation failed
Contract may be paused or you lack permissions.
