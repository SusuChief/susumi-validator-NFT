/**
 * @title Manage Sale Script
 * @notice Open or close the NFT sale
 * @usage npx hardhat run scripts/update/launchpad/manage-sale.js --network <network>
 */

const hre = require("hardhat");
const { logger } = require("../helpers/logger");
const { confirmOperation, select } = require("../helpers/prompt");
const { loadLaunchpadContract, getSignerInfo, executeTx, hasRole } = require("../helpers/contract-loader");
const { ROLES, TOKEN_IDS } = require("../config/contracts.config");

const TOKEN_NAMES = {
  [TOKEN_IDS.COMMANDER]: "Commander",
  [TOKEN_IDS.COUNSELLOR]: "Counsellor",
  [TOKEN_IDS.CHANCELLOR]: "Chancellor",
};

async function main() {
  logger.header("🎯 Manage NFT Sale Status");

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

  // Get current status
  logger.step(2, "Getting current status...");
  const currentSaleOpen = await launchpad.saleOpen();
  const isPaused = await launchpad.paused();

  logger.data("Sale Open", currentSaleOpen ? "✅ YES" : "❌ NO");
  logger.data("Contract Paused", isPaused ? "⚠️  YES" : "✅ NO");

  // Show current supply info
  logger.info("\nCurrent Supply Status:");
  for (const [tokenId, name] of Object.entries(TOKEN_NAMES)) {
    const supply = await launchpad.supply(tokenId);
    const remaining = await launchpad.getRemainingSupply(tokenId);
    const phase = await launchpad.getCurrentPhase(tokenId);
    const price = hre.ethers.formatUnits(await launchpad.getDynamicPrice(tokenId), 6);
    logger.data(name, `Minted: ${supply} | Remaining: ${remaining} | Phase: ${phase} | Price: $${price}`);
  }

  // Select action
  logger.step(3, "Select action...");
  const action = await select("What do you want to do?", [
    { value: "open", label: "🟢 Open Sale" },
    { value: "close", label: "🔴 Close Sale" },
    { value: "status", label: "ℹ️  View Status Only (no change)" },
  ]);

  if (action === "status") {
    logger.info("No changes made");
    process.exit(0);
  }

  const newStatus = action === "open";

  if (currentSaleOpen === newStatus) {
    logger.warn(`Sale is already ${newStatus ? "open" : "closed"}`);
    process.exit(0);
  }

  // Warning if paused
  if (isPaused && action === "open") {
    logger.warn("⚠️  Contract is PAUSED! Sale will not work until unpaused.");
    logger.info("Run emergency/unpause-all.js first to unpause the contract.");
  }

  // Confirm
  const confirmed = await confirmOperation({
    "Contract": contractAddress,
    "Current Status": currentSaleOpen ? "OPEN" : "CLOSED",
    "New Status": newStatus ? "OPEN" : "CLOSED",
  });

  if (!confirmed) process.exit(0);

  // Execute
  logger.step(4, "Executing transaction...");
  await executeTx(
    () => launchpad.setSaleOpen(newStatus),
    "setSaleOpen"
  );

  // Verify
  logger.step(5, "Verifying update...");
  const updatedStatus = await launchpad.saleOpen();
  
  if (updatedStatus === newStatus) {
    logger.success(`Sale is now ${updatedStatus ? "OPEN ✅" : "CLOSED 🔴"}`);
  } else {
    logger.error("Status update verification failed!");
    process.exit(1);
  }

  logger.header("✅ Sale Status Update Complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error(error.message);
    console.error(error);
    process.exit(1);
  });
