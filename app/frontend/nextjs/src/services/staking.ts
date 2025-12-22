/**
 * Staking API Service
 * 质押挖矿相关 API
 *
 * 路由变更：
 * - 公开接口：/public/staking/*
 * - 用户接口：/user/staking/*（需要 JWT）
 */
import { api } from '@/services/api'
import { PUBLIC_PATHS, USER_PATHS } from '@/constants/api-paths'

// 质押状态
export type StakingStatus = 'active' | 'matured' | 'unstaked' | 'cancelled'

// 质押周期（天）
export type StakingPeriod = 15 | 30 | 45 | 60

// 质押周期配置
export const STAKING_PERIODS: { period: StakingPeriod; multiplier: number; label: string }[] = [
  { period: 15, multiplier: 1.0, label: '15 Days (1.0x)' },
  { period: 30, multiplier: 2.5, label: '30 Days (2.5x)' },
  { period: 45, multiplier: 4.5, label: '45 Days (4.5x)' },
  { period: 60, multiplier: 7.0, label: '60 Days (7.0x)' },
]

// 质押预览请求
export interface StakingPreviewRequest {
  subscription_id: number
  amount: number
  period: StakingPeriod
}

// 质押预览响应
export interface StakingPreviewResponse {
  subscription_id: number
  amount: number
  period: number
  multiplier: number
  expected_rewards: number
  end_date: string
  daily_rewards: number
}

// 创建质押请求
export interface StakingCreateRequest {
  subscription_id: number
  amount: number
  period: StakingPeriod
  tx_hash: string
}

// 质押记录响应
export interface StakingResponse {
  id: number
  wallet_address: string
  subscription_id: number | null
  amount: number
  period: number
  multiplier: number
  start_date: string
  end_date: string
  expected_rewards: number
  claimed_rewards: number
  pending_rewards: number
  current_rewards: number
  days_remaining: number
  is_matured: boolean
  status: StakingStatus
  stake_tx_hash: string | null
  unstake_tx_hash: string | null
  environment: string
  created_at: string
  updated_at: string
}

// 质押限额响应
export interface StakingLimitResponse {
  date: string
  base_limit: number
  carried_limit: number
  total_limit: number
  used_limit: number
  remaining_limit: number
  is_exhausted: boolean
}

// 质押统计响应
export interface StakingStatsResponse {
  total_staked: number
  active_stakes: number
  total_rewards_earned: number
  pending_rewards: number
  current_apy: number
}

// 奖励领取响应
export interface RewardClaimResponse {
  id: number
  staking_id: number
  amount: number
  tx_hash: string | null
  created_at: string
}

// 质押配置响应
export interface StakingConfigResponse {
  periods: {
    period: number
    multiplier: number
    description: string
  }[]
  base_daily_rate: number
  min_stake_amount: number
}

// PLT 代币分配项
export interface TokenAllocation {
  name: string
  amount: number
  percentage: number
  description: string
  color: string
}

// PLT 代币分配响应
export interface TokenDistributionResponse {
  allocations: TokenAllocation[]
  total_supply: number
  circulating_supply: number
  staking_pool_remaining: number
}

// PLT 代币信息响应
export interface PLTTokenInfoResponse {
  name: string
  symbol: string
  total_supply: number
  circulating_supply: number
  staking_rewards_pool: number
  staking_rewards_distributed: number
  staking_rewards_remaining: number
  current_price: number | null
  market_cap: number | null
  total_staked_value: number
  average_apy: number
  distribution: TokenDistributionResponse
}

// 查询参数
export interface StakingListQuery {
  status?: StakingStatus
  page?: number
  page_size?: number
}

