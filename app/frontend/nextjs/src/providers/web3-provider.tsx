'use client'

import { WagmiProvider, http } from 'wagmi'
import { sepolia, mainnet, arbitrum, type Chain } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import {
  RainbowKitProvider,
  darkTheme,
  getDefaultConfig,
} from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'

// 获取环境配置
const ENV = process.env.NEXT_PUBLIC_ENV || 'development'
const IS_PRODUCTION = ENV === 'production'

// Hardhat RPC URL - 优先环境变量，默认远程开发服务器
const HARDHAT_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'http://YOUR_RPC_HOST:8545'

// WalletConnect Project ID - 从环境变量获取
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID'

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

// 根据环境选择网络列表
// development: Hardhat, Sepolia
// production: Ethereum, Arbitrum
const supportedChains: readonly [Chain, ...Chain[]] = IS_PRODUCTION
  ? [mainnet, arbitrum]
  : [customHardhat, sepolia]

// 根据环境配置 transports
const transports: Record<number, ReturnType<typeof http>> = IS_PRODUCTION
  ? {
      [mainnet.id]: http(),
      [arbitrum.id]: http(),
    }
  : {
      [customHardhat.id]: http(HARDHAT_RPC_URL),
      [sepolia.id]: http(),
    }

// RainbowKit + Wagmi 配置
const config = getDefaultConfig({
  appName: 'SuperCrypto',
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: supportedChains,
  transports,
  ssr: true, // 启用 SSR 支持
})

// 自定义 RainbowKit 深色主题 - Web3 风格
const customTheme = darkTheme({
  accentColor: '#00D4AA', // Web3 Neon Green 主色调
  accentColorForeground: 'white',
  borderRadius: 'medium',
  fontStack: 'system',
  overlayBlur: 'small',
})

// 导出环境信息
export { ENV, IS_PRODUCTION, supportedChains }

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
        <RainbowKitProvider theme={customTheme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

