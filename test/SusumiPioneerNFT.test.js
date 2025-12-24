const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SusumiPioneerNFT", function () {
  let nftContract;
  let owner, treasury, minter, user1, user2;

  const COMMANDER_TOKEN_ID = 5001;
  const COUNSELLOR_TOKEN_ID = 10001;
  const CHANCELLOR_TOKEN_ID = 12001;
  
  const BASE_URI = "https://gateway.pinata.cloud/ipfs/bafybeigbyberieowlnhgasp4e72qkcpbiytsgxljgutv3qi4tlcr4eqczu/";

  beforeEach(async function () {
    [owner, treasury, minter, user1, user2] = await ethers.getSigners();

    const SusumiPioneerNFT = await ethers.getContractFactory("SusumiPioneerNFT");
    nftContract = await SusumiPioneerNFT.deploy(
      owner.address,
      treasury.address,
      BASE_URI
    );
    await nftContract.waitForDeployment();

    // Grant MINTER_ROLE to minter
    const MINTER_ROLE = await nftContract.MINTER_ROLE();
    await nftContract.grantRole(MINTER_ROLE, minter.address);
  });

  describe("Deployment", function () {
    it("Should set the correct admin roles", async function () {
      const ADMIN_ROLE = await nftContract.ADMIN_ROLE();
      expect(await nftContract.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("Should set the correct base URI", async function () {
      expect(await nftContract.uri(COMMANDER_TOKEN_ID)).to.equal(
        `${BASE_URI}${COMMANDER_TOKEN_ID}.json`
      );
    });

    it("Should initialize rank configurations", async function () {
      expect(await nftContract.getSeriesCode(COMMANDER_TOKEN_ID)).to.equal("GC5");
      expect(await nftContract.getRankTitle(COMMANDER_TOKEN_ID)).to.equal("Commander");
      expect(await nftContract.getVETier(COMMANDER_TOKEN_ID)).to.equal(1);
      expect(await nftContract.getFundAccess(COMMANDER_TOKEN_ID)).to.equal(2);
      expect(await nftContract.isValidatorRank(COMMANDER_TOKEN_ID)).to.be.true;

      expect(await nftContract.getSeriesCode(COUNSELLOR_TOKEN_ID)).to.equal("RC10");
      expect(await nftContract.getRankTitle(COUNSELLOR_TOKEN_ID)).to.equal("Counsellor");
      expect(await nftContract.getVETier(COUNSELLOR_TOKEN_ID)).to.equal(2);
      expect(await nftContract.getFundAccess(COUNSELLOR_TOKEN_ID)).to.equal(3);

      expect(await nftContract.getSeriesCode(CHANCELLOR_TOKEN_ID)).to.equal("RC12");
      expect(await nftContract.getRankTitle(CHANCELLOR_TOKEN_ID)).to.equal("Chancellor");
      expect(await nftContract.getVETier(CHANCELLOR_TOKEN_ID)).to.equal(2);
      expect(await nftContract.getFundAccess(CHANCELLOR_TOKEN_ID)).to.equal(3);
    });

    it("Should revert with zero address in constructor", async function () {
      const SusumiPioneerNFT = await ethers.getContractFactory("SusumiPioneerNFT");
      await expect(
        SusumiPioneerNFT.deploy(ethers.ZeroAddress, treasury.address, BASE_URI)
      ).to.be.reverted;
    });
  });

  describe("Max Supply", function () {
    it("Should return correct max supply for Commander", async function () {
      expect(await nftContract.getMaxSupply(COMMANDER_TOKEN_ID)).to.equal(4500);
    });

    it("Should return correct max supply for Counsellor", async function () {
      expect(await nftContract.getMaxSupply(COUNSELLOR_TOKEN_ID)).to.equal(400);
    });

    it("Should return correct max supply for Chancellor", async function () {
      expect(await nftContract.getMaxSupply(CHANCELLOR_TOKEN_ID)).to.equal(100);
    });

    it("Should revert for invalid token ID", async function () {
      await expect(nftContract.getMaxSupply(9999)).to.be.reverted;
    });
  });

  describe("Minting", function () {
    it("Should mint NFTs to user", async function () {
      await nftContract.connect(minter).mint(user1.address, COMMANDER_TOKEN_ID, 1);
      expect(await nftContract.balanceOf(user1.address, COMMANDER_TOKEN_ID)).to.equal(1);
      expect(await nftContract["totalSupply(uint256)"](COMMANDER_TOKEN_ID)).to.equal(1);
    });

    it("Should mint multiple NFTs", async function () {
      await nftContract.connect(minter).mint(user1.address, COMMANDER_TOKEN_ID, 5);
      expect(await nftContract.balanceOf(user1.address, COMMANDER_TOKEN_ID)).to.equal(5);
      expect(await nftContract["totalSupply(uint256)"](COMMANDER_TOKEN_ID)).to.equal(5);
    });

    it("Should not allow non-minter to mint", async function () {
      await expect(
        nftContract.connect(user1).mint(user1.address, COMMANDER_TOKEN_ID, 1)
      ).to.be.reverted;
    });

    it("Should not allow minting invalid token ID", async function () {
      await expect(
        nftContract.connect(minter).mint(user1.address, 9999, 1)
      ).to.be.reverted;
    });

    it("Should not allow minting beyond max supply", async function () {
      // Try to mint 1 more than max supply
      await expect(
        nftContract.connect(minter).mint(user1.address, CHANCELLOR_TOKEN_ID, 101)
      ).to.be.reverted;
    });

    it("Should allow minting up to max supply", async function () {
      await nftContract.connect(minter).mint(user1.address, CHANCELLOR_TOKEN_ID, 100);
      expect(await nftContract["totalSupply(uint256)"](CHANCELLOR_TOKEN_ID)).to.equal(100);
    });

    it("Should allow batch minting", async function () {
      await nftContract
        .connect(minter)
        .mintBatch(
          user1.address,
          [COMMANDER_TOKEN_ID, COUNSELLOR_TOKEN_ID],
          [10, 5]
        );
      expect(await nftContract.balanceOf(user1.address, COMMANDER_TOKEN_ID)).to.equal(10);
      expect(await nftContract.balanceOf(user1.address, COUNSELLOR_TOKEN_ID)).to.equal(5);
    });

    it("Should not allow batch minting with mismatched arrays", async function () {
      await expect(
        nftContract
          .connect(minter)
          .mintBatch(user1.address, [COMMANDER_TOKEN_ID, COUNSELLOR_TOKEN_ID], [10])
      ).to.be.reverted;
    });
  });

  describe("Rank Metadata", function () {
    it("Should return correct royalty shares", async function () {
      const [l1, l2, l3] = await nftContract.getRoyaltyShares(COMMANDER_TOKEN_ID);
      expect(l1).to.equal(0);
      expect(l2).to.equal(0);
      expect(l3).to.equal(0);
    });

    it("Should return full rank config", async function () {
      const config = await nftContract.getRankConfig(COMMANDER_TOKEN_ID);
      expect(config.seriesCode).to.equal("GC5");
      expect(config.rankTitle).to.equal("Commander");
      expect(config.veTier).to.equal(1);
      expect(config.fundAccess).to.equal(2);
      expect(config.isValidator).to.be.true;
    });

    it("Should revert for invalid token ID in getters", async function () {
      await expect(nftContract.getSeriesCode(9999)).to.be.reverted;
      await expect(nftContract.getRankTitle(9999)).to.be.reverted;
      await expect(nftContract.getVETier(9999)).to.be.reverted;
    });
  });

  describe("Admin Functions", function () {
    it("Should append missing trailing slash on base URI", async function () {
      const newURI = "https://new-uri.com";
      await nftContract.connect(owner).setBaseURI(newURI);
      expect(await nftContract.uri(COMMANDER_TOKEN_ID)).to.equal(
        `${newURI}/${COMMANDER_TOKEN_ID}.json`
      );
    });

    it("Should allow admin to update rank config", async function () {
      const newConfig = {
        seriesCode: "GC5",
        rankTitle: "Commander",
        veTier: 1,
        fundAccess: 2,
        isValidator: true,
        l1Share: 100,
        l2Share: 200,
        l3Share: 300,
      };
      await nftContract.connect(owner).updateRankConfig(COMMANDER_TOKEN_ID, newConfig);
      const [l1, l2, l3] = await nftContract.getRoyaltyShares(COMMANDER_TOKEN_ID);
      expect(l1).to.equal(100);
      expect(l2).to.equal(200);
      expect(l3).to.equal(300);
    });

    it("Should not allow non-admin to update rank config", async function () {
      const newConfig = {
        seriesCode: "GC5",
        rankTitle: "Commander",
        veTier: 1,
        fundAccess: 2,
        isValidator: true,
        l1Share: 100,
        l2Share: 200,
        l3Share: 300,
      };
      await expect(
        nftContract.connect(user1).updateRankConfig(COMMANDER_TOKEN_ID, newConfig)
      ).to.be.reverted;
    });

    it("Should allow admin to set base URI", async function () {
      const newURI = "https://new-uri.com/";
      await nftContract.connect(owner).setBaseURI(newURI);
      expect(await nftContract.uri(COMMANDER_TOKEN_ID)).to.equal(
        `${newURI}${COMMANDER_TOKEN_ID}.json`
      );
    });

    it("Should allow admin to set default royalty", async function () {
      await expect(
        nftContract.connect(owner).setDefaultRoyalty(treasury.address, 1000)
      )
        .to.emit(nftContract, "DefaultRoyaltyUpdated")
        .withArgs(treasury.address, 1000);
    });

    it("Should allow admin to set token-specific royalty", async function () {
      await expect(
        nftContract
          .connect(owner)
          .setTokenRoyalty(COMMANDER_TOKEN_ID, treasury.address, 750)
      )
        .to.emit(nftContract, "TokenRoyaltyUpdated")
        .withArgs(COMMANDER_TOKEN_ID, treasury.address, 750);
    });
  });

  describe("Metadata Freeze", function () {
    it("Should freeze metadata and block admin mutations", async function () {
      await nftContract.connect(owner).freezeMetadata();
      const frozenConfig = {
        seriesCode: "GC5",
        rankTitle: "Commander",
        veTier: 1,
        fundAccess: 2,
        isValidator: true,
        l1Share: 0,
        l2Share: 0,
        l3Share: 0,
      };
      await expect(
        nftContract.connect(owner).setBaseURI("https://blocked.com/")
      ).to.be.revertedWith("Metadata frozen");
      await expect(
        nftContract.connect(owner).updateRankConfig(COMMANDER_TOKEN_ID, frozenConfig)
      ).to.be.revertedWith("Metadata frozen");
      await expect(
        nftContract.connect(owner).setDefaultRoyalty(treasury.address, 500)
      ).to.be.revertedWith("Metadata frozen");
      await expect(
        nftContract.connect(owner).setTokenRoyalty(COMMANDER_TOKEN_ID, treasury.address, 500)
      ).to.be.revertedWith("Metadata frozen");
    });
  });

  describe("Rescue", function () {
    it("Should rescue ERC20 tokens to admin", async function () {
      const MockUSDT = await ethers.getContractFactory("MockUSDT");
      const token = await MockUSDT.deploy();
      await token.waitForDeployment();
      const tokenAddress = await token.getAddress();

      // send tokens to contract
      await token.mint(nftContract.target, 1000);
      const adminBalanceBefore = await token.balanceOf(owner.address);

      await expect(nftContract.connect(owner).rescue(tokenAddress))
        .to.emit(nftContract, "Rescue")
        .withArgs(tokenAddress, 1000);

      const adminBalanceAfter = await token.balanceOf(owner.address);
      expect(adminBalanceAfter - adminBalanceBefore).to.equal(1000);
    });

    it("Should rescue native balance to admin", async function () {
      // force balance by setting it directly (no receive function on contract)
      await ethers.provider.send("hardhat_setBalance", [
        nftContract.target,
        "0x4563918244F40000", // 5 ETH
      ]);
      const adminBalanceBefore = BigInt(await ethers.provider.getBalance(owner.address));

      const tx = await nftContract.connect(owner).rescue(ethers.ZeroAddress);
      const receipt = await tx.wait();
      const gasPrice = receipt.effectiveGasPrice ?? tx.gasPrice ?? 0;
      const gasUsed = BigInt(receipt.gasUsed) * BigInt(gasPrice);
      const adminBalanceAfter = BigInt(await ethers.provider.getBalance(owner.address));

      expect(adminBalanceAfter + gasUsed - adminBalanceBefore).to.equal(5n * ethers.WeiPerEther);
    });
  });

  describe("Pausable", function () {
    it("Should allow admin to pause contract", async function () {
      await nftContract.connect(owner).pause();
      await expect(
        nftContract.connect(minter).mint(user1.address, COMMANDER_TOKEN_ID, 1)
      ).to.be.reverted;
    });

    it("Should allow admin to unpause contract", async function () {
      await nftContract.connect(owner).pause();
      await nftContract.connect(owner).unpause();
      await nftContract.connect(minter).mint(user1.address, COMMANDER_TOKEN_ID, 1);
      expect(await nftContract.balanceOf(user1.address, COMMANDER_TOKEN_ID)).to.equal(1);
    });

    it("Should not allow non-admin to pause", async function () {
      await expect(nftContract.connect(user1).pause()).to.be.reverted;
    });

    it("Should prevent transfers when paused", async function () {
      await nftContract.connect(minter).mint(user1.address, COMMANDER_TOKEN_ID, 1);
      await nftContract.connect(owner).pause();
      await expect(
        nftContract
          .connect(user1)
          .safeTransferFrom(user1.address, user2.address, COMMANDER_TOKEN_ID, 1, "0x")
      ).to.be.reverted;
    });
  });

  describe("Transfers", function () {
    it("Should allow token transfers", async function () {
      await nftContract.connect(minter).mint(user1.address, COMMANDER_TOKEN_ID, 5);
      await nftContract
        .connect(user1)
        .safeTransferFrom(user1.address, user2.address, COMMANDER_TOKEN_ID, 2, "0x");
      expect(await nftContract.balanceOf(user1.address, COMMANDER_TOKEN_ID)).to.equal(3);
      expect(await nftContract.balanceOf(user2.address, COMMANDER_TOKEN_ID)).to.equal(2);
    });
  });
});
