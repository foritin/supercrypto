'use client';

import * as React from 'react';
import { WagmiProvider, http } from 'wagmi';
import { RainbowKitProvider, getDefaultConfig, darkTheme } from '@rainbow-me/rainbowkit';
import { mainnet, sepolia, arbitrum } from 'wagmi/chains';
import '@rainbow-me/rainbowkit/styles.css';
import { createQueryClient } from '@/lib/query-client';
import { QueryClientProvider } from '@tanstack/react-query';

// Hardhat 开发网络 RPC URL
const HARDHAT_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'http://YOUR_RPC_HOST:8545';

// 自定义 Hardhat 链配置
// 注意: 如需启用 Multicall3 批量调用，需先在 Hardhat 节点部署 Multicall3 合约
// 部署后取消下方 contracts 注释即可
const customHardhat = {
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
  // contracts: {
  //   multicall3: {
  //     address: '0xcA11bde05977b3631167028862bE2a173976CA11' as const,
  //   },
  // },
} as const;

const IS_PRODUCTION = process.env.NEXT_PUBLIC_ENV === 'production';

// 根据环境选择支持的网络列表
const chains = IS_PRODUCTION 
  ? [mainnet, arbitrum] as const
  : [customHardhat, sepolia] as const;

// 显式指定 RPC transport，确保 wagmi 能正确连接到 Hardhat 节点
const transports = IS_PRODUCTION
  ? { [mainnet.id]: http(), [arbitrum.id]: http() }
  : { [customHardhat.id]: http(HARDHAT_RPC_URL), [sepolia.id]: http() };

// RainbowKit + Wagmi 配置
const config = getDefaultConfig({
  appName: 'SuperCrypto RWA Platform',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: chains as unknown as readonly [typeof chains[number], ...(typeof chains[number])[]],
  transports: transports as Record<number, ReturnType<typeof http>>,
  ssr: true,
});

// SuperCrypto 主题的 RainbowKit 深色主题
const customTheme = darkTheme({
  accentColor: '#00D4AA',
  accentColorForeground: '#0A0F0D',
  borderRadius: 'medium',
  fontStack: 'system',
  overlayBlur: 'small',
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  // Create query client once per session
  const [queryClient] = React.useState(() => createQueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={customTheme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
