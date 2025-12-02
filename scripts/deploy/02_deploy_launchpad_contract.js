const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "MATIC");

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

  await launchpad.waitForDeployment();
  const launchpadAddress = await launchpad.getAddress();

  console.log("\n✅ SusumiLaunchpad deployed to:", launchpadAddress);

  // Grant MINTER_ROLE to Launchpad in NFT contract
  const nftContract = await hre.ethers.getContractAt("SusumiPioneerNFT", nftContractAddress);
  const MINTER_ROLE = await nftContract.MINTER_ROLE();
  await nftContract.grantRole(MINTER_ROLE, launchpadAddress);
  console.log("✅ Granted MINTER_ROLE to Launchpad in NFT contract");

  // Verify contract (if on testnet/mainnet)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n⏳ Waiting for block confirmations...");
    const deployTx = launchpad.deploymentTransaction();
    if (deployTx) await deployTx.wait(5);

    try {
      await hre.run("verify:verify", {
        address: launchpadAddress,
        constructorArguments: [
          nftContractAddress,
          defaultAdmin,
          treasury,
          usdtAddress,
          usdcAddress
        ],
      });
      console.log("✅ Contract verified on Polygonscan");
    } catch (error) {
      console.log("⚠️ Verification failed:", error.message);
    }
  }

  console.log("\n📋 Contract Information:");
  
  const COMMANDER_ID = await launchpad.COMMANDER_TOKEN_ID();
  const COUNSELLOR_ID = await launchpad.COUNSELLOR_TOKEN_ID();
  const CHANCELLOR_ID = await launchpad.CHANCELLOR_TOKEN_ID();
  
  console.log("Token IDs:");
  console.log("  - Commander:", COMMANDER_ID.toString());
  console.log("  - Counsellor:", COUNSELLOR_ID.toString());
  console.log("  - Chancellor:", CHANCELLOR_ID.toString());
  
  console.log("\nCurrent Phase & Pricing:");
  console.log("  - Commander Phase:", (await launchpad.getCurrentPhase(COMMANDER_ID)).toString());
  console.log("  - Commander Price: $", hre.ethers.formatUnits(await launchpad.getDynamicPrice(COMMANDER_ID), 6));
  console.log("  - Counsellor Phase:", (await launchpad.getCurrentPhase(COUNSELLOR_ID)).toString());
  console.log("  - Counsellor Price: $", hre.ethers.formatUnits(await launchpad.getDynamicPrice(COUNSELLOR_ID), 6));
  console.log("  - Chancellor Phase:", (await launchpad.getCurrentPhase(CHANCELLOR_ID)).toString());
  console.log("  - Chancellor Price: $", hre.ethers.formatUnits(await launchpad.getDynamicPrice(CHANCELLOR_ID), 6));

  console.log("\n⚠️  Next Steps:");
  console.log("1. Open the sale: launchpad.setSaleOpen(true)");
  console.log("2. Verify payment tokens are correctly set");
  console.log("3. Test minting with a small amount");

  console.log("\n💾 Launchpad Address:", launchpadAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
