/**
 * 区块链网络配置服务
 * 
 * 从后端 API 获取可用网络列表
 */

import { api } from './api'

export interface ChainConfig {
  chain_id: number
  name: string
  display_name: string
  symbol: string
  decimals: number
  rpc_url: string
  rpc_url_backup: string | null
  block_explorer: string | null
  is_testnet: boolean
  icon: string | null
}

export interface ChainsListResponse {
  chains: ChainConfig[]
  count: number
}

/**
 * 获取可用网络列表
 * @param environment 环境筛选: development / production
 */
export async function getChains(environment?: string): Promise<ChainsListResponse> {
  const params = environment ? `?environment=${environment}` : ''
  return await api.get<ChainsListResponse>(`/public/chains${params}`)
}

/**
 * 获取指定网络配置
 * @param chainId 链 ID
 */
export async function getChainById(chainId: number): Promise<ChainConfig | null> {
  try {
    return await api.get<ChainConfig>(`/public/chains/${chainId}`)
  } catch {
    return null
  }
}

/**
 * 获取当前环境可用的网络列表
 */
export async function getCurrentEnvChains(): Promise<ChainConfig[]> {
  const env = process.env.NEXT_PUBLIC_ENV || 'development'
  const { chains } = await getChains(env)
  return chains
}
