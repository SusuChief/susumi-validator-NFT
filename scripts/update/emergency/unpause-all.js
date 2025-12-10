/**
 * @title Unpause All Script
 * @notice Resume all paused contracts
 * @usage npx hardhat run scripts/update/emergency/unpause-all.js --network <network>
 */

const hre = require("hardhat");
const { logger } = require("../helpers/logger");
const { confirmOperation } = require("../helpers/prompt");
const { 
  loadAllContracts, 
  getSignerInfo, 
  executeTx, 
  hasRole 
} = require("../helpers/contract-loader");
const { ROLES } = require("../config/contracts.config");

async function main() {
  logger.header("▶️  Unpause All Contracts");

  const signerInfo = await getSignerInfo();
  logger.network(signerInfo.network, signerInfo.chainId);
  logger.data("Signer", signerInfo.address);

  const { nft, launchpad } = await loadAllContracts();

  // Check current status
  logger.step(1, "Checking current status...");
  
  const nftPaused = await nft.paused();
  const launchpadPaused = await launchpad.paused();
  
  logger.data("NFT Contract", nftPaused ? "⏸️  PAUSED" : "▶️  ACTIVE");
  logger.data("Launchpad Contract", launchpadPaused ? "⏸️  PAUSED" : "▶️  ACTIVE");

  if (!nftPaused && !launchpadPaused) {
    logger.success("All contracts are already active");
    process.exit(0);
  }

  // Check permissions
  logger.step(2, "Checking permissions...");
  
  const nftAdmin = await hasRole(nft, ROLES.ADMIN_ROLE, signerInfo.address);
  const launchpadAdmin = await hasRole(launchpad, ROLES.ADMIN_ROLE, signerInfo.address);
  
  logger.data("NFT Contract Admin", nftAdmin ? "✅" : "❌");
  logger.data("Launchpad Contract Admin", launchpadAdmin ? "✅" : "❌");

  // Confirm
  const confirmed = await confirmOperation({
    "Action": "Unpause All Contracts",
    "NFT Contract": nftPaused ? (nftAdmin ? "Will unpause" : "Cannot unpause (no admin)") : "Already active",
    "Launchpad Contract": launchpadPaused ? (launchpadAdmin ? "Will unpause" : "Cannot unpause (no admin)") : "Already active",
  });

  if (!confirmed) process.exit(0);

  // Execute
  logger.step(3, "Executing unpause...");

  if (nftAdmin && nftPaused) {
    await executeTx(() => nft.unpause(), "Unpause NFT Contract");
  } else if (!nftAdmin && nftPaused) {
    logger.warn("Cannot unpause NFT contract - no admin role");
  }

  if (launchpadAdmin && launchpadPaused) {
    await executeTx(() => launchpad.unpause(), "Unpause Launchpad Contract");
  } else if (!launchpadAdmin && launchpadPaused) {
    logger.warn("Cannot unpause Launchpad contract - no admin role");
  }

  // Verify
  logger.step(4, "Verifying status...");
  
  const nftFinalStatus = await nft.paused();
  const launchpadFinalStatus = await launchpad.paused();
  
  logger.success(`NFT Contract: ${nftFinalStatus ? "⏸️  PAUSED" : "▶️  ACTIVE ✅"}`);
  logger.success(`Launchpad Contract: ${launchpadFinalStatus ? "⏸️  PAUSED" : "▶️  ACTIVE ✅"}`);

  logger.header("✅ Contracts Unpaused Successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error(error.message);
    console.error(error);
    process.exit(1);
  });
