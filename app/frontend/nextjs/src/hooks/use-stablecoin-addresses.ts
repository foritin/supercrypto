'use client'
/**
 * useStablecoinAddresses Hook
 * 从 platformInfoStore（/public/info 缓存）获取 USDT/USDC 合约地址
 * 不再单独发请求，复用应用启动时已加载的平台信息
 */
import { useEffect } from 'react'
import { usePlatformInfoStore } from '@/stores/platform-info-store'
import type { AddressInfo } from '@/services/platform-info'

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
          '[useStablecoinAddresses] ⚠️ 未从平台信息中获取到稳定币合约地址。\n' +
          '可能原因：\n' +
          '1. 数据库中未部署 MockUSDT/MockUSDC 合约\n' +
          '2. 合约名称不匹配（应为 MockUSDT/USDT 或 MockUSDC/USDC）\n' +
          '请检查 contract_deployment 表中是否有 scope=global, contract_type=stablecoin 的记录'
        )
      } else {
        if (!result.addresses.MockUSDT) {
          console.warn('[useStablecoinAddresses] ⚠️ MockUSDT 地址为空')
        }
        if (!result.addresses.MockUSDC) {
          console.warn('[useStablecoinAddresses] ⚠️ MockUSDC 地址为空')
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
