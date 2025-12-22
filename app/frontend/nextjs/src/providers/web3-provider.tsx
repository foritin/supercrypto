'use client'

import { WagmiProvider, createConfig, http } from 'wagmi'
import { sepolia, mainnet, type Chain } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { injected } from 'wagmi/connectors'
import { useState, type ReactNode } from 'react'

// 获取环境配置
const ENV = process.env.NEXT_PUBLIC_ENV || 'local'

// Hardhat RPC URL - 优先环境变量，默认远程开发服务器
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
  },
}

// 根据环境选择默认链
const getDefaultChain = () => {
  switch (ENV) {
    case 'main':
      return mainnet
    case 'test':
      return sepolia
    default:
      return customHardhat
  }
}

// Wagmi 配置
const config = createConfig({
  chains: [customHardhat, sepolia, mainnet],
  connectors: [
    injected(),
  ],
  transports: {
    [customHardhat.id]: http(HARDHAT_RPC_URL),
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
})

// 导出环境信息
export { ENV, getDefaultChain }

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}

