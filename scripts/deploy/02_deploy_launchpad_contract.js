const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Get contract factory
  const SusumiLaunchpad = await hre.ethers.getContractFactory("SusumiLaunchpad");

  // Deployment parameters
  const nftContractAddress = process.env.NFT_CONTRACT_ADDRESS;
  if (!nftContractAddress) {
    throw new Error("NFT_CONTRACT_ADDRESS environment variable is required");
  }

  const defaultAdmin = process.env.DEFAULT_ADMIN || deployer.address;
  const treasury = process.env.TREASURY || deployer.address;
  
  // Payment token addresses (Polygon mainnet/testnet)
  // Update these with actual addresses for your network
  const usdtAddress = process.env.USDT_ADDRESS || "0x0000000000000000000000000000000000000000";
  const usdcAddress = process.env.USDC_ADDRESS || "0x0000000000000000000000000000000000000000";

  console.log("\nDeployment parameters:");
  console.log("NFT Contract:", nftContractAddress);
  console.log("Default Admin:", defaultAdmin);
  console.log("Treasury:", treasury);
  console.log("USDT Address:", usdtAddress);
  console.log("USDC Address:", usdcAddress);

  // Deploy contract
  const launchpad = await SusumiLaunchpad.deploy(
    nftContractAddress,
    defaultAdmin,
    treasury,
    usdtAddress,
    usdcAddress
  );

  await launchpad.deployed();

  console.log("\n✅ SusumiLaunchpad deployed to:", launchpad.address);

  // Grant MINTER_ROLE to Launchpad in NFT contract
  const nftContract = await hre.ethers.getContractAt("SusumiPioneerNFT", nftContractAddress);
  const MINTER_ROLE = await nftContract.MINTER_ROLE();
  await nftContract.grantRole(MINTER_ROLE, launchpad.address);
  console.log("✅ Granted MINTER_ROLE to Launchpad in NFT contract");

  // Verify contract (if on testnet/mainnet)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n⏳ Waiting for block confirmations...");
    await launchpad.deployTransaction.wait(5);

    try {
      await hre.run("verify:verify", {
        address: launchpad.address,
        constructorArguments: [
          nftContractAddress,
          defaultAdmin,
          treasury,
          usdtAddress,
          usdcAddress
        ],
      });
      console.log("✅ Contract verified on Etherscan");
    } catch (error) {
      console.log("⚠️ Verification failed:", error.message);
    }
  }

  console.log("\n📋 Contract Information:");
  console.log("Token IDs:");
  console.log("  - Commander:", await launchpad.COMMANDER_TOKEN_ID());
  console.log("  - Counsellor:", await launchpad.COUNSELLOR_TOKEN_ID());
  console.log("  - Chancellor:", await launchpad.CHANCELLOR_TOKEN_ID());
  
  console.log("\nPhase Thresholds:");
  console.log("Commander:");
  console.log("  - Phase 1: 1 -", await launchpad.COMMANDER_PHASE_1_MAX());
  console.log("  - Phase 2:", await launchpad.COMMANDER_PHASE_1_MAX() + 1, "-", await launchpad.COMMANDER_PHASE_2_MAX());
  console.log("  - Phase 3:", await launchpad.COMMANDER_PHASE_2_MAX() + 1, "-", await launchpad.COMMANDER_PHASE_3_MAX());
  console.log("  - Phase 4:", await launchpad.COMMANDER_PHASE_3_MAX() + 1, "-", await launchpad.COMMANDER_PHASE_4_MAX());

  console.log("\n⚠️  Next Steps:");
  console.log("1. Open the sale: launchpad.setSaleOpen(true)");
  console.log("2. Verify payment tokens are correctly set");
  console.log("3. Test minting with a small amount");

  console.log("\n💾 Launchpad Address:", launchpad.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
