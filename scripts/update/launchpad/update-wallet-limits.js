/**
 * @title Update Wallet Limits Script
 * @notice Update per-wallet mint limits for NFT tiers
 * @usage npx hardhat run scripts/update/launchpad/update-wallet-limits.js --network <network>
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
  logger.header("📊 Update Per-Wallet Limits");

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

  // Show current limits
  logger.step(2, "Current per-wallet limits...");
  
  for (const [tokenId, name] of Object.entries(TOKEN_NAMES)) {
    const limit = await launchpad.maxPerWallet(tokenId);
    logger.data(name, `${limit} NFTs per wallet`);
  }

  // Select token
  logger.step(3, "Select tier to update...");
  const tokenId = await select("Select NFT tier:", [
    { value: TOKEN_IDS.COMMANDER, label: "Commander (5001)" },
    { value: TOKEN_IDS.COUNSELLOR, label: "Counsellor (10001)" },
    { value: TOKEN_IDS.CHANCELLOR, label: "Chancellor (12001)" },
  ]);

  const currentLimit = await launchpad.maxPerWallet(tokenId);
  const newLimitStr = await input(`New limit for ${TOKEN_NAMES[tokenId]}`, currentLimit.toString());
  const newLimit = parseInt(newLimitStr);

  if (newLimit < 0) {
    logger.error("Limit cannot be negative");
    process.exit(1);
  }

  // Show change
  logger.stateChange("Wallet Limit", currentLimit.toString(), newLimit.toString());

  const confirmed = await confirmOperation({
    "Contract": contractAddress,
    "Tier": TOKEN_NAMES[tokenId],
    "Current Limit": currentLimit.toString(),
    "New Limit": newLimit.toString(),
  });

  if (!confirmed) process.exit(0);

  // Execute
  logger.step(4, "Executing transaction...");
  await executeTx(
    () => launchpad.setMaxPerWallet(tokenId, newLimit),
    "setMaxPerWallet"
  );

  // Verify
  logger.step(5, "Verifying update...");
  const updatedLimit = await launchpad.maxPerWallet(tokenId);
  logger.success(`New limit: ${updatedLimit} NFTs per wallet`);

  logger.header("✅ Wallet Limit Update Complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error(error.message);
    console.error(error);
    process.exit(1);
  });
