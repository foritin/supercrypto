'use client'
/**
 * useStablecoinAddresses Hook
 * 从 platformInfoStore（/public/info 缓存）获取 USDT/USDC 合约地址
 * 不再单独发请求，复用应用启动时已加载的平台信息
 */
import { useEffect } from 'react'

import { pickPreferredAddressInfoStablecoin } from '@/lib/stablecoin-selector'
import type { AddressInfo } from '@/services/platform-info'
import { usePlatformInfoStore } from '@/stores/platform-info-store'

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

const EMPTY: StablecoinAddresses = {
  MockUSDT: '' as `0x${string}`,
  MockUSDC: '' as `0x${string}`,
}

/**
 * 从合约列表中解析 stablecoin 地址
 * 纯函数，便于属性测试
 */
export function resolveStablecoinAddresses(
  contracts: AddressInfo[] | undefined,
  defaults: StablecoinAddresses = EMPTY
): { addresses: StablecoinAddresses; isFromBackend: boolean } {
  if (!contracts || contracts.length === 0) {
    return { addresses: { ...defaults }, isFromBackend: false }
  }

  // 支持多种命名格式：MockUSDT/USDT 和 MockUSDC/USDC
  // 优先级：active + global > active > global > others
  const usdtItem = pickPreferredAddressInfoStablecoin(contracts, ['MockUSDT', 'USDT'])
  const usdcItem = pickPreferredAddressInfoStablecoin(contracts, ['MockUSDC', 'USDC'])

  const addresses: StablecoinAddresses = {
    MockUSDT: usdtItem ? (usdtItem.address as `0x${string}`) : defaults.MockUSDT,
    MockUSDC: usdcItem ? (usdcItem.address as `0x${string}`) : defaults.MockUSDC,
  }

  const isFromBackend = !!(usdtItem || usdcItem)

  return { addresses, isFromBackend }
}

export function useStablecoinAddresses(): UseStablecoinAddressesReturn {
  const isLoaded = usePlatformInfoStore((s) => s.isLoaded)
  const isLoading = usePlatformInfoStore((s) => s.isLoading)
  const error = usePlatformInfoStore((s) => s.error)
  const addressInfo = usePlatformInfoStore((s) => s.addressInfo)

  // 从已缓存的 addressInfo 中筛选 stablecoin 类型
  const stablecoins = isLoaded
    ? addressInfo.filter((c) => c.contract_type === 'stablecoin')
    : undefined

  const result = resolveStablecoinAddresses(stablecoins)

  // 警告提示：如果未从后端获取到地址
  useEffect(() => {
    if (isLoaded) {
      if (!result.isFromBackend) {
        console.warn(
          '[useStablecoinAddresses] ⚠️ Stablecoin contract addresses were not loaded from platform info.\n' +
          'Possible causes:\n' +
          '1. MockUSDT/MockUSDC contracts are not deployed in the database\n' +
          '2. Contract names do not match (expected MockUSDT/USDT or MockUSDC/USDC)\n' +
          'Please verify there is a record in contract_deployment with scope=global and contract_type=stablecoin'
        )
      } else {
        if (!result.addresses.MockUSDT) {
          console.warn('[useStablecoinAddresses] ⚠️ MockUSDT address is empty')
        }
        if (!result.addresses.MockUSDC) {
          console.warn('[useStablecoinAddresses] ⚠️ MockUSDC address is empty')
        }
      }
    }
  }, [isLoaded, result.isFromBackend, result.addresses.MockUSDT, result.addresses.MockUSDC])

  return {
    addresses: result.addresses,
    isLoading,
    isFromBackend: result.isFromBackend,
    error: error ? new Error(error) : null,
  }
}
