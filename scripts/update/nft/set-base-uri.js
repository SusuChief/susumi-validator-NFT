/**
 * @title Set Base URI Script
 * @notice Update NFT metadata base URI
 * @usage npx hardhat run scripts/update/nft/set-base-uri.js --network <network>
 * @env NEW_BASE_URI - New base URI for metadata
 */

const hre = require("hardhat");
const { logger } = require("../helpers/logger");
const { confirm, confirmOperation } = require("../helpers/prompt");
const { loadNFTContract, getSignerInfo, executeTx, hasRole } = require("../helpers/contract-loader");
const { ROLES } = require("../config/contracts.config");

async function main() {
  logger.header("🎨 Update NFT Base URI");

  // Get signer info
  const signerInfo = await getSignerInfo();
  logger.network(signerInfo.network, signerInfo.chainId);
  logger.data("Signer", signerInfo.address);
  logger.data("Balance", `${signerInfo.balance} MATIC`);

  // Load contract
  const nftContract = await loadNFTContract();
  const contractAddress = await nftContract.getAddress();

  // Check permissions
  logger.step(1, "Checking permissions...");
  const isAdmin = await hasRole(nftContract, ROLES.ADMIN_ROLE, signerInfo.address);
  if (!isAdmin) {
    logger.error("Signer does not have ADMIN_ROLE on NFT contract");
    process.exit(1);
  }
  logger.success("Signer has ADMIN_ROLE");

  // Get current and new URI
  logger.step(2, "Getting current state...");
  
  // Test with Commander token ID to get current URI
  const currentURI = await nftContract.uri(5001);
  logger.data("Current URI (Commander)", currentURI);

  const newBaseURI = process.env.NEW_BASE_URI;
  if (!newBaseURI) {
    logger.error("NEW_BASE_URI environment variable is required");
    logger.info("Usage: NEW_BASE_URI='https://your-uri.com/' npx hardhat run scripts/update/nft/set-base-uri.js --network <network>");
    process.exit(1);
  }

  // Show state change
  logger.step(3, "Preparing update...");
  logger.stateChange("Base URI", currentURI.replace("5001.json", ""), newBaseURI);

  // Confirm operation
  const confirmed = await confirmOperation({
    "Contract": contractAddress,
    "Network": signerInfo.network,
    "Current Base URI": currentURI.replace("5001.json", ""),
    "New Base URI": newBaseURI,
    "Signer": signerInfo.address,
  });

  if (!confirmed) {
    process.exit(0);
  }

  // Execute transaction
  logger.step(4, "Executing transaction...");
  await executeTx(
    () => nftContract.setBaseURI(newBaseURI),
    "setBaseURI"
  );

  // Verify update
  logger.step(5, "Verifying update...");
  const updatedURI = await nftContract.uri(5001);
  logger.success(`New URI (Commander): ${updatedURI}`);

  // Show all token URIs
  logger.info("All Token URIs:");
  logger.data("Commander (5001)", await nftContract.uri(5001));
  logger.data("Counsellor (10001)", await nftContract.uri(10001));
  logger.data("Chancellor (12001)", await nftContract.uri(12001));

  logger.header("✅ Base URI Update Complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error(error.message);
    console.error(error);
    process.exit(1);
  });
