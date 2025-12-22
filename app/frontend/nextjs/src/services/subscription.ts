/**
 * Subscription API Service
 * 认购相关 API
 *
 * 路由变更：
 * - 公开接口：/public/subscriptions/*
 * - 用户接口：/user/subscriptions/*（需要 JWT）
 */
import { api } from '@/services/api'
import { PUBLIC_PATHS, USER_PATHS } from '@/constants/api-paths'

// 认购状态
export type SubscriptionStatus = 'pending' | 'active' | 'matured' | 'redeemed' | 'cancelled'

// 支付代币类型
export type TokenType = 'USDT' | 'USDC'

// 锁定期
export type LockPeriod = 3 | 6 | 12

// 认购预览请求（改为 Query 参数）
export interface SubscriptionPreviewParams {
  asset_id: number
  amount: number
  token_type: TokenType
  lock_period: LockPeriod
}

// 认购预览响应
export interface SubscriptionPreviewResponse {
  asset_id: number
  asset_name: string
  asset_symbol: string
  amount: number
  token_type: string
  lock_period: number
  apy: number
  expected_interest: number
  total_return: number
  end_date: string
  rwa_token_amount: number
}

// 认购创建请求
export interface SubscriptionCreateRequest {
  asset_id: number
  amount: number
  token_type: TokenType
  lock_period: LockPeriod
  tx_hash: string
}

// 认购响应
export interface SubscriptionResponse {
  id: number
  wallet_address: string
  asset_id: number
  asset_name: string | null
  asset_symbol: string | null
  amount: number
  token_type: string
  lock_period: number
  apy: number
  rwa_token_amount: number
  start_date: string | null
  end_date: string | null
  expected_interest: number
  actual_interest: number
  total_return: number
  days_remaining: number
  is_matured: boolean
  status: SubscriptionStatus
  tx_hash: string | null
  redeem_tx_hash: string | null
  environment: string
  created_at: string
  updated_at: string
}

// 列表项类型别名
export type SubscriptionItem = SubscriptionResponse

// 用户统计
export interface UserStats {
  total_invested: number
  total_value: number
  total_earnings: number
  active_subscriptions: number
  total_subscriptions: number
}

// 查询参数
export interface SubscriptionListQuery {
  status?: SubscriptionStatus
  asset_id?: number
  page?: number
  page_size?: number
}

export const subscriptionService = {
  /**
   * 预览认购收益（公开接口，改为 GET）
   */
  async previewSubscription(params: SubscriptionPreviewParams): Promise<SubscriptionPreviewResponse> {
    const queryParams = new URLSearchParams({
      asset_id: params.asset_id.toString(),
      amount: params.amount.toString(),
      token_type: params.token_type,
      lock_period: params.lock_period.toString(),
    })

    const response = await api.get<API.ResponseData<SubscriptionPreviewResponse>>(
      `${PUBLIC_PATHS.SUBSCRIPTION_PREVIEW}?${queryParams.toString()}`
    )
    return response.object as SubscriptionPreviewResponse
  },

  /**
   * 创建认购（需要 JWT 认证）
   */
  async createSubscription(data: SubscriptionCreateRequest): Promise<SubscriptionResponse> {
    const response = await api.post<API.ResponseData<SubscriptionResponse>>(
      USER_PATHS.SUBSCRIPTIONS,
      data
    )
    return response.object as SubscriptionResponse
  },

  /**
   * 获取认购列表（需要 JWT 认证）
   */
  async getSubscriptions(query: SubscriptionListQuery = {}): Promise<{
    items: SubscriptionResponse[]
    pagination: {
      total: number
      page: number
      page_size: number
      total_pages: number
    }
  }> {
    const params = new URLSearchParams()
    if (query.status) params.append('status', query.status)
    if (query.asset_id) params.append('asset_id', query.asset_id.toString())
    if (query.page) params.append('page', query.page.toString())
    if (query.page_size) params.append('page_size', query.page_size.toString())

    const url = `${USER_PATHS.SUBSCRIPTIONS}${params.toString() ? `?${params.toString()}` : ''}`
    const response = await api.get<API.ResponseData<SubscriptionResponse>>(url)

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
   * 获取认购详情（需要 JWT 认证）
   */
  async getSubscription(id: number): Promise<SubscriptionResponse> {
    const response = await api.get<API.ResponseData<SubscriptionResponse>>(
      USER_PATHS.SUBSCRIPTION_DETAIL(id)
    )
    return response.object as SubscriptionResponse
  },

  /**
   * 获取用户统计（需要 JWT 认证）
   */
  async getUserStats(): Promise<UserStats> {
    const response = await api.get<API.ResponseData<UserStats>>(USER_PATHS.SUBSCRIPTION_STATS)
    return response.object as UserStats
  },

  /**
   * 赎回认购（需要 JWT 认证）
   */
  async redeemSubscription(id: number, txHash: string): Promise<SubscriptionResponse> {
    const response = await api.post<API.ResponseData<SubscriptionResponse>>(
      USER_PATHS.SUBSCRIPTION_REDEEM(id),
      { tx_hash: txHash }
    )
    return response.object as SubscriptionResponse
  },
}

// 状态显示名称
export const SUBSCRIPTION_STATUS_NAMES: Record<SubscriptionStatus, string> = {
  pending: 'Pending',
  active: 'Active',
  matured: 'Matured',
  redeemed: 'Redeemed',
  cancelled: 'Cancelled',
}

// 状态颜色
export const SUBSCRIPTION_STATUS_COLORS: Record<SubscriptionStatus, string> = {
  pending: 'processing',
  active: 'blue',
  matured: 'green',
  redeemed: 'default',
  cancelled: 'error',
}

// 锁定期显示
export const LOCK_PERIOD_OPTIONS: { value: LockPeriod; label: string }[] = [
  { value: 3, label: '3 Months' },
  { value: 6, label: '6 Months' },
  { value: 12, label: '12 Months' },
]

// 代币类型选项
export const TOKEN_TYPE_OPTIONS: { value: TokenType; label: string }[] = [
  { value: 'USDT', label: 'USDT' },
  { value: 'USDC', label: 'USDC' },
]
