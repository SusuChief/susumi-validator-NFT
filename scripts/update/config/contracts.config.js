/**
 * @title Contract Configuration
 * @notice Centralized configuration for deployed contract addresses
 * @dev Update addresses after deployment to each network
 */

const NETWORKS = {
  testnet: {
    nftContract: process.env.NFT_CONTRACT_ADDRESS || "",
    launchpadContract: process.env.LAUNCHPAD_CONTRACT_ADDRESS || "",
    usdt: process.env.USDT_ADDRESS || "",
    usdc: process.env.USDC_ADDRESS || "",
  },
  mainnet: {
    nftContract: process.env.NFT_CONTRACT_ADDRESS || "",
    launchpadContract: process.env.LAUNCHPAD_CONTRACT_ADDRESS || "",
    usdt: process.env.USDT_ADDRESS || "",
    usdc: process.env.USDC_ADDRESS || "",
  },
};

// Token ID constants (matching contract values)
const TOKEN_IDS = {
  COMMANDER: 5001,
  COUNSELLOR: 10001,
  CHANCELLOR: 12001,
};

// Role constants
const ROLES = {
  DEFAULT_ADMIN: "0x0000000000000000000000000000000000000000000000000000000000000000",
  ADMIN_ROLE: "0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775", // keccak256("ADMIN_ROLE")
  MINTER_ROLE: "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6", // keccak256("MINTER_ROLE")
};

/**
 * Get network configuration
 * @param {string} networkName - Network name from hardhat
 * @returns {Object} Network configuration
 */
function getNetworkConfig(networkName) {
  const config = NETWORKS[networkName];
  if (!config) {
    throw new Error(`Unknown network: ${networkName}. Available: ${Object.keys(NETWORKS).join(", ")}`);
  }
  return config;
}

/**
 * Validate contract address
 * @param {string} address - Contract address
 * @param {string} name - Contract name for error messages
 */
function validateAddress(address, name) {
  if (!address || address === "" || address === "0x0000000000000000000000000000000000000000") {
    throw new Error(`${name} address not configured. Please set in .env or contracts.config.js`);
  }
}

module.exports = {
  NETWORKS,
  TOKEN_IDS,
  ROLES,
  getNetworkConfig,
  validateAddress,
};
