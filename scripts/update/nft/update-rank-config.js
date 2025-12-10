/**
 * @title Update Rank Config Script
 * @notice Update rank configuration for NFT tiers
 * @usage npx hardhat run scripts/update/nft/update-rank-config.js --network <network>
 */

const hre = require("hardhat");
const { logger } = require("../helpers/logger");
const { confirmOperation, input, select } = require("../helpers/prompt");
const { loadNFTContract, getSignerInfo, executeTx, hasRole } = require("../helpers/contract-loader");
const { ROLES, TOKEN_IDS } = require("../config/contracts.config");

const TOKEN_NAMES = {
  [TOKEN_IDS.COMMANDER]: "Commander",
  [TOKEN_IDS.COUNSELLOR]: "Counsellor",
  [TOKEN_IDS.CHANCELLOR]: "Chancellor",
};

async function main() {
  logger.header("📋 Update NFT Rank Configuration");

  const signerInfo = await getSignerInfo();
  logger.network(signerInfo.network, signerInfo.chainId);
  logger.data("Signer", signerInfo.address);

  const nftContract = await loadNFTContract();
  const contractAddress = await nftContract.getAddress();

  // Check permissions
  logger.step(1, "Checking permissions...");
  const isAdmin = await hasRole(nftContract, ROLES.ADMIN_ROLE, signerInfo.address);
  if (!isAdmin) {
    logger.error("Signer does not have ADMIN_ROLE");
    process.exit(1);
  }
  logger.success("Signer has ADMIN_ROLE");

  // Select token
  logger.step(2, "Select tier to update...");
  const tokenId = await select("Select NFT tier:", [
    { value: TOKEN_IDS.COMMANDER, label: "Commander (5001) - GC5" },
    { value: TOKEN_IDS.COUNSELLOR, label: "Counsellor (10001) - RC10" },
    { value: TOKEN_IDS.CHANCELLOR, label: "Chancellor (12001) - RC12" },
  ]);

  // Get current config
  logger.step(3, "Getting current configuration...");
  const currentConfig = await nftContract.getRankConfig(tokenId);
  
  logger.info(`Current ${TOKEN_NAMES[tokenId]} Configuration:`);
  logger.data("Series Code", currentConfig.seriesCode);
  logger.data("Rank Title", currentConfig.rankTitle);
  logger.data("VE Tier", currentConfig.veTier.toString());
  logger.data("Fund Access", currentConfig.fundAccess.toString());
  logger.data("Is Validator", currentConfig.isValidator ? "Yes" : "No");
  logger.data("L1 Share", `${currentConfig.l1Share} basis points`);
  logger.data("L2 Share", `${currentConfig.l2Share} basis points`);
  logger.data("L3 Share", `${currentConfig.l3Share} basis points`);

  // Get new values
  logger.step(4, "Enter new configuration values (press Enter to keep current)...");
  
  const newSeriesCode = await input("Series Code", currentConfig.seriesCode);
  const newRankTitle = await input("Rank Title", currentConfig.rankTitle);
  const newVeTier = parseInt(await input("VE Tier (1 or 2)", currentConfig.veTier.toString()));
  const newFundAccess = parseInt(await input("Fund Access (1=Basic, 2=Enterprise, 3=Community)", currentConfig.fundAccess.toString()));
  const newIsValidator = (await input("Is Validator (true/false)", currentConfig.isValidator ? "true" : "false")).toLowerCase() === "true";
  const newL1Share = parseInt(await input("L1 Share (basis points)", currentConfig.l1Share.toString()));
  const newL2Share = parseInt(await input("L2 Share (basis points)", currentConfig.l2Share.toString()));
  const newL3Share = parseInt(await input("L3 Share (basis points)", currentConfig.l3Share.toString()));

  // Validate
  if (newVeTier !== 1 && newVeTier !== 2) {
    logger.error("VE Tier must be 1 or 2");
    process.exit(1);
  }

  if (newFundAccess < 1 || newFundAccess > 3) {
    logger.error("Fund Access must be 1, 2, or 3");
    process.exit(1);
  }

  // Prepare new config struct
  const newConfig = {
    seriesCode: newSeriesCode,
    rankTitle: newRankTitle,
    veTier: newVeTier,
    fundAccess: newFundAccess,
    isValidator: newIsValidator,
    l1Share: newL1Share,
    l2Share: newL2Share,
    l3Share: newL3Share,
  };

  // Show changes
  logger.step(5, "Review changes...");
  logger.info("Changes to be applied:");
  
  if (newSeriesCode !== currentConfig.seriesCode) {
    logger.stateChange("Series Code", currentConfig.seriesCode, newSeriesCode);
  }
  if (newRankTitle !== currentConfig.rankTitle) {
    logger.stateChange("Rank Title", currentConfig.rankTitle, newRankTitle);
  }
  if (newVeTier !== currentConfig.veTier) {
    logger.stateChange("VE Tier", currentConfig.veTier.toString(), newVeTier.toString());
  }
  if (newFundAccess !== currentConfig.fundAccess) {
    logger.stateChange("Fund Access", currentConfig.fundAccess.toString(), newFundAccess.toString());
  }
  if (newIsValidator !== currentConfig.isValidator) {
    logger.stateChange("Is Validator", currentConfig.isValidator ? "Yes" : "No", newIsValidator ? "Yes" : "No");
  }
  if (newL1Share !== currentConfig.l1Share) {
    logger.stateChange("L1 Share", currentConfig.l1Share.toString(), newL1Share.toString());
  }
  if (newL2Share !== currentConfig.l2Share) {
    logger.stateChange("L2 Share", currentConfig.l2Share.toString(), newL2Share.toString());
  }
  if (newL3Share !== currentConfig.l3Share) {
    logger.stateChange("L3 Share", currentConfig.l3Share.toString(), newL3Share.toString());
  }

  const confirmed = await confirmOperation({
    "Contract": contractAddress,
    "Token ID": tokenId,
    "Tier": TOKEN_NAMES[tokenId],
  });

  if (!confirmed) process.exit(0);

  // Execute
  logger.step(6, "Executing transaction...");
  await executeTx(
    () => nftContract.updateRankConfig(tokenId, newConfig),
    "updateRankConfig"
  );

  // Verify
  logger.step(7, "Verifying update...");
  const updatedConfig = await nftContract.getRankConfig(tokenId);
  
  logger.success("Updated configuration:");
  logger.data("Series Code", updatedConfig.seriesCode);
  logger.data("Rank Title", updatedConfig.rankTitle);
  logger.data("VE Tier", updatedConfig.veTier.toString());
  logger.data("Fund Access", updatedConfig.fundAccess.toString());
  logger.data("Is Validator", updatedConfig.isValidator ? "Yes" : "No");
  logger.data("L1 Share", `${updatedConfig.l1Share} basis points`);
  logger.data("L2 Share", `${updatedConfig.l2Share} basis points`);
  logger.data("L3 Share", `${updatedConfig.l3Share} basis points`);

  logger.header("✅ Rank Config Update Complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error(error.message);
    console.error(error);
    process.exit(1);
  });
