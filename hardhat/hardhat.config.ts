import type { HardhatUserConfig } from "hardhat/config";

import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable } from "hardhat/config";

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
      mining: {
        auto: true,     // 自动挖矿，适合开发
        interval: 1000  // 每1秒自动挖一个区块（用于确认）
      },
      allowBlocksWithSameTimestamp: true,
      chainId: 31337,  // Hardhat 标准 chainId
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",  // 助记词
        path: "m/44'/60'/0'/0",  // HD 钱包派生路径
        initialIndex: 0,         // 起始索引
        count: 20,               // 生成 20 个账户
        accountsBalance: "10000000000000000000000" // 每个账户 10000 ETH
      }
    },
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
};

export default config;
