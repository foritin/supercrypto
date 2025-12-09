import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { ConfigProvider } from 'antd'
import { wagmiConfig } from '../config/wagmi'

// React Query 客户端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 分钟
      retry: 1,
    },
  },
})

// Ant Design 主题配置
const antdTheme = {
  token: {
    colorPrimary: '#1677ff',
    borderRadius: 8,
  },
}

interface Web3ProviderProps {
  children: React.ReactNode
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={antdTheme}>
          {children}
        </ConfigProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

