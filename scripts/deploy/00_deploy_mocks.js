const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying Mock Stablecoins with the account:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "MATIC");

  // Only deploy mocks on local/testnet
  if (hre.network.name === "mainnet" || hre.network.name === "polygon") {
    console.log("⚠️  Skipping mock deployment on mainnet. Use real token addresses.");
    console.log("USDT (Polygon): 0xc2132D05D31c914a87C6611C10748AEb04B58e8F");
    console.log("USDC (Polygon): 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359");
    return;
  }

  // Deploy MockUSDT
  console.log("\n📦 Deploying MockUSDT...");
  const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
  const mockUSDT = await MockUSDT.deploy();
  await mockUSDT.waitForDeployment();
  const mockUSDTAddress = await mockUSDT.getAddress();
  console.log("✅ MockUSDT deployed to:", mockUSDTAddress);

  // Deploy MockUSDC
  console.log("\n📦 Deploying MockUSDC...");
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("✅ MockUSDC deployed to:", mockUSDCAddress);

  // Verify initial balances
  const usdtBalance = await mockUSDT.balanceOf(deployer.address);
  const usdcBalance = await mockUSDC.balanceOf(deployer.address);
  
  console.log("\n💰 Initial Balances (deployer):");
  console.log("  - USDT:", hre.ethers.formatUnits(usdtBalance, 6), "USDT");
  console.log("  - USDC:", hre.ethers.formatUnits(usdcBalance, 6), "USDC");

  // Verify contracts on testnet
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n⏳ Waiting for block confirmations...");
    const usdtTx = mockUSDT.deploymentTransaction();
    const usdcTx = mockUSDC.deploymentTransaction();
    if (usdtTx) await usdtTx.wait(5);
    if (usdcTx) await usdcTx.wait(5);

    try {
      console.log("Verifying MockUSDT...");
      await hre.run("verify:verify", {
        address: mockUSDTAddress,
        constructorArguments: [],
        contract: "contracts/mocks/MockUSDT.sol:MockUSDT",
      });
      console.log("✅ MockUSDT verified");
    } catch (error) {
      console.log("⚠️ MockUSDT verification failed:", error.message);
    }

    try {
      console.log("Verifying MockUSDC...");
      await hre.run("verify:verify", {
        address: mockUSDCAddress,
        constructorArguments: [],
        contract: "contracts/mocks/MockUSDC.sol:MockUSDC",
      });
      console.log("✅ MockUSDC verified");
    } catch (error) {
      console.log("⚠️ MockUSDC verification failed:", error.message);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("MockUSDT:", mockUSDTAddress);
  console.log("MockUSDC:", mockUSDCAddress);
  console.log("=".repeat(60));
  
  console.log("\n💡 Use these addresses for Launchpad deployment:");
  console.log(`export USDT_ADDRESS=${mockUSDTAddress}`);
  console.log(`export USDC_ADDRESS=${mockUSDCAddress}`);
  
  console.log("\n📝 Or add to .env file:");
  console.log(`USDT_ADDRESS=${mockUSDTAddress}`);
  console.log(`USDC_ADDRESS=${mockUSDCAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
