/**
 * @title Manage Payment Tokens Script
 * @notice Add or remove accepted payment tokens (USDT, USDC, etc.)
 * @usage npx hardhat run scripts/update/launchpad/manage-payment-tokens.js --network <network>
 */

const hre = require("hardhat");
const { logger } = require("../helpers/logger");
const { confirmOperation, input, select } = require("../helpers/prompt");
const { loadLaunchpadContract, getSignerInfo, executeTx, hasRole } = require("../helpers/contract-loader");
const { ROLES, getNetworkConfig } = require("../config/contracts.config");

async function main() {
  logger.header("💳 Manage Payment Tokens");

  const signerInfo = await getSignerInfo();
  logger.network(signerInfo.network, signerInfo.chainId);
  logger.data("Signer", signerInfo.address);

  const launchpad = await loadLaunchpadContract();
  const contractAddress = await launchpad.getAddress();
  const networkConfig = getNetworkConfig(hre.network.name);

  // Check permissions
  logger.step(1, "Checking permissions...");
  const isAdmin = await hasRole(launchpad, ROLES.ADMIN_ROLE, signerInfo.address);
  if (!isAdmin) {
    logger.error("Signer does not have ADMIN_ROLE");
    process.exit(1);
  }
  logger.success("Signer has ADMIN_ROLE");

  // Check known token addresses
  logger.step(2, "Checking current payment token status...");
  
  const knownTokens = [
    { name: "USDT", address: networkConfig.usdt },
    { name: "USDC", address: networkConfig.usdc },
  ];

  for (const token of knownTokens) {
    if (token.address && token.address !== "0x0000000000000000000000000000000000000000") {
      const isAccepted = await launchpad.acceptedPaymentTokens(token.address);
      logger.data(token.name, `${token.address} - ${isAccepted ? "✅ Accepted" : "❌ Not Accepted"}`);
    } else {
      logger.data(token.name, "Not configured");
    }
  }

  // Select action
  logger.step(3, "Select action...");
  const action = await select("What do you want to do?", [
    { value: "add", label: "✅ Add/Enable Payment Token" },
    { value: "remove", label: "❌ Remove/Disable Payment Token" },
    { value: "check", label: "🔍 Check Specific Token Address" },
  ]);

  if (action === "check") {
    const tokenAddress = await input("Enter token address to check");
    
    if (!hre.ethers.isAddress(tokenAddress)) {
      logger.error("Invalid address");
      process.exit(1);
    }

    const isAccepted = await launchpad.acceptedPaymentTokens(tokenAddress);
    logger.info(`\nToken ${tokenAddress}: ${isAccepted ? "✅ ACCEPTED" : "❌ NOT ACCEPTED"}`);
    process.exit(0);
  }

  // Get token address
  logger.step(4, "Select or enter token address...");
  
  const tokenSelection = await select("Select token:", [
    { value: networkConfig.usdt, label: `USDT (${networkConfig.usdt || "not configured"})` },
    { value: networkConfig.usdc, label: `USDC (${networkConfig.usdc || "not configured"})` },
    { value: "custom", label: "Enter custom address" },
  ]);

  let tokenAddress = tokenSelection;
  if (tokenSelection === "custom") {
    tokenAddress = await input("Enter token address");
  }

  if (!hre.ethers.isAddress(tokenAddress)) {
    logger.error("Invalid token address");
    process.exit(1);
  }

  // Check current status
  const currentlyAccepted = await launchpad.acceptedPaymentTokens(tokenAddress);
  logger.data("Current Status", currentlyAccepted ? "Accepted" : "Not Accepted");

  if (action === "add" && currentlyAccepted) {
    logger.warn("Token is already accepted");
    process.exit(0);
  }

  if (action === "remove" && !currentlyAccepted) {
    logger.warn("Token is already not accepted");
    process.exit(0);
  }

  // Confirm
  const newStatus = action === "add";
  
  const confirmed = await confirmOperation({
    "Contract": contractAddress,
    "Token Address": tokenAddress,
    "Action": action === "add" ? "Enable as Payment Token" : "Disable as Payment Token",
    "Current Status": currentlyAccepted ? "Accepted" : "Not Accepted",
    "New Status": newStatus ? "Accepted" : "Not Accepted",
  });

  if (!confirmed) process.exit(0);

  // Execute
  logger.step(5, "Executing transaction...");
  await executeTx(
    () => launchpad.setPaymentToken(tokenAddress, newStatus),
    "setPaymentToken"
  );

  // Verify
  logger.step(6, "Verifying update...");
  const updatedStatus = await launchpad.acceptedPaymentTokens(tokenAddress);
  
  if (updatedStatus === newStatus) {
    logger.success(`Token ${tokenAddress} is now ${updatedStatus ? "ACCEPTED ✅" : "NOT ACCEPTED ❌"}`);
  } else {
    logger.error("Payment token update verification failed!");
    process.exit(1);
  }

  logger.header("✅ Payment Token Update Complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error(error.message);
    console.error(error);
    process.exit(1);
  });
