/**
 * @title Update Royalty Script
 * @notice Update NFT royalty settings (ERC2981)
 * @usage npx hardhat run scripts/update/nft/update-royalty.js --network <network>
 * @env ROYALTY_RECEIVER - Address to receive royalties
 * @env ROYALTY_FEE - Fee in basis points (e.g., 500 = 5%)
 * @env TOKEN_ID - (Optional) Token ID for token-specific royalty
 */

const hre = require("hardhat");
const { logger } = require("../helpers/logger");
const { confirmOperation, input, select } = require("../helpers/prompt");
const { loadNFTContract, getSignerInfo, executeTx, hasRole } = require("../helpers/contract-loader");
const { ROLES, TOKEN_IDS } = require("../config/contracts.config");

async function main() {
  logger.header("💰 Update NFT Royalty Settings");

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

  // Get operation type
  logger.step(2, "Select operation type...");
  const operationType = await select("Select royalty update type:", [
    { value: "default", label: "Update Default Royalty (all tokens)" },
    { value: "token", label: "Update Token-Specific Royalty" },
  ]);

  // Get parameters
  const receiver = process.env.ROYALTY_RECEIVER || await input("Royalty receiver address");
  const feeInput = process.env.ROYALTY_FEE || await input("Royalty fee in basis points (500 = 5%)", "500");
  const fee = parseInt(feeInput);

  if (!hre.ethers.isAddress(receiver)) {
    logger.error("Invalid receiver address");
    process.exit(1);
  }

  if (fee < 0 || fee > 10000) {
    logger.error("Fee must be between 0 and 10000 basis points");
    process.exit(1);
  }

  let tokenId = null;
  if (operationType === "token") {
    tokenId = await select("Select token:", [
      { value: TOKEN_IDS.COMMANDER, label: "Commander (5001)" },
      { value: TOKEN_IDS.COUNSELLOR, label: "Counsellor (10001)" },
      { value: TOKEN_IDS.CHANCELLOR, label: "Chancellor (12001)" },
    ]);
  }

  // Get current royalty info
  logger.step(3, "Getting current royalty info...");
  const testSalePrice = hre.ethers.parseUnits("1000", 6); // $1000 test
  const testTokenId = tokenId || TOKEN_IDS.COMMANDER;
  const [currentReceiver, currentAmount] = await nftContract.royaltyInfo(testTokenId, testSalePrice);
  const currentFee = (currentAmount * 10000n) / testSalePrice;
  
  logger.data("Current Receiver", currentReceiver);
  logger.data("Current Fee", `${currentFee.toString()} basis points (${Number(currentFee) / 100}%)`);

  // Confirm
  const params = {
    "Operation": operationType === "default" ? "Update Default Royalty" : "Update Token Royalty",
    "Contract": contractAddress,
    "New Receiver": receiver,
    "New Fee": `${fee} basis points (${fee / 100}%)`,
  };
  if (tokenId) {
    params["Token ID"] = tokenId;
  }

  const confirmed = await confirmOperation(params);
  if (!confirmed) process.exit(0);

  // Execute
  logger.step(4, "Executing transaction...");
  
  if (operationType === "default") {
    await executeTx(
      () => nftContract.setDefaultRoyalty(receiver, fee),
      "setDefaultRoyalty"
    );
  } else {
    await executeTx(
      () => nftContract.setTokenRoyalty(tokenId, receiver, fee),
      "setTokenRoyalty"
    );
  }

  // Verify
  logger.step(5, "Verifying update...");
  const [newReceiver, newAmount] = await nftContract.royaltyInfo(testTokenId, testSalePrice);
  const newFee = (newAmount * 10000n) / testSalePrice;
  
  logger.success(`New Receiver: ${newReceiver}`);
  logger.success(`New Fee: ${newFee.toString()} basis points`);

  logger.header("✅ Royalty Update Complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error(error.message);
    console.error(error);
    process.exit(1);
  });