export const stakingService = {
  /**
   * 获取质押配置（公开接口）
   */
  async getConfig(): Promise<StakingConfigResponse> {
    const response = await api.get<API.ResponseData<StakingConfigResponse>>(
      PUBLIC_PATHS.STAKING_CONFIG
    )
    return response.object as StakingConfigResponse
  },

  /**
   * 获取今日质押限额（公开接口）
   */
  async getTodayLimit(): Promise<StakingLimitResponse> {
    const response = await api.get<API.ResponseData<StakingLimitResponse>>(
      PUBLIC_PATHS.STAKING_LIMIT
    )
    return response.object as StakingLimitResponse
  },

  /**
   * 获取 PLT 代币信息（公开接口）
   */
  async getPLTTokenInfo(): Promise<PLTTokenInfoResponse> {
    const response = await api.get<API.ResponseData<PLTTokenInfoResponse>>(
      PUBLIC_PATHS.STAKING_PLT_TOKEN
    )
    return response.object as PLTTokenInfoResponse
  },

  /**
   * 预览质押收益（需要 JWT 认证）
   */
  async previewStaking(data: StakingPreviewRequest): Promise<StakingPreviewResponse> {
    const response = await api.post<API.ResponseData<StakingPreviewResponse>>(
      USER_PATHS.STAKING_PREVIEW,
      data
    )
    return response.object as StakingPreviewResponse
  },

  /**
   * 创建质押（需要 JWT 认证）
   */
  async createStaking(data: StakingCreateRequest): Promise<StakingResponse> {
    const response = await api.post<API.ResponseData<StakingResponse>>(USER_PATHS.STAKING, data)
    return response.object as StakingResponse
  },

  /**
   * 获取质押列表（需要 JWT 认证）
   */
  async getStakings(query: StakingListQuery = {}): Promise<{
    items: StakingResponse[]
    pagination: {
      total: number
      page: number
      page_size: number
      total_pages: number
    }
  }> {
    const params = new URLSearchParams()
    if (query.status) params.append('status', query.status)
    if (query.page) params.append('page', query.page.toString())
    if (query.page_size) params.append('page_size', query.page_size.toString())

    const url = `${USER_PATHS.STAKING}${params.toString() ? `?${params.toString()}` : ''}`
    const response = await api.get<API.ResponseData<StakingResponse>>(url)

    return {
      items: response.list || [],
      pagination: response.pagination || {
        total: 0,
        page: 1,
        page_size: 10,
        total_pages: 0,
      },
    }
  },

  /**
   * 获取质押详情（需要 JWT 认证）
   */
  async getStaking(id: number): Promise<StakingResponse> {
    const response = await api.get<API.ResponseData<StakingResponse>>(USER_PATHS.STAKING_DETAIL(id))
    return response.object as StakingResponse
  },

  /**
   * 获取用户统计（需要 JWT 认证）
   */
  async getUserStats(): Promise<StakingStatsResponse> {
    const response = await api.get<API.ResponseData<StakingStatsResponse>>(USER_PATHS.STAKING_STATS)
    return response.object as StakingStatsResponse
  },

  /**
   * 解除质押（需要 JWT 认证）
   */
  async unstake(id: number, txHash: string): Promise<StakingResponse> {
    const response = await api.post<API.ResponseData<StakingResponse>>(
      USER_PATHS.STAKING_UNSTAKE(id),
      { tx_hash: txHash }
    )
    return response.object as StakingResponse
  },

  /**
   * 领取奖励（需要 JWT 认证）
   */
  async claimRewards(id: number, txHash: string): Promise<RewardClaimResponse> {
    const response = await api.post<API.ResponseData<RewardClaimResponse>>(
      USER_PATHS.STAKING_CLAIM(id),
      { tx_hash: txHash }
    )
    return response.object as RewardClaimResponse
  },
}

// 状态显示名称
export const STAKING_STATUS_NAMES: Record<StakingStatus, string> = {
  active: 'Active',
  matured: 'Matured',
  unstaked: 'Unstaked',
  cancelled: 'Cancelled',
}

// 状态颜色
export const STAKING_STATUS_COLORS: Record<StakingStatus, string> = {
  active: 'processing',
  matured: 'success',
  unstaked: 'default',
  cancelled: 'error',
}
