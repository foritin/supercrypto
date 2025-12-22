import { http, createConfig } from 'wagmi'
import { mainnet, sepolia, type Chain } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

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

// 支持的网络列表
export const supportedChains = [mainnet, sepolia, customHardhat] as const

// 网络名称映射
export const chainNames: Record<number, string> = {
  [mainnet.id]: 'Ethereum Mainnet',
  [sepolia.id]: 'Sepolia Testnet',
  [customHardhat.id]: 'Hardhat',
}

// Wagmi 配置
export const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors: [
    injected(),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [customHardhat.id]: http(HARDHAT_RPC_URL),
  },
  ssr: true, // 启用 SSR 支持
})
