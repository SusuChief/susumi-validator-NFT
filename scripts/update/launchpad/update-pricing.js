/**
 * @title Update Phase Pricing Script
 * @notice Update dynamic pricing for NFT tiers
 * @usage npx hardhat run scripts/update/launchpad/update-pricing.js --network <network>
 */

const hre = require("hardhat");
const { logger } = require("../helpers/logger");
const { confirmOperation, input, select } = require("../helpers/prompt");
const { loadLaunchpadContract, getSignerInfo, executeTx, hasRole } = require("../helpers/contract-loader");
const { ROLES, TOKEN_IDS } = require("../config/contracts.config");

const TOKEN_NAMES = {
  [TOKEN_IDS.COMMANDER]: "Commander",
  [TOKEN_IDS.COUNSELLOR]: "Counsellor",
  [TOKEN_IDS.CHANCELLOR]: "Chancellor",
};

async function main() {
  logger.header("💲 Update Phase Pricing");

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

  // Show current pricing overview
  logger.step(2, "Current pricing overview...");
  
  for (const [tokenId, name] of Object.entries(TOKEN_NAMES)) {
    console.log(`\n   ${name}:`);
    for (let phase = 1; phase <= 4; phase++) {
      const config = await launchpad.tierPricing(tokenId, phase);
      const price = hre.ethers.formatUnits(config.priceUsd, 6);
      logger.data(`  Phase ${phase}`, `$${price} | SUSU+: ${config.susuPlusEntitlement.toString()}`);
    }
  }

  // Select token
  logger.step(3, "Select tier to update...");
  const tokenId = await select("Select NFT tier:", [
    { value: TOKEN_IDS.COMMANDER, label: "Commander (5001) - GC5" },
    { value: TOKEN_IDS.COUNSELLOR, label: "Counsellor (10001) - RC10" },
    { value: TOKEN_IDS.CHANCELLOR, label: "Chancellor (12001) - RC12" },
  ]);

  // Select phase
  const phase = await select("Select phase (1-4):", [
    { value: 1, label: "Phase 1" },
    { value: 2, label: "Phase 2" },
    { value: 3, label: "Phase 3" },
    { value: 4, label: "Phase 4" },
  ]);

  // Get current pricing
  logger.step(4, "Getting current pricing for selected tier/phase...");
  const currentConfig = await launchpad.tierPricing(tokenId, phase);
  const currentPrice = hre.ethers.formatUnits(currentConfig.priceUsd, 6);
  const currentEntitlement = currentConfig.susuPlusEntitlement.toString();

  logger.data("Current Price", `$${currentPrice}`);
  logger.data("Current SUSU+ Entitlement", currentEntitlement);

  // Get new values
  logger.step(5, "Enter new values...");
  const newPriceStr = await input("New price in USD (e.g., 300 for $300)", currentPrice);
  const newEntitlementStr = await input("New SUSU+ entitlement per NFT", currentEntitlement);

  const newPriceUsd = hre.ethers.parseUnits(newPriceStr, 6);
  const newEntitlement = BigInt(newEntitlementStr);

  // Show changes
  logger.step(6, "Review changes...");
  logger.stateChange("Price", `$${currentPrice}`, `$${newPriceStr}`);
  logger.stateChange("SUSU+ Entitlement", currentEntitlement, newEntitlementStr);

  const confirmed = await confirmOperation({
    "Contract": contractAddress,
    "Tier": TOKEN_NAMES[tokenId],
    "Phase": phase,
    "New Price": `$${newPriceStr}`,
    "New SUSU+ Entitlement": newEntitlementStr,
  });

  if (!confirmed) process.exit(0);

  // Execute
  logger.step(7, "Executing transaction...");
  await executeTx(
    () => launchpad.updatePhasePricing(tokenId, phase, newPriceUsd, newEntitlement),
    "updatePhasePricing"
  );

  // Verify
  logger.step(8, "Verifying update...");
  const updatedConfig = await launchpad.tierPricing(tokenId, phase);
  logger.success(`New Price: $${hre.ethers.formatUnits(updatedConfig.priceUsd, 6)}`);
  logger.success(`New Entitlement: ${updatedConfig.susuPlusEntitlement.toString()}`);

  logger.header("✅ Pricing Update Complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error(error.message);
    console.error(error);
    process.exit(1);
  });
