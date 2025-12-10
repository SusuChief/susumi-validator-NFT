/**
 * @title Update Treasury Script
 * @notice Update the treasury address for the launchpad
 * @usage npx hardhat run scripts/update/launchpad/update-treasury.js --network <network>
 * @env NEW_TREASURY - New treasury address
 */

const hre = require("hardhat");
const { logger } = require("../helpers/logger");
const { confirmOperation, dangerousConfirm } = require("../helpers/prompt");
const { loadLaunchpadContract, getSignerInfo, executeTx, hasRole } = require("../helpers/contract-loader");
const { ROLES } = require("../config/contracts.config");

async function main() {
  logger.header("🏦 Update Launchpad Treasury");

  const signerInfo = await getSignerInfo();
  logger.network(signerInfo.network, signerInfo.chainId);
  logger.data("Signer", signerInfo.address);

  const launchpad = await loadLaunchpadContract();
  const contractAddress = await launchpad.getAddress();

  // Check permissions
  logger.step(1, "Checking permissions...");
  const isAdmin = await hasRole(launchpad, ROLES.ADMIN_ROLE, signerInfo.address);
  if (!isAdmin) {
    logger.error("Signer does not have ADMIN_ROLE");
    process.exit(1);
  }
  logger.success("Signer has ADMIN_ROLE");

  // Get current treasury
  logger.step(2, "Getting current state...");
  const currentTreasury = await launchpad.treasury();
  logger.data("Current Treasury", currentTreasury);

  const newTreasury = process.env.NEW_TREASURY;
  if (!newTreasury) {
    logger.error("NEW_TREASURY environment variable is required");
    logger.info("Usage: NEW_TREASURY='0x...' npx hardhat run scripts/update/launchpad/update-treasury.js --network <network>");
    process.exit(1);
  }

  if (!hre.ethers.isAddress(newTreasury)) {
    logger.error("Invalid treasury address");
    process.exit(1);
  }

  if (currentTreasury.toLowerCase() === newTreasury.toLowerCase()) {
    logger.warn("New treasury is same as current treasury");
    process.exit(0);
  }

  // Show state change
  logger.step(3, "Preparing update...");
  logger.stateChange("Treasury", currentTreasury, newTreasury);

  // Dangerous confirmation (treasury change is critical)
  const confirmed = await dangerousConfirm(
    `⚠️  CRITICAL: This will redirect ALL future sale proceeds to:\n   ${newTreasury}\n\n   Make absolutely sure this address is correct!`
  );

  if (!confirmed) process.exit(0);

  // Execute
  logger.step(4, "Executing transaction...");
  await executeTx(
    () => launchpad.setTreasury(newTreasury),
    "setTreasury"
  );

  // Verify
  logger.step(5, "Verifying update...");
  const updatedTreasury = await launchpad.treasury();
  
  if (updatedTreasury.toLowerCase() === newTreasury.toLowerCase()) {
    logger.success(`Treasury updated to: ${updatedTreasury}`);
  } else {
    logger.error("Treasury update verification failed!");
    process.exit(1);
  }

  logger.header("✅ Treasury Update Complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error(error.message);
    console.error(error);
    process.exit(1);
  });
