import { http, createConfig } from 'wagmi'
import { mainnet, sepolia, arbitrum, type Chain } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

// 环境判断: development 或 production
const IS_PRODUCTION = process.env.NEXT_PUBLIC_ENV === 'production'

// Hardhat 开发网络 RPC URL - 优先环境变量，默认远程开发服务器
const HARDHAT_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'http://YOUR_RPC_HOST:8545'

// 自定义 Hardhat 链配置
const customHardhat: Chain = {
  id: 31337,
  name: 'Hardhat',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: [HARDHAT_RPC_URL] },
    public: { http: [HARDHAT_RPC_URL] },
  },
}

// 开发环境网络: Hardhat, Sepolia
const developmentChains = [customHardhat, sepolia] as const

// 生产环境网络: Ethereum Mainnet, Arbitrum One
const productionChains = [mainnet, arbitrum] as const

// 根据环境选择支持的网络列表
export const supportedChains = IS_PRODUCTION ? productionChains : developmentChains

// 网络名称映射
export const chainNames: Record<number, string> = {
  [mainnet.id]: 'Ethereum Mainnet',
  [arbitrum.id]: 'Arbitrum One',
  [sepolia.id]: 'Sepolia Testnet',
  [customHardhat.id]: 'Hardhat',
}

// Wagmi 配置 - 根据环境动态配置
export const wagmiConfig = createConfig({
  chains: supportedChains as unknown as readonly [Chain, ...Chain[]],
  connectors: [
    injected(),
  ],
  transports: IS_PRODUCTION 
    ? {
        [mainnet.id]: http(),
        [arbitrum.id]: http(),
      }
    : {
        [customHardhat.id]: http(HARDHAT_RPC_URL),
        [sepolia.id]: http(),
      },
  ssr: true, // 启用 SSR 支持
})
