require("dotenv").config({ path: "./.env" });
require("@openzeppelin/hardhat-upgrades");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-contract-sizer");
require("hardhat-watcher");
require("hardhat-abi-exporter");

module.exports = {
  abiExporter: {
    path: "./abis",
    clear: true,
    flat: true,
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    testnet: {
      url: "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      accounts: [`${process.env.PRIVATE_KEY}`],
    },
    mainnet: {
      url: "https://polygon-mainnet.infura.io",
      chainId: 137,
      accounts: [`${process.env.PRIVATE_KEY}`],
    },
  },
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "paris",
    },
  },
  mocha: {
    timeout: 360000,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
  watcher: {
    compile: {
      tasks: ["compile"],
      files: ["./contracts"],
      verbose: true,
    },
  },
};
