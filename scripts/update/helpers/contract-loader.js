/**
 * @title Contract Loader
 * @notice Load and validate contract instances
 */

const hre = require("hardhat");
const { getNetworkConfig, validateAddress } = require("../config/contracts.config");
const { logger } = require("./logger");

/**
 * Load NFT contract instance
 * @returns {Promise<Object>} Contract instance
 */
async function loadNFTContract() {
  const networkConfig = getNetworkConfig(hre.network.name);
  validateAddress(networkConfig.nftContract, "NFT Contract");
  
  const contract = await hre.ethers.getContractAt(
    "SusumiPioneerNFT",
    networkConfig.nftContract
  );
  
  logger.info(`NFT Contract loaded: ${networkConfig.nftContract}`);
  return contract;
}

/**
 * Load Launchpad contract instance
 * @returns {Promise<Object>} Contract instance
 */
async function loadLaunchpadContract() {
  const networkConfig = getNetworkConfig(hre.network.name);
  validateAddress(networkConfig.launchpadContract, "Launchpad Contract");
  
  const contract = await hre.ethers.getContractAt(
    "SusumiLaunchpad",
    networkConfig.launchpadContract
  );
  
  logger.info(`Launchpad Contract loaded: ${networkConfig.launchpadContract}`);
  return contract;
}

/**
 * Load both contracts
 * @returns {Promise<Object>} Both contract instances
 */
async function loadAllContracts() {
  return {
    nft: await loadNFTContract(),
    launchpad: await loadLaunchpadContract(),
  };
}

/**
 * Get signer info
 * @returns {Promise<Object>} Signer details
 */
async function getSignerInfo() {
  const [signer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(signer.address);
  const network = await hre.ethers.provider.getNetwork();
  
  return {
    address: signer.address,
    balance: hre.ethers.formatEther(balance),
    network: hre.network.name,
    chainId: network.chainId.toString(),
    signer,
  };
}

/**
 * Execute transaction with logging
 * @param {Function} txFunc - Transaction function
 * @param {string} description - Transaction description
 * @returns {Promise<Object>} Transaction receipt
 */
async function executeTx(txFunc, description) {
  logger.info(`Executing: ${description}...`);
  
  const tx = await txFunc();
  logger.tx(tx.hash, description);
  
  logger.info("Waiting for confirmation...");
  const receipt = await tx.wait();
  
  logger.success(`Transaction confirmed in block ${receipt.blockNumber}`);
  logger.gas(receipt.gasUsed.toString(), receipt.gasPrice?.toString() || "N/A");
  
  return receipt;
}

/**
 * Check if signer has required role
 * @param {Object} contract - Contract instance
 * @param {string} role - Role bytes32
 * @param {string} address - Address to check
 * @returns {Promise<boolean>}
 */
async function hasRole(contract, role, address) {
  return await contract.hasRole(role, address);
}

/**
 * Get gas estimate for a transaction
 * @param {Object} contract - Contract instance
 * @param {string} method - Method name
 * @param {Array} args - Method arguments
 * @returns {Promise<BigInt>} Estimated gas
 */
async function estimateGas(contract, method, args = []) {
  try {
    const gasEstimate = await contract[method].estimateGas(...args);
    return gasEstimate;
  } catch (error) {
    logger.warn(`Could not estimate gas: ${error.message}`);
    return null;
  }
}

module.exports = {
  loadNFTContract,
  loadLaunchpadContract,
  loadAllContracts,
  getSignerInfo,
  executeTx,
  hasRole,
  estimateGas,
};
