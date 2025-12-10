/**
 * @title Manage Roles Script
 * @notice Grant or revoke roles on NFT contract
 * @usage npx hardhat run scripts/update/nft/manage-roles.js --network <network>
 */

const hre = require("hardhat");
const { logger } = require("../helpers/logger");
const { confirmOperation, dangerousConfirm, input, select } = require("../helpers/prompt");
const { loadNFTContract, getSignerInfo, executeTx, hasRole } = require("../helpers/contract-loader");
const { ROLES, TOKEN_IDS } = require("../config/contracts.config");

const ROLE_NAMES = {
  [ROLES.DEFAULT_ADMIN]: "DEFAULT_ADMIN_ROLE",
  [ROLES.ADMIN_ROLE]: "ADMIN_ROLE",
  [ROLES.MINTER_ROLE]: "MINTER_ROLE",
};

async function main() {
  logger.header("🔐 Manage NFT Contract Roles");

  const signerInfo = await getSignerInfo();
  logger.network(signerInfo.network, signerInfo.chainId);
  logger.data("Signer", signerInfo.address);

  const nftContract = await loadNFTContract();
  const contractAddress = await nftContract.getAddress();

  // Check permissions
  logger.step(1, "Checking your roles...");
  
  const hasDefaultAdmin = await hasRole(nftContract, ROLES.DEFAULT_ADMIN, signerInfo.address);
  const hasAdminRole = await hasRole(nftContract, ROLES.ADMIN_ROLE, signerInfo.address);
  const hasMinterRole = await hasRole(nftContract, ROLES.MINTER_ROLE, signerInfo.address);

  logger.data("DEFAULT_ADMIN_ROLE", hasDefaultAdmin ? "✅ YES" : "❌ NO");
  logger.data("ADMIN_ROLE", hasAdminRole ? "✅ YES" : "❌ NO");
  logger.data("MINTER_ROLE", hasMinterRole ? "✅ YES" : "❌ NO");

  if (!hasDefaultAdmin) {
    logger.error("Only DEFAULT_ADMIN_ROLE can manage roles");
    logger.info("Ask the contract owner to grant you DEFAULT_ADMIN_ROLE first");
    process.exit(1);
  }

  // Select action
  logger.step(2, "Select action...");
  const action = await select("What do you want to do?", [
    { value: "grant", label: "✅ Grant Role" },
    { value: "revoke", label: "❌ Revoke Role" },
    { value: "check", label: "🔍 Check Address Roles" },
  ]);

  if (action === "check") {
    const addressToCheck = await input("Enter address to check");
    
    if (!hre.ethers.isAddress(addressToCheck)) {
      logger.error("Invalid address");
      process.exit(1);
    }

    logger.info(`\nRoles for ${addressToCheck}:`);
    logger.data("DEFAULT_ADMIN_ROLE", (await hasRole(nftContract, ROLES.DEFAULT_ADMIN, addressToCheck)) ? "✅ YES" : "❌ NO");
    logger.data("ADMIN_ROLE", (await hasRole(nftContract, ROLES.ADMIN_ROLE, addressToCheck)) ? "✅ YES" : "❌ NO");
    logger.data("MINTER_ROLE", (await hasRole(nftContract, ROLES.MINTER_ROLE, addressToCheck)) ? "✅ YES" : "❌ NO");
    
    process.exit(0);
  }

  // Select role
  const role = await select("Select role:", [
    { value: ROLES.ADMIN_ROLE, label: "ADMIN_ROLE (can update config, pause, etc.)" },
    { value: ROLES.MINTER_ROLE, label: "MINTER_ROLE (can mint NFTs)" },
    { value: ROLES.DEFAULT_ADMIN, label: "DEFAULT_ADMIN_ROLE (can manage all roles) ⚠️" },
  ]);

  // Get target address
  const targetAddress = await input("Enter target address");
  
  if (!hre.ethers.isAddress(targetAddress)) {
    logger.error("Invalid target address");
    process.exit(1);
  }

  // Check current state
  logger.step(3, "Checking current role status...");
  const currentlyHasRole = await hasRole(nftContract, role, targetAddress);
  logger.data("Currently has role", currentlyHasRole ? "YES" : "NO");

  if (action === "grant" && currentlyHasRole) {
    logger.warn("Address already has this role");
    process.exit(0);
  }

  if (action === "revoke" && !currentlyHasRole) {
    logger.warn("Address does not have this role");
    process.exit(0);
  }

  // Special warning for dangerous operations
  let confirmed;
  if (role === ROLES.DEFAULT_ADMIN || 
      (action === "revoke" && targetAddress.toLowerCase() === signerInfo.address.toLowerCase())) {
    confirmed = await dangerousConfirm(
      `⚠️  You are about to ${action === "grant" ? "GRANT" : "REVOKE"} ${ROLE_NAMES[role]}\n` +
      `   ${action === "grant" ? "to" : "from"}: ${targetAddress}\n\n` +
      `   This is a critical operation that could affect contract security!`
    );
  } else {
    confirmed = await confirmOperation({
      "Action": action === "grant" ? "Grant Role" : "Revoke Role",
      "Role": ROLE_NAMES[role],
      "Target Address": targetAddress,
      "Contract": contractAddress,
    });
  }

  if (!confirmed) process.exit(0);

  // Execute
  logger.step(4, "Executing transaction...");
  
  if (action === "grant") {
    await executeTx(
      () => nftContract.grantRole(role, targetAddress),
      `grantRole(${ROLE_NAMES[role]})`
    );
  } else {
    await executeTx(
      () => nftContract.revokeRole(role, targetAddress),
      `revokeRole(${ROLE_NAMES[role]})`
    );
  }

  // Verify
  logger.step(5, "Verifying update...");
  const nowHasRole = await hasRole(nftContract, role, targetAddress);
  
  if (action === "grant" && nowHasRole) {
    logger.success(`${ROLE_NAMES[role]} granted to ${targetAddress}`);
  } else if (action === "revoke" && !nowHasRole) {
    logger.success(`${ROLE_NAMES[role]} revoked from ${targetAddress}`);
  } else {
    logger.error("Role update verification failed!");
    process.exit(1);
  }

  logger.header("✅ Role Management Complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error(error.message);
    console.error(error);
    process.exit(1);
  });
