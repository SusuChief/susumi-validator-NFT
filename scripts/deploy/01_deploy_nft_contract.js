const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Get contract factory
  const SusumiPioneerNFT = await hre.ethers.getContractFactory("SusumiPioneerNFT");

  // Deployment parameters
  const defaultAdmin = process.env.DEFAULT_ADMIN || deployer.address;
  const treasury = process.env.TREASURY || deployer.address;
  const baseURI = process.env.BASE_URI || "https://api.susumi.io/metadata/pioneer/";

  console.log("\nDeployment parameters:");
  console.log("Default Admin:", defaultAdmin);
  console.log("Treasury:", treasury);
  console.log("Base URI:", baseURI);

  // Deploy contract
  const nftContract = await SusumiPioneerNFT.deploy(
    defaultAdmin,
    treasury,
    baseURI
  );

  await nftContract.deployed();

  console.log("\n✅ SusumiPioneerNFT deployed to:", nftContract.address);

  // Grant MINTER_ROLE to deployer (will be updated to Launchpad address later)
  const MINTER_ROLE = await nftContract.MINTER_ROLE();
  await nftContract.grantRole(MINTER_ROLE, deployer.address);
  console.log("✅ Granted MINTER_ROLE to:", deployer.address);

  // Verify contract (if on testnet/mainnet)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n⏳ Waiting for block confirmations...");
    await nftContract.deployTransaction.wait(5);

    try {
      await hre.run("verify:verify", {
        address: nftContract.address,
        constructorArguments: [defaultAdmin, treasury, baseURI],
      });
      console.log("✅ Contract verified on Etherscan");
    } catch (error) {
      console.log("⚠️ Verification failed:", error.message);
    }
  }

  console.log("\n📋 Contract Information:");
  console.log("Token IDs:");
  console.log("  - Commander (GC5):", await nftContract.COMMANDER_TOKEN_ID());
  console.log("  - Counsellor (RC10):", await nftContract.COUNSELLOR_TOKEN_ID());
  console.log("  - Chancellor (RC12):", await nftContract.CHANCELLOR_TOKEN_ID());
  console.log("\nMax Supplies:");
  console.log("  - Commander:", await nftContract.COMMANDER_MAX_SUPPLY());
  console.log("  - Counsellor:", await nftContract.COUNSELLOR_MAX_SUPPLY());
  console.log("  - Chancellor:", await nftContract.CHANCELLOR_MAX_SUPPLY());

  console.log("\n💾 Save this address for Launchpad deployment:", nftContract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
