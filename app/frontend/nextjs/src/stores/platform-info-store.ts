'use client'

import { create } from 'zustand'

import type {
  ChainInfo,
  AddressInfo,
  AbiItem,
} from '@/services/platform-info'
import {
  fetchPlatformInfo,
  invalidatePlatformInfoCache,
  findContractByName,
  findContractsByType,
} from '@/services/platform-info'

// ---- Store 类型 ----

export interface PlatformInfoState {
  /** 是否已完成首次加载 */
  isLoaded: boolean
  /** 正在加载中 */
  isLoading: boolean
  /** 加载错误 */
  error: string | null

  /** 链配置 */
  chainInfo: ChainInfo | null
  /** 合约地址列表 */
  addressInfo: AddressInfo[]

  // ---- Actions ----
  /** 初始化加载（幂等，多次调用不会重复请求） */
  init: () => Promise<void>
  /** 强制刷新（清除缓存后重新加载） */
  refresh: () => Promise<void>

  // ---- 便捷查询 ----
  /** 按名称获取合约 */
  getContractByName: (name: string) => AddressInfo | undefined
  /** 按类型获取合约列表 */
  getContractsByType: (type: string) => AddressInfo[]
  /** 按名称获取合约地址 (0x string) */
  getAddress: (name: string) => `0x${string}` | undefined
  /** 按名称获取合约 ABI */
  getAbi: (name: string) => AbiItem[] | undefined
}

export const usePlatformInfoStore = create<PlatformInfoState>()((set, get) => ({
  isLoaded: false,
  isLoading: false,
  error: null,
  chainInfo: null,
  addressInfo: [],

  async init() {
    const { isLoaded, isLoading } = get()
    // 幂等：已加载或正在加载则跳过
    if (isLoaded || isLoading) return

    set({ isLoading: true, error: null })
    try {
      console.debug('[PlatformInfo] fetching /public/info ...')
      const data = await fetchPlatformInfo()
      console.debug('[PlatformInfo] loaded:', data.chain_info?.chain_name, `(${data.address_info?.length} contracts)`)
      set({
        chainInfo: data.chain_info,
        addressInfo: data.address_info,
        isLoaded: true,
        isLoading: false,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : '加载平台信息失败'
      console.error('[PlatformInfo] init failed:', msg)
      set({ error: msg, isLoading: false })
    }
  },

  async refresh() {
    invalidatePlatformInfoCache()
    // 重置状态使 init 可以再次执行
    set({ isLoaded: false, isLoading: false, error: null })
    await get().init()
  },

  getContractByName(name: string) {
    const state = get()
    if (!state.isLoaded) return undefined
    return findContractByName(
      { chain_info: state.chainInfo!, address_info: state.addressInfo },
      name
    )
  },

  getContractsByType(type: string) {
    const state = get()
    if (!state.isLoaded) return []
    return findContractsByType(
      { chain_info: state.chainInfo!, address_info: state.addressInfo },
      type
    )
  },

  getAddress(name: string) {
    const contract = get().getContractByName(name)
    return contract?.address as `0x${string}` | undefined
  },

  getAbi(name: string) {
    const contract = get().getContractByName(name)
    return contract?.abi_info
  },
}))
