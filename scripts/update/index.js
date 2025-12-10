/**
 * @title Susumi Contract Manager CLI
 * @notice Interactive CLI for managing smart contracts
 * @usage npx hardhat run scripts/update/index.js --network <network>
 */

const hre = require("hardhat");
const { logger, colors } = require("./helpers/logger");
const { select } = require("./helpers/prompt");
const { loadAllContracts, getSignerInfo, hasRole } = require("./helpers/contract-loader");
const { ROLES, TOKEN_IDS } = require("./config/contracts.config");

const TOKEN_NAMES = {
  [TOKEN_IDS.COMMANDER]: "Commander",
  [TOKEN_IDS.COUNSELLOR]: "Counsellor",
  [TOKEN_IDS.CHANCELLOR]: "Chancellor",
};

async function displayStatus(contracts, signerInfo) {
  const { nft, launchpad } = contracts;

  logger.separator();
  logger.info("📊 Current Contract Status");
  logger.separator();

  // NFT Contract Status
  const nftAddress = await nft.getAddress();
  const nftPaused = await nft.paused();
  
  console.log(`\n${colors.cyan}🎨 NFT Contract:${colors.reset} ${nftAddress}`);
  logger.data("Paused", nftPaused ? "⏸️  YES" : "▶️  NO");

  // Sample URI
  const uri = await nft.uri(TOKEN_IDS.COMMANDER);
  logger.data("Base URI", uri.replace("5001.json", ""));

  // Launchpad Status
  const launchpadAddress = await launchpad.getAddress();
  const saleOpen = await launchpad.saleOpen();
  const launchpadPaused = await launchpad.paused();
  const treasury = await launchpad.treasury();

  console.log(`\n${colors.cyan}🚀 Launchpad Contract:${colors.reset} ${launchpadAddress}`);
  logger.data("Sale Open", saleOpen ? "✅ YES" : "❌ NO");
  logger.data("Paused", launchpadPaused ? "⏸️  YES" : "▶️  NO");
  logger.data("Treasury", treasury);

  // Supply & Pricing
  console.log(`\n${colors.cyan}📈 Supply & Pricing:${colors.reset}`);
  for (const [tokenId, name] of Object.entries(TOKEN_NAMES)) {
    const supply = await launchpad.supply(tokenId);
    const remaining = await launchpad.getRemainingSupply(tokenId);
    const phase = await launchpad.getCurrentPhase(tokenId);
    const price = hre.ethers.formatUnits(await launchpad.getDynamicPrice(tokenId), 6);
    const entitlement = await launchpad.getSUSUPlusEntitlement(tokenId);
    
    console.log(`\n   ${colors.white}${name}:${colors.reset}`);
    logger.data("  Minted", supply.toString());
    logger.data("  Remaining", remaining.toString());
    logger.data("  Phase", phase.toString());
    logger.data("  Price", `$${price}`);
    logger.data("  SUSU+ per NFT", entitlement.toString());
  }

  // Permissions
  console.log(`\n${colors.cyan}🔐 Your Permissions:${colors.reset}`);
  const nftAdmin = await hasRole(nft, ROLES.ADMIN_ROLE, signerInfo.address);
  const launchpadAdmin = await hasRole(launchpad, ROLES.ADMIN_ROLE, signerInfo.address);
  const minter = await hasRole(nft, ROLES.MINTER_ROLE, signerInfo.address);
  
  logger.data("NFT Admin", nftAdmin ? "✅" : "❌");
  logger.data("Launchpad Admin", launchpadAdmin ? "✅" : "❌");
  logger.data("NFT Minter", minter ? "✅" : "❌");

  logger.separator();
}

async function main() {
  logger.header("🎮 Susumi Smart Contract Manager");

  const signerInfo = await getSignerInfo();
  logger.network(signerInfo.network, signerInfo.chainId);
  logger.data("Wallet", signerInfo.address);
  logger.data("Balance", `${signerInfo.balance} MATIC`);

  let contracts;
  try {
    contracts = await loadAllContracts();
  } catch (error) {
    logger.error("Failed to load contracts. Make sure addresses are configured.");
    logger.info("\nRequired environment variables:");
    logger.info(`  NFT_CONTRACT_ADDRESS_${signerInfo.network.toUpperCase()}`);
    logger.info(`  LAUNCHPAD_CONTRACT_ADDRESS_${signerInfo.network.toUpperCase()}`);
    logger.info("\nOr update scripts/update/config/contracts.config.js");
    process.exit(1);
  }

  // Display current status
  await displayStatus(contracts, signerInfo);

  // Main menu
  console.log("\n");
  const action = await select("What would you like to do?", [
    { value: "nft-uri", label: "🎨 Update NFT Base URI" },
    { value: "nft-royalty", label: "💰 Update NFT Royalty" },
    { value: "nft-roles", label: "🔐 Manage NFT Roles" },
    { value: "nft-rank", label: "📋 Update Rank Config" },
    { value: "launchpad-treasury", label: "🏦 Update Treasury Address" },
    { value: "launchpad-pricing", label: "💲 Update Phase Pricing" },
    { value: "launchpad-sale", label: "🎯 Manage Sale Status" },
    { value: "launchpad-limits", label: "📊 Update Wallet Limits" },
    { value: "launchpad-tokens", label: "💳 Manage Payment Tokens" },
    { value: "emergency-pause", label: "🚨 Emergency Pause All" },
    { value: "emergency-unpause", label: "▶️  Unpause All" },
    { value: "refresh", label: "🔄 Refresh Status" },
    { value: "exit", label: "🚪 Exit" },
  ]);

  const scripts = {
    "nft-uri": "nft/set-base-uri.js",
    "nft-royalty": "nft/update-royalty.js",
    "nft-roles": "nft/manage-roles.js",
    "nft-rank": "nft/update-rank-config.js",
    "launchpad-treasury": "launchpad/update-treasury.js",
    "launchpad-pricing": "launchpad/update-pricing.js",
    "launchpad-sale": "launchpad/manage-sale.js",
    "launchpad-limits": "launchpad/update-wallet-limits.js",
    "launchpad-tokens": "launchpad/manage-payment-tokens.js",
    "emergency-pause": "emergency/pause-all.js",
    "emergency-unpause": "emergency/unpause-all.js",
  };

  if (action === "exit") {
    logger.info("Goodbye! 👋");
    process.exit(0);
  }

  if (action === "refresh") {
    await displayStatus(contracts, signerInfo);
    logger.info("\nStatus refreshed. Run the script again to see menu.");
    process.exit(0);
  }

  const scriptPath = scripts[action];
  if (scriptPath) {
    console.log("\n");
    logger.info(`To run this operation, execute:`);
    console.log(`\n${colors.cyan}npx hardhat run scripts/update/${scriptPath} --network ${signerInfo.network}${colors.reset}\n`);
  } else {
    logger.error("Unknown action");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error(error.message);
    console.error(error);
    process.exit(1);
  });
