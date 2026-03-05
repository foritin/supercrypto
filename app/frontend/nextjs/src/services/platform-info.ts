/**
 * Platform Info Service
 *
 * 从后端 /public/info 获取平台基础信息（链配置 + 合约地址 + ABI）。
 *
 * 缓存策略（三层）：
 *  1. sessionStorage — 同一标签页内免请求（TTL 5min）
 *  2. HTTP ETag — 缓存过期后发 If-None-Match，
 *     数据没变则收到 304（零传输），推长本地 TTL
 *  3. Redis（服务端） — 多 Worker 共享，避免重复构建
 */

import axios from 'axios'

import { API_BASE_URL } from '@/constants/api'
import { PUBLIC_PATHS } from '@/constants/api-paths'

/**
 * 独立 axios 实例 — 不挂 response interceptor，
 * 这样我们可以自己处理 304 和原始 response headers (ETag)。
 */
const rawAxios = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// ---- 类型定义 ----

export interface ChainInfo {
  chain_id: number
  chain_name: string
  network: string
  rpc_url: string
}

export interface AbiItem {
  type: string
  name?: string
  inputs?: Array<{
    name: string
    type: string
    indexed?: boolean
    components?: Array<{ name: string; type: string }>
  }>
  outputs?: Array<{
    name: string
    type: string
    components?: Array<{ name: string; type: string }>
  }>
  stateMutability?: string
  anonymous?: boolean
}

export interface AddressInfo {
  id: number
  scope: string
  contract_type: string
  status: string
  address: string
  deployer_address: string
  name: string
  abi_info: AbiItem[]
}

export interface PlatformInfoData {
  chain_info: ChainInfo
  address_info: AddressInfo[]
}

// ---- 缓存常量 ----
const CACHE_KEY = 'supercrypto:platform-info'
const ETAG_KEY = 'supercrypto:platform-info:etag'
const CACHE_TTL = 5 * 60 * 1000 // 5 分钟

interface CachedData {
  data: PlatformInfoData
  ts: number
}

// ---- 缓存工具 ----

function readCache(): PlatformInfoData | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cached: CachedData = JSON.parse(raw)
    if (Date.now() - cached.ts > CACHE_TTL) {
      // TTL 过期，但不删除 — 后面 ETag 304 时还能复用
      return null
    }
    return cached.data
  } catch {
    return null
  }
}

/** 读取过期的缓存数据（给 ETag revalidate 用） */
function readStaleCache(): PlatformInfoData | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return (JSON.parse(raw) as CachedData).data
  } catch {
    return null
  }
}

function writeCache(data: PlatformInfoData): void {
  try {
    const payload: CachedData = { data, ts: Date.now() }
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload))
  } catch {
    // sessionStorage 满或不可用，忽略
  }
}

function readEtag(): string | null {
  try {
    return sessionStorage.getItem(ETAG_KEY)
  } catch {
    return null
  }
}

function writeEtag(etag: string): void {
  try {
    sessionStorage.setItem(ETAG_KEY, etag)
  } catch {
    // ignore
  }
}

/** 手动清除前端缓存（合约变更后调用） */
export function invalidatePlatformInfoCache(): void {
  try {
    sessionStorage.removeItem(CACHE_KEY)
    sessionStorage.removeItem(ETAG_KEY)
  } catch {
    // ignore
  }
}

// ---- API 调用 ----

/**
 * 获取平台基础信息
 *
 * 1. sessionStorage 未过期 → 直接返回（零请求）
 * 2. 过期或不存在 → 带 If-None-Match 请求后端
 *    - 304 → 数据没变，刷新本地 TTL，零传输
 *    - 200 → 新数据，写入本地
 */
export async function fetchPlatformInfo(): Promise<PlatformInfoData> {
  // 1. 尝试本地未过期缓存
  const cached = readCache()
  if (cached) return cached

  // 2. 准备 ETag 条件请求
  const etag = readEtag()
  const headers: Record<string, string> = {}
  if (etag) {
    headers['If-None-Match'] = etag
  }

  try {
    const resp = await rawAxios.get(PUBLIC_PATHS.INFO, {
      headers,
      validateStatus: (status) => status === 200 || status === 304,
    })

    // 3. 304 — 数据没变，复用本地旧缓存
    if (resp.status === 304) {
      const stale = readStaleCache()
      if (stale) {
        // 刷新 TTL
        writeCache(stale)
        return stale
      }
      // 极端情况：有 ETag 但本地数据被清了 → 降级重新请求
      return fetchPlatformInfoFull()
    }

    // 4. 200 — 解析原始响应 { code, data: { object_data: {...} } }
    const body = resp.data as { code: number; data: { object_data: PlatformInfoData } }
    const data = body.data.object_data

    // 保存 ETag
    const newEtag = resp.headers['etag']
    if (newEtag) {
      writeEtag(newEtag.replace(/"/g, ''))
    }

    writeCache(data)
    return data
  } catch {
    // 网络错误时尝试返回过期缓存（降级）
    const stale = readStaleCache()
    if (stale) return stale
    throw new Error('无法获取平台信息')
  }
}

/** 强制完整请求（不带 ETag） */
async function fetchPlatformInfoFull(): Promise<PlatformInfoData> {
  const resp = await rawAxios.get(PUBLIC_PATHS.INFO)
  const body = resp.data as { code: number; data: { object_data: PlatformInfoData } }
  const data = body.data.object_data

  const newEtag = resp.headers['etag']
  if (newEtag) {
    writeEtag(newEtag.replace(/"/g, ''))
  }

  writeCache(data)
  return data
}

// ---- 便捷查找方法 ----

/** 按合约名称查找地址信息 */
export function findContractByName(
  info: PlatformInfoData,
  name: string
): AddressInfo | undefined {
  return info.address_info.find((c) => c.name === name)
}

/** 按合约类型查找地址信息列表 */
export function findContractsByType(
  info: PlatformInfoData,
  contractType: string
): AddressInfo[] {
  return info.address_info.filter((c) => c.contract_type === contractType)
}
