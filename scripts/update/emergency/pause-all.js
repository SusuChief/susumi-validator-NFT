/**
 * @title Emergency Pause Script
 * @notice Pause all contracts in case of emergency
 * @usage npx hardhat run scripts/update/emergency/pause-all.js --network <network>
 */

const hre = require("hardhat");
const { logger } = require("../helpers/logger");
const { dangerousConfirm } = require("../helpers/prompt");
const { 
  loadAllContracts, 
  getSignerInfo, 
  executeTx, 
  hasRole 
} = require("../helpers/contract-loader");
const { ROLES } = require("../config/contracts.config");

async function main() {
  logger.header("🚨 EMERGENCY PAUSE ALL CONTRACTS");

  const signerInfo = await getSignerInfo();
  logger.network(signerInfo.network, signerInfo.chainId);
  logger.data("Signer", signerInfo.address);

  const { nft, launchpad } = await loadAllContracts();

  // Check permissions
  logger.step(1, "Checking permissions...");
  
  const nftAdmin = await hasRole(nft, ROLES.ADMIN_ROLE, signerInfo.address);
  const launchpadAdmin = await hasRole(launchpad, ROLES.ADMIN_ROLE, signerInfo.address);
  
  logger.data("NFT Contract Admin", nftAdmin ? "✅" : "❌");
  logger.data("Launchpad Contract Admin", launchpadAdmin ? "✅" : "❌");

  if (!nftAdmin && !launchpadAdmin) {
    logger.error("Signer has no admin permissions on any contract");
    process.exit(1);
  }

  // Check current pause status
  logger.step(2, "Checking current status...");
  
  const nftPaused = await nft.paused();
  const launchpadPaused = await launchpad.paused();
  
  logger.data("NFT Contract", nftPaused ? "⏸️  PAUSED" : "▶️  ACTIVE");
  logger.data("Launchpad Contract", launchpadPaused ? "⏸️  PAUSED" : "▶️  ACTIVE");

  if (nftPaused && launchpadPaused) {
    logger.warn("All contracts are already paused");
    process.exit(0);
  }

  // Dangerous confirmation
  const confirmed = await dangerousConfirm(
    "⚠️  EMERGENCY PAUSE\n\n" +
    "This will:\n" +
    "  - Stop all NFT transfers\n" +
    "  - Stop all NFT minting\n" +
    "  - Stop all Launchpad sales\n\n" +
    "Use this only in case of security emergency!"
  );

  if (!confirmed) process.exit(0);

  // Execute pauses
  logger.step(3, "Executing emergency pause...");

  if (nftAdmin && !nftPaused) {
    await executeTx(() => nft.pause(), "Pause NFT Contract");
  } else if (!nftAdmin) {
    logger.warn("Cannot pause NFT contract - no admin role");
  } else {
    logger.info("NFT contract already paused");
  }

  if (launchpadAdmin && !launchpadPaused) {
    await executeTx(() => launchpad.pause(), "Pause Launchpad Contract");
  } else if (!launchpadAdmin) {
    logger.warn("Cannot pause Launchpad contract - no admin role");
  } else {
    logger.info("Launchpad contract already paused");
  }

  // Verify
  logger.step(4, "Verifying pause status...");
  
  const nftFinalStatus = await nft.paused();
  const launchpadFinalStatus = await launchpad.paused();
  
  logger.data("NFT Contract", nftFinalStatus ? "⏸️  PAUSED" : "▶️  ACTIVE");
  logger.data("Launchpad Contract", launchpadFinalStatus ? "⏸️  PAUSED" : "▶️  ACTIVE");

  logger.header("🚨 EMERGENCY PAUSE COMPLETE");
  logger.warn("Remember to unpause contracts when the situation is resolved!");
  logger.info("Run: npx hardhat run scripts/update/emergency/unpause-all.js --network <network>");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error(error.message);
    console.error(error);
    process.exit(1);
  });
