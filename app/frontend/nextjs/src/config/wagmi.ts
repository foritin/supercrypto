import { http, createConfig } from 'wagmi'
import { mainnet, sepolia, arbitrum, type Chain } from 'wagmi/chains'

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
export const developmentChains = [customHardhat, sepolia] as const

// 生产环境网络: Ethereum Mainnet, Arbitrum One
export const productionChains = [mainnet, arbitrum] as const

// 根据环境选择支持的网络列表
export const supportedChains = IS_PRODUCTION ? productionChains : developmentChains

// 网络名称映射
export const chainNames: Record<number, string> = {
  [mainnet.id]: 'Ethereum Mainnet',
  [arbitrum.id]: 'Arbitrum One',
  [sepolia.id]: 'Sepolia Testnet',
  [customHardhat.id]: 'Hardhat',
}

// 网络图标映射 (用于自定义 UI)
export const chainIcons: Record<number, string> = {
  [mainnet.id]: '/icons/eth.svg',
  [arbitrum.id]: '/icons/arb.svg',
  [sepolia.id]: '/icons/eth-test.svg',
  [customHardhat.id]: '/icons/hardhat.svg',
}

// 获取当前环境的 RPC URL
export function getRpcUrl(chainId: number): string {
  switch (chainId) {
    case customHardhat.id:
      return HARDHAT_RPC_URL
    case sepolia.id:
      return 'https://rpc.sepolia.org'
    case mainnet.id:
      return 'https://eth-mainnet.g.alchemy.com/v2/demo'
    case arbitrum.id:
      return 'https://arb1.arbitrum.io/rpc'
    default:
      return ''
  }
}

// 导出 Hardhat RPC URL 供其他模块使用
export { HARDHAT_RPC_URL }

// 注意: 主要 wagmi 配置现在通过 RainbowKit 的 getDefaultConfig 在 providers/web3-provider.tsx 中创建
// 这个文件保留用于:
// 1. 链配置常量导出
// 2. 辅助函数 (getRpcUrl, chainNames 等)
// 3. 向后兼容的 type exports

// 如果需要独立的 wagmi 配置（不通过 RainbowKit），使用以下配置:
export const wagmiConfig = createConfig({
  chains: supportedChains as unknown as readonly [Chain, ...Chain[]],
  transports: {
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
    [sepolia.id]: http(),
    [customHardhat.id]: http(HARDHAT_RPC_URL),
  },
  ssr: true,
})
