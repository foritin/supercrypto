import { http, createConfig } from 'wagmi'
import { mainnet, sepolia, localhost } from 'wagmi/chains'
import { metaMask } from 'wagmi/connectors'

// 自定义本地开发网络配置
const localDevChain = {
  ...localhost,
  id: 31337,
  name: 'Localhost 8545',
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
  },
}

// 支持的网络列表
export const supportedChains = [mainnet, sepolia, localDevChain] as const

// 网络名称映射
export const chainNames: Record<number, string> = {
  [mainnet.id]: 'Ethereum Mainnet',
  [sepolia.id]: 'Sepolia Testnet',
  [localDevChain.id]: 'Localhost',
}

// Wagmi 配置
export const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors: [
    metaMask({
      dappMetadata: {
        name: 'SuperCrypto',
        url: window.location.origin,
      },
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [localDevChain.id]: http('http://YOUR_RPC_HOST:8545'),
  },
})

