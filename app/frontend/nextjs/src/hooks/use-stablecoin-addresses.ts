'use client'
/**
 * useStablecoinAddresses Hook
 * 从后端动态获取 USDT/USDC 合约地址，失败时回退到硬编码默认值
 */
import { useQuery } from '@tanstack/react-query'
import { contractService, type ContractAddressItem } from '@/services/contract'
import { MOCK_TOKEN_ADDRESSES } from '@/contracts/mock-token'

export interface StablecoinAddresses {
  MockUSDT: `0x${string}`
  MockUSDC: `0x${string}`
}

export interface UseStablecoinAddressesReturn {
  addresses: StablecoinAddresses
  isLoading: boolean
  isFromBackend: boolean
  error: Error | null
}

/**
 * 从合约列表中解析 stablecoin 地址
 * 纯函数，便于属性测试
 */
export function resolveStablecoinAddresses(
  contracts: ContractAddressItem[] | undefined,
  defaults: StablecoinAddresses
): { addresses: StablecoinAddresses; isFromBackend: boolean } {
  if (!contracts || contracts.length === 0) {
    return { addresses: { ...defaults }, isFromBackend: false }
  }

  // 支持多种命名格式：MockUSDT/USDT 和 MockUSDC/USDC
  const usdtItem = contracts.find((c) => c.name === 'MockUSDT' || c.name === 'USDT')
  const usdcItem = contracts.find((c) => c.name === 'MockUSDC' || c.name === 'USDC')

  const addresses: StablecoinAddresses = {
    MockUSDT: usdtItem ? (usdtItem.address as `0x${string}`) : defaults.MockUSDT,
    MockUSDC: usdcItem ? (usdcItem.address as `0x${string}`) : defaults.MockUSDC,
  }

  const isFromBackend = !!(usdtItem || usdcItem)

  return { addresses, isFromBackend }
}

export function useStablecoinAddresses(): UseStablecoinAddressesReturn {
  const defaults: StablecoinAddresses = {
    MockUSDT: MOCK_TOKEN_ADDRESSES.MockUSDT,
    MockUSDC: MOCK_TOKEN_ADDRESSES.MockUSDC,
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['stablecoinAddresses'],
    queryFn: async () => {
      const data = await contractService.getAddressesByFilter({
        scope: 'global',
        contract_type: 'stablecoin',
      })
      return data.contracts?.stablecoin
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })

  const result = resolveStablecoinAddresses(data, defaults)

  return {
    addresses: result.addresses,
    isLoading,
    isFromBackend: result.isFromBackend,
    error: error as Error | null,
  }
}
