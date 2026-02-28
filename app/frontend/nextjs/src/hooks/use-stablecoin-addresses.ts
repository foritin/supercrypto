'use client'
/**
 * useStablecoinAddresses Hook
 * 从后端动态获取 USDT/USDC 合约地址
 * 如果后端未返回地址，则地址为空字符串，并在控制台发出警告
 */
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
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

  // 警告提示：如果未从后端获取到地址
  useEffect(() => {
    if (!isLoading) {
      if (!result.isFromBackend) {
        console.warn(
          '[useStablecoinAddresses] ⚠️ 未从后端获取到稳定币合约地址。\n' +
          '可能原因：\n' +
          '1. 后端服务未启动或不可用\n' +
          '2. 数据库中未部署 MockUSDT/MockUSDC 合约\n' +
          '3. 合约名称不匹配（应为 MockUSDT/USDT 或 MockUSDC/USDC）\n' +
          '请检查：\n' +
          '- 后端服务状态\n' +
          '- contract_deployment 表中是否有 scope=global, contract_type=stablecoin 的记录'
        )
      } else {
        // 检查是否有空地址
        if (!result.addresses.MockUSDT) {
          console.warn('[useStablecoinAddresses] ⚠️ MockUSDT 地址为空')
        }
        if (!result.addresses.MockUSDC) {
          console.warn('[useStablecoinAddresses] ⚠️ MockUSDC 地址为空')
        }
      }
    }
  }, [isLoading, result.isFromBackend, result.addresses])

  return {
    addresses: result.addresses,
    isLoading,
    isFromBackend: result.isFromBackend,
    error: error as Error | null,
  }
}
