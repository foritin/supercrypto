'use client'

import type { ChainInfo, AddressInfo, AbiItem } from '@/services/platform-info'
import { usePlatformInfoStore } from '@/stores/platform-info-store'

/**
 * usePlatformInfo — 便捷 hook，从 store 获取平台链信息和合约数据
 *
 * 用法：
 * ```tsx
 * const { chainInfo, getAddress, getAbi, isLoaded } = usePlatformInfo()
 * const usdtAddress = getAddress('USDT')
 * const kycAbi = getAbi('KYC')
 * ```
 */
export function usePlatformInfo() {
  const isLoaded = usePlatformInfoStore((s) => s.isLoaded)
  const isLoading = usePlatformInfoStore((s) => s.isLoading)
  const error = usePlatformInfoStore((s) => s.error)
  const chainInfo = usePlatformInfoStore((s) => s.chainInfo)
  const addressInfo = usePlatformInfoStore((s) => s.addressInfo)
  const getContractByName = usePlatformInfoStore((s) => s.getContractByName)
  const getContractsByType = usePlatformInfoStore((s) => s.getContractsByType)
  const getAddress = usePlatformInfoStore((s) => s.getAddress)
  const getAbi = usePlatformInfoStore((s) => s.getAbi)
  const refresh = usePlatformInfoStore((s) => s.refresh)

  return {
    isLoaded,
    isLoading,
    error,
    chainInfo,
    addressInfo,
    getContractByName,
    getContractsByType,
    getAddress,
    getAbi,
    refresh,
  } as const
}

export type { ChainInfo, AddressInfo, AbiItem }
