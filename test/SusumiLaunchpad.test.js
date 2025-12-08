const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SusumiLaunchpad", function () {
  let nftContract, launchpad, usdt, usdc;
  let nftContractAddress, launchpadAddress, usdtAddress, usdcAddress;
  let owner, treasury, user1, user2, user3;

  const COMMANDER_TOKEN_ID = 5001;
  const COUNSELLOR_TOKEN_ID = 10001;
  const CHANCELLOR_TOKEN_ID = 12001;

  const BASE_URI = "https://gateway.pinata.cloud/ipfs/QmZtXU5vHrdtHpxckfHz4ZYQkE3qTqbhwNYCNkwdipARMj/";

  // Helper function to convert USD to token amount (6 decimals)
  const usdToToken = (usd) => ethers.parseUnits(String(usd), 6);

  beforeEach(async function () {
    [owner, treasury, user1, user2, user3] = await ethers.getSigners();

    // Deploy mock USDT and USDC
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    usdt = await MockUSDT.deploy();
    await usdt.waitForDeployment();
    usdtAddress = await usdt.getAddress();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    usdcAddress = await usdc.getAddress();

    // Deploy NFT contract
    const SusumiPioneerNFT = await ethers.getContractFactory("SusumiPioneerNFT");
    nftContract = await SusumiPioneerNFT.deploy(owner.address, treasury.address, BASE_URI);
    await nftContract.waitForDeployment();
    nftContractAddress = await nftContract.getAddress();

    // Deploy Launchpad
    const SusumiLaunchpad = await ethers.getContractFactory("SusumiLaunchpad");
    launchpad = await SusumiLaunchpad.deploy(
      nftContractAddress,
      owner.address,
      treasury.address,
      usdtAddress,
      usdcAddress
    );
    await launchpad.waitForDeployment();
    launchpadAddress = await launchpad.getAddress();

    // Grant MINTER_ROLE to Launchpad
    const MINTER_ROLE = await nftContract.MINTER_ROLE();
    await nftContract.grantRole(MINTER_ROLE, launchpadAddress);

    // Give users some USDT and USDC (enough for large purchases)
    await usdt.mint(user1.address, usdToToken(1000000)); // $1M
    await usdt.mint(user2.address, usdToToken(1000000));
    await usdt.mint(user3.address, usdToToken(1000000));
    await usdc.mint(user1.address, usdToToken(1000000));
    await usdc.mint(user2.address, usdToToken(1000000));
    await usdc.mint(user3.address, usdToToken(1000000));

    // Open sale
    await launchpad.connect(owner).setSaleOpen(true);
  });

  describe("Deployment", function () {
    it("Should set correct NFT contract address", async function () {
      expect(await launchpad.nftContract()).to.equal(nftContractAddress);
    });

    it("Should set correct treasury", async function () {
      expect(await launchpad.treasury()).to.equal(treasury.address);
    });

    it("Should accept USDT and USDC as payment tokens", async function () {
      expect(await launchpad.acceptedPaymentTokens(usdtAddress)).to.be.true;
      expect(await launchpad.acceptedPaymentTokens(usdcAddress)).to.be.true;
    });

    it("Should initialize default per-wallet limits", async function () {
      expect(await launchpad.maxPerWallet(COMMANDER_TOKEN_ID)).to.equal(10);
      expect(await launchpad.maxPerWallet(COUNSELLOR_TOKEN_ID)).to.equal(5);
      expect(await launchpad.maxPerWallet(CHANCELLOR_TOKEN_ID)).to.equal(3);
    });

    it("Should initialize pricing correctly", async function () {
      // Commander Phase 1
      const commanderPhase1 = await launchpad.tierPricing(COMMANDER_TOKEN_ID, 1);
      expect(commanderPhase1.priceUsd).to.equal(usdToToken(250));
      expect(commanderPhase1.susuPlusEntitlement).to.equal(250000);

      // Counsellor Phase 1
      const counsellorPhase1 = await launchpad.tierPricing(COUNSELLOR_TOKEN_ID, 1);
      expect(counsellorPhase1.priceUsd).to.equal(usdToToken(750));
      expect(counsellorPhase1.susuPlusEntitlement).to.equal(750000);

      // Chancellor Phase 1
      const chancellorPhase1 = await launchpad.tierPricing(CHANCELLOR_TOKEN_ID, 1);
      expect(chancellorPhase1.priceUsd).to.equal(usdToToken(2500));
      expect(chancellorPhase1.susuPlusEntitlement).to.equal(2500000);
    });
  });

  describe("Phase System", function () {
    it("Should return phase 1 initially", async function () {
      expect(await launchpad.getCurrentPhase(COMMANDER_TOKEN_ID)).to.equal(1);
      expect(await launchpad.getCurrentPhase(COUNSELLOR_TOKEN_ID)).to.equal(1);
      expect(await launchpad.getCurrentPhase(CHANCELLOR_TOKEN_ID)).to.equal(1);
    });

    it("Should progress to phase 2 after threshold", async function () {
      // Increase per-wallet limit for this test
      await launchpad.connect(owner).setMaxPerWallet(COMMANDER_TOKEN_ID, 2000);
      
      // Mint 1125 Commanders to reach phase 2 threshold using multiple users
      const price = await launchpad.getDynamicPrice(COMMANDER_TOKEN_ID);
      const batchSize = 112n;
      const numBatches = 10;
      const remainder = 5n;
      
      // Approve and mint for each user
      for (let i = 0; i < numBatches; i++) {
        await usdt.connect(user1).approve(launchpadAddress, price * batchSize);
        await launchpad.connect(user1).mintValidatorNFT(COMMANDER_TOKEN_ID, batchSize, usdtAddress);
      }
      await usdt.connect(user1).approve(launchpadAddress, price * remainder);
      await launchpad.connect(user1).mintValidatorNFT(COMMANDER_TOKEN_ID, remainder, usdtAddress);

      expect(await launchpad.getCurrentPhase(COMMANDER_TOKEN_ID)).to.equal(2);
      const newPrice = await launchpad.getDynamicPrice(COMMANDER_TOKEN_ID);
      expect(newPrice).to.equal(usdToToken(300));
    });

    it("Should return correct next phase threshold", async function () {
      // Initially in phase 1, next threshold is phase 2
      expect(await launchpad.getNextPhaseThreshold(COMMANDER_TOKEN_ID)).to.equal(2250);
      expect(await launchpad.getNextPhaseThreshold(COUNSELLOR_TOKEN_ID)).to.equal(200);
      expect(await launchpad.getNextPhaseThreshold(CHANCELLOR_TOKEN_ID)).to.equal(50);
    });
  });

  describe("Dynamic Pricing", function () {
    it("Should return correct price for phase 1", async function () {
      expect(await launchpad.getDynamicPrice(COMMANDER_TOKEN_ID)).to.equal(usdToToken(250));
      expect(await launchpad.getDynamicPrice(COUNSELLOR_TOKEN_ID)).to.equal(usdToToken(750));
      expect(await launchpad.getDynamicPrice(CHANCELLOR_TOKEN_ID)).to.equal(usdToToken(2500));
    });

    it("Should return correct SUSU+ entitlement for phase 1", async function () {
      expect(await launchpad.getSUSUPlusEntitlement(COMMANDER_TOKEN_ID)).to.equal(250000);
      expect(await launchpad.getSUSUPlusEntitlement(COUNSELLOR_TOKEN_ID)).to.equal(750000);
      expect(await launchpad.getSUSUPlusEntitlement(CHANCELLOR_TOKEN_ID)).to.equal(2500000);
    });
  });

  describe("Minting", function () {
    it("Should mint NFT and track entitlement", async function () {
      const price = await launchpad.getDynamicPrice(COMMANDER_TOKEN_ID);
      await usdt.connect(user1).approve(launchpadAddress, price);

      await launchpad.connect(user1).mintValidatorNFT(COMMANDER_TOKEN_ID, 1, usdtAddress);

      expect(await nftContract.balanceOf(user1.address, COMMANDER_TOKEN_ID)).to.equal(1);
      expect(await launchpad.pioneerSUSUPlusEntitlement(user1.address, COMMANDER_TOKEN_ID)).to.equal(250000);
      expect(await launchpad.supply(COMMANDER_TOKEN_ID)).to.equal(1);
    });

    it("Should transfer payment to treasury", async function () {
      const price = await launchpad.getDynamicPrice(COMMANDER_TOKEN_ID);
      const treasuryBalanceBefore = await usdt.balanceOf(treasury.address);
      await usdt.connect(user1).approve(launchpadAddress, price);

      await launchpad.connect(user1).mintValidatorNFT(COMMANDER_TOKEN_ID, 1, usdtAddress);

      const treasuryBalanceAfter = await usdt.balanceOf(treasury.address);
      expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(price);
    });

    it("Should mint multiple NFTs", async function () {
      const price = await launchpad.getDynamicPrice(COMMANDER_TOKEN_ID);
      const totalPrice = price * 5n;
      await usdt.connect(user1).approve(launchpadAddress, totalPrice);

      await launchpad.connect(user1).mintValidatorNFT(COMMANDER_TOKEN_ID, 5, usdtAddress);

      expect(await nftContract.balanceOf(user1.address, COMMANDER_TOKEN_ID)).to.equal(5);
      expect(await launchpad.pioneerSUSUPlusEntitlement(user1.address, COMMANDER_TOKEN_ID)).to.equal(250000 * 5);
    });

    it("Should not allow minting when sale is closed", async function () {
      await launchpad.connect(owner).setSaleOpen(false);
      const price = await launchpad.getDynamicPrice(COMMANDER_TOKEN_ID);
      await usdt.connect(user1).approve(launchpadAddress, price);

      await expect(
        launchpad.connect(user1).mintValidatorNFT(COMMANDER_TOKEN_ID, 1, usdtAddress)
      ).to.be.reverted;
    });

    it("Should not allow minting with invalid token ID", async function () {
      const price = await launchpad.getDynamicPrice(COMMANDER_TOKEN_ID);
      await usdt.connect(user1).approve(launchpadAddress, price);

      await expect(
        launchpad.connect(user1).mintValidatorNFT(9999, 1, usdtAddress)
      ).to.be.reverted;
    });

    it("Should not allow minting with unaccepted payment token", async function () {
      const MockToken = await ethers.getContractFactory("MockUSDT");
      const fakeToken = await MockToken.deploy();
      await fakeToken.waitForDeployment();
      const fakeTokenAddress = await fakeToken.getAddress();
      await fakeToken.mint(user1.address, usdToToken(10000));
      await fakeToken.connect(user1).approve(launchpadAddress, usdToToken(10000));

      await expect(
        launchpad.connect(user1).mintValidatorNFT(COMMANDER_TOKEN_ID, 1, fakeTokenAddress)
      ).to.be.reverted;
    });

    it("Should enforce per-wallet limit", async function () {
      const price = await launchpad.getDynamicPrice(COMMANDER_TOKEN_ID);
      const totalPrice = price * 11n; // Try to mint 11 (limit is 10)
      await usdt.connect(user1).approve(launchpadAddress, totalPrice);

      await expect(
        launchpad.connect(user1).mintValidatorNFT(COMMANDER_TOKEN_ID, 11, usdtAddress)
      ).to.be.reverted;
    });

    it("Should enforce max supply", async function () {
      const price = await launchpad.getDynamicPrice(CHANCELLOR_TOKEN_ID);
      const totalPrice = price * 101n; // Try to mint 101 (max is 100)
      await usdt.connect(user1).approve(launchpadAddress, totalPrice);

      await expect(
        launchpad.connect(user1).mintValidatorNFT(CHANCELLOR_TOKEN_ID, 101, usdtAddress)
      ).to.be.reverted;
    });

    it("Should work with USDC", async function () {
      const price = await launchpad.getDynamicPrice(COMMANDER_TOKEN_ID);
      await usdc.connect(user1).approve(launchpadAddress, price);

      await launchpad.connect(user1).mintValidatorNFT(COMMANDER_TOKEN_ID, 1, usdcAddress);

      expect(await nftContract.balanceOf(user1.address, COMMANDER_TOKEN_ID)).to.equal(1);
    });
  });

  describe("SUSU+ Entitlement Tracking", function () {
    it("Should track entitlement per user and token ID", async function () {
      const price = await launchpad.getDynamicPrice(COMMANDER_TOKEN_ID);
      await usdt.connect(user1).approve(launchpadAddress, price * 2n);

      await launchpad.connect(user1).mintValidatorNFT(COMMANDER_TOKEN_ID, 1, usdtAddress);
      await launchpad.connect(user1).mintValidatorNFT(COMMANDER_TOKEN_ID, 1, usdtAddress);

      expect(await launchpad.pioneerSUSUPlusEntitlement(user1.address, COMMANDER_TOKEN_ID)).to.equal(500000);
    });

    it("Should track different entitlements for different tiers", async function () {
      const commanderPrice = await launchpad.getDynamicPrice(COMMANDER_TOKEN_ID);
      const counsellorPrice = await launchpad.getDynamicPrice(COUNSELLOR_TOKEN_ID);
      
      await usdt.connect(user1).approve(launchpadAddress, commanderPrice + counsellorPrice);

      await launchpad.connect(user1).mintValidatorNFT(COMMANDER_TOKEN_ID, 1, usdtAddress);
      await launchpad.connect(user1).mintValidatorNFT(COUNSELLOR_TOKEN_ID, 1, usdtAddress);

      expect(await launchpad.pioneerSUSUPlusEntitlement(user1.address, COMMANDER_TOKEN_ID)).to.equal(250000);
      expect(await launchpad.pioneerSUSUPlusEntitlement(user1.address, COUNSELLOR_TOKEN_ID)).to.equal(750000);
    });

    it("Should return total entitlement across all tiers", async function () {
      const commanderPrice = await launchpad.getDynamicPrice(COMMANDER_TOKEN_ID);
      const counsellorPrice = await launchpad.getDynamicPrice(COUNSELLOR_TOKEN_ID);
      const chancellorPrice = await launchpad.getDynamicPrice(CHANCELLOR_TOKEN_ID);
      
      const totalPrice = commanderPrice + counsellorPrice + chancellorPrice;
      await usdt.connect(user1).approve(launchpadAddress, totalPrice);

      await launchpad.connect(user1).mintValidatorNFT(COMMANDER_TOKEN_ID, 1, usdtAddress);
      await launchpad.connect(user1).mintValidatorNFT(COUNSELLOR_TOKEN_ID, 1, usdtAddress);
      await launchpad.connect(user1).mintValidatorNFT(CHANCELLOR_TOKEN_ID, 1, usdtAddress);

      const totalEntitlement = await launchpad.getUserTotalEntitlement(user1.address);
      expect(totalEntitlement).to.equal(250000 + 750000 + 2500000);
    });

    it("Should update entitlement based on phase", async function () {
      // Increase per-wallet limit for this test
      await launchpad.connect(owner).setMaxPerWallet(COMMANDER_TOKEN_ID, 2000);
      
      // Mint enough to reach phase 2 using multiple users
      const phase1Price = await launchpad.getDynamicPrice(COMMANDER_TOKEN_ID);
      const batchSize = 112n;
      const numBatches = 10;
      const remainder = 5n;
      
      // Mint 1125 to reach phase 2
      for (let i = 0; i < numBatches; i++) {
        await usdt.connect(user1).approve(launchpadAddress, phase1Price * batchSize);
        await launchpad.connect(user1).mintValidatorNFT(COMMANDER_TOKEN_ID, batchSize, usdtAddress);
      }
      await usdt.connect(user1).approve(launchpadAddress, phase1Price * remainder);
      await launchpad.connect(user1).mintValidatorNFT(COMMANDER_TOKEN_ID, remainder, usdtAddress);

      // Now mint in phase 2
      const phase2Price = await launchpad.getDynamicPrice(COMMANDER_TOKEN_ID);
      await usdt.connect(user2).approve(launchpadAddress, phase2Price);
      await launchpad.connect(user2).mintValidatorNFT(COMMANDER_TOKEN_ID, 1, usdtAddress);

      // User2 should get phase 2 entitlement (200,000)
      expect(await launchpad.pioneerSUSUPlusEntitlement(user2.address, COMMANDER_TOKEN_ID)).to.equal(200000);
    });
  });

  describe("Events", function () {
    it("Should emit NFTPurchased event", async function () {
      const price = await launchpad.getDynamicPrice(COMMANDER_TOKEN_ID);
      await usdt.connect(user1).approve(launchpadAddress, price);

      await expect(launchpad.connect(user1).mintValidatorNFT(COMMANDER_TOKEN_ID, 1, usdtAddress))
        .to.emit(launchpad, "NFTPurchased")
        .withArgs(
          user1.address,
          COMMANDER_TOKEN_ID,
          1,
          price,
          usdtAddress,
          1,
          250000
        );
    });

    it("Should emit PioneerEntitlementAssigned event", async function () {
      const price = await launchpad.getDynamicPrice(COMMANDER_TOKEN_ID);
      await usdt.connect(user1).approve(launchpadAddress, price);

      await expect(launchpad.connect(user1).mintValidatorNFT(COMMANDER_TOKEN_ID, 1, usdtAddress))
        .to.emit(launchpad, "PioneerEntitlementAssigned")
        .withArgs(user1.address, COMMANDER_TOKEN_ID, 250000);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to set payment token", async function () {
      const MockToken = await ethers.getContractFactory("MockUSDT");
      const newToken = await MockToken.deploy();
      await newToken.waitForDeployment();
      const newTokenAddress = await newToken.getAddress();

      await launchpad.connect(owner).setPaymentToken(newTokenAddress, true);
      expect(await launchpad.acceptedPaymentTokens(newTokenAddress)).to.be.true;
    });

    it("Should not allow non-admin to set payment token", async function () {
      await expect(
        launchpad.connect(user1).setPaymentToken(usdtAddress, false)
      ).to.be.reverted;
    });

    it("Should allow admin to update treasury", async function () {
      await launchpad.connect(owner).setTreasury(user1.address);
      expect(await launchpad.treasury()).to.equal(user1.address);
    });

    it("Should not allow setting zero address as treasury", async function () {
      await expect(
        launchpad.connect(owner).setTreasury(ethers.ZeroAddress)
      ).to.be.reverted;
    });

    it("Should allow admin to set max per wallet", async function () {
      await launchpad.connect(owner).setMaxPerWallet(COMMANDER_TOKEN_ID, 20);
      expect(await launchpad.maxPerWallet(COMMANDER_TOKEN_ID)).to.equal(20);
    });

    it("Should allow admin to open/close sale", async function () {
      await launchpad.connect(owner).setSaleOpen(false);
      expect(await launchpad.saleOpen()).to.be.false;
      await launchpad.connect(owner).setSaleOpen(true);
      expect(await launchpad.saleOpen()).to.be.true;
    });

    it("Should allow admin to update phase pricing", async function () {
      await launchpad.connect(owner).updatePhasePricing(
        COMMANDER_TOKEN_ID,
        1,
        usdToToken(275),
        275000
      );
      const config = await launchpad.tierPricing(COMMANDER_TOKEN_ID, 1);
      expect(config.priceUsd).to.equal(usdToToken(275));
      expect(config.susuPlusEntitlement).to.equal(275000);
    });

    it("Should not allow invalid phase in updatePhasePricing", async function () {
      await expect(
        launchpad.connect(owner).updatePhasePricing(COMMANDER_TOKEN_ID, 5, usdToToken(500), 500000)
      ).to.be.reverted;
    });

    it("Should allow admin to pause", async function () {
      await launchpad.connect(owner).pause();
      const price = await launchpad.getDynamicPrice(COMMANDER_TOKEN_ID);
      await usdt.connect(user1).approve(launchpadAddress, price);

      await expect(
        launchpad.connect(user1).mintValidatorNFT(COMMANDER_TOKEN_ID, 1, usdtAddress)
      ).to.be.reverted;
    });

    it("Should allow admin to unpause", async function () {
      await launchpad.connect(owner).pause();
      await launchpad.connect(owner).unpause();
      
      const price = await launchpad.getDynamicPrice(COMMANDER_TOKEN_ID);
      await usdt.connect(user1).approve(launchpadAddress, price);
      await launchpad.connect(user1).mintValidatorNFT(COMMANDER_TOKEN_ID, 1, usdtAddress);
      expect(await nftContract.balanceOf(user1.address, COMMANDER_TOKEN_ID)).to.equal(1);
    });
  });

  describe("Supply Tracking", function () {
    it("Should return correct remaining supply", async function () {
      const remainingBefore = await launchpad.getRemainingSupply(COMMANDER_TOKEN_ID);
      expect(remainingBefore).to.equal(4500);

      // Increase per-wallet limit for this test
      await launchpad.connect(owner).setMaxPerWallet(COMMANDER_TOKEN_ID, 200);
      
      const price = await launchpad.getDynamicPrice(COMMANDER_TOKEN_ID);
      await usdt.connect(user1).approve(launchpadAddress, price * 100n);
      await launchpad.connect(user1).mintValidatorNFT(COMMANDER_TOKEN_ID, 100, usdtAddress);

      const remainingAfter = await launchpad.getRemainingSupply(COMMANDER_TOKEN_ID);
      expect(remainingAfter).to.equal(4400);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle phase transition correctly", async function () {
      // Increase per-wallet limit for this test
      await launchpad.connect(owner).setMaxPerWallet(COMMANDER_TOKEN_ID, 2000);
      
      // Mint exactly at phase boundary
      const price = await launchpad.getDynamicPrice(COMMANDER_TOKEN_ID);
      const batchSize = 112n;
      const numBatches = 10;
      
      // Mint 1124 (still phase 1)
      for (let i = 0; i < numBatches; i++) {
        await usdt.connect(user1).approve(launchpadAddress, price * batchSize);
        await launchpad.connect(user1).mintValidatorNFT(COMMANDER_TOKEN_ID, batchSize, usdtAddress);
      }
      await usdt.connect(user1).approve(launchpadAddress, price * 4n);
      await launchpad.connect(user1).mintValidatorNFT(COMMANDER_TOKEN_ID, 4, usdtAddress);
      
      expect(await launchpad.getCurrentPhase(COMMANDER_TOKEN_ID)).to.equal(1);

      // Mint 1 more to enter phase 2
      await usdt.connect(user1).approve(launchpadAddress, price);
      await launchpad.connect(user1).mintValidatorNFT(COMMANDER_TOKEN_ID, 1, usdtAddress);
      expect(await launchpad.getCurrentPhase(COMMANDER_TOKEN_ID)).to.equal(2);
    });

    it("Should allow multiple users to mint", async function () {
      const price = await launchpad.getDynamicPrice(COMMANDER_TOKEN_ID);
      await usdt.connect(user1).approve(launchpadAddress, price);
      await usdt.connect(user2).approve(launchpadAddress, price);
      await usdt.connect(user3).approve(launchpadAddress, price);

      await launchpad.connect(user1).mintValidatorNFT(COMMANDER_TOKEN_ID, 1, usdtAddress);
      await launchpad.connect(user2).mintValidatorNFT(COMMANDER_TOKEN_ID, 1, usdtAddress);
      await launchpad.connect(user3).mintValidatorNFT(COMMANDER_TOKEN_ID, 1, usdtAddress);

      expect(await nftContract.balanceOf(user1.address, COMMANDER_TOKEN_ID)).to.equal(1);
      expect(await nftContract.balanceOf(user2.address, COMMANDER_TOKEN_ID)).to.equal(1);
      expect(await nftContract.balanceOf(user3.address, COMMANDER_TOKEN_ID)).to.equal(1);
      expect(await launchpad.supply(COMMANDER_TOKEN_ID)).to.equal(3);
    });
  });
});
