/**
 * Redemption Service
 * 用户赎回相关 API 服务
 */

import { USER_PATHS } from '@/constants/api-paths'
import { api } from '@/services/api'

export interface RedemptionPreview {
  subscriptionId: number
  assetName: string
  assetSymbol: string
  invested: string
  returns: string
  total: string
  apy: number
  lockPeriod: number
  daysRemaining: number
  isMatured: boolean
  recipientAddress: string
}

export interface UserRedemption {
  id: string
  subscriptionId: number
  assetName: string
  assetSymbol: string
  amount: string
  status: 'pending' | 'signing' | 'executed' | 'rejected' | 'cancelled'
  signatureCount: number
  requiredSignatures: number
  createdAt: string
  proposalTxHash?: string
  completedAt?: string
  txHash?: string
}

export interface UserRedemptionEvent {
  id: string
  eventType: 'request_created' | 'proposal_created' | 'signature_submitted' | 'threshold_reached' | 'executed' | 'rejected'
  status?: 'pending' | 'signing' | 'executed' | 'rejected'
  actorAddress?: string
  txHash?: string
  message?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface UserRedemptionDetail extends UserRedemption {
  rejectionReason?: string
  events: UserRedemptionEvent[]
}

interface BackendRedemptionResponse {
  id: number
  subscription_id: number
  asset_name?: string | null
  asset_symbol?: string | null
  total_amount: number
  status: 'pending' | 'approved' | 'executed' | 'rejected'
  signature_count?: number
  required_signatures?: number
  proposal_tx_hash?: string | null
  created_at: string
  executed_at?: string | null
  execute_tx_hash?: string | null
}

interface BackendRedemptionEventResponse {
  id: number
  event_type: UserRedemptionEvent['eventType']
  status?: BackendRedemptionResponse['status'] | null
  actor_address?: string | null
  tx_hash?: string | null
  message?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
}

interface BackendRedemptionDetailResponse extends BackendRedemptionResponse {
  rejection_reason?: string | null
  events?: BackendRedemptionEventResponse[]
}

interface BackendSubscriptionResponse {
  id: number
  wallet_address: string
  asset_name: string | null
  asset_symbol: string | null
  amount: number
  lock_period: number
  apy: number
  expected_interest: number
  total_return: number
  days_remaining: number
  is_matured: boolean
}

function mapStatus(status: BackendRedemptionResponse['status']): UserRedemption['status'] {
  if (status === 'approved') {
    return 'signing'
  }
  return status
}

function mapEventStatus(status?: BackendRedemptionResponse['status'] | null): UserRedemptionEvent['status'] | undefined {
  if (!status) return undefined
  if (status === 'approved') return 'signing'
  return status
}

function mapUserRedemption(item: BackendRedemptionResponse): UserRedemption {
  const completedAt = item.executed_at || undefined
  const txHash = item.execute_tx_hash || undefined
  const proposalTxHash = item.proposal_tx_hash || undefined

  return {
    id: String(item.id),
    subscriptionId: item.subscription_id,
    assetName: item.asset_name || 'Unknown Asset',
    assetSymbol: item.asset_symbol || 'N/A',
    amount: String(item.total_amount ?? 0),
    status: mapStatus(item.status),
    signatureCount: item.signature_count ?? 0,
    requiredSignatures: item.required_signatures ?? 0,
    createdAt: item.created_at,
    ...(proposalTxHash ? { proposalTxHash } : {}),
    ...(completedAt ? { completedAt } : {}),
    ...(txHash ? { txHash } : {}),
  }
}

function mapUserRedemptionEvent(item: BackendRedemptionEventResponse): UserRedemptionEvent {
  const eventStatus = mapEventStatus(item.status)
  const actorAddress = item.actor_address || undefined
  const txHash = item.tx_hash || undefined
  const message = item.message || undefined
  const metadata = item.metadata || undefined

  return {
    id: String(item.id),
    eventType: item.event_type,
    ...(eventStatus ? { status: eventStatus } : {}),
    ...(actorAddress ? { actorAddress } : {}),
    ...(txHash ? { txHash } : {}),
    ...(message ? { message } : {}),
    ...(metadata ? { metadata } : {}),
    createdAt: item.created_at,
  }
}

function mapUserRedemptionDetail(item: BackendRedemptionDetailResponse): UserRedemptionDetail {
  const base = mapUserRedemption(item)
  const rejectionReason = item.rejection_reason || undefined

  return {
    ...base,
    ...(rejectionReason ? { rejectionReason } : {}),
    events: (item.events || []).map(mapUserRedemptionEvent),
  }
}

/**
 * 获取用户赎回记录
 */
export async function getUserRedemptions(status?: string): Promise<UserRedemption[]> {
  const params = new URLSearchParams()
  params.append('page', '1')
  params.append('page_size', '100')
  if (status) {
    params.append('status', status === 'signing' ? 'approved' : status)
  }

  const url = `${USER_PATHS.REDEMPTIONS}${params.toString() ? `?${params.toString()}` : ''}`
  const response = await api.get<API.ResponseData<BackendRedemptionResponse>>(url)
  return (response.list_data || []).map(mapUserRedemption)
}

/**
 * 获取赎回详情
 */
export async function getRedemptionDetail(redemptionId: string): Promise<UserRedemptionDetail> {
  const response = await api.get<API.ResponseData<BackendRedemptionDetailResponse>>(
    USER_PATHS.REDEMPTION_DETAIL(redemptionId)
  )
  if (!response.object_data) {
    throw new Error('Redemption not found')
  }
  return mapUserRedemptionDetail(response.object_data)
}

/**
 * 发起赎回请求
 */
export async function requestRedemption(subscriptionId: number): Promise<{ redemptionId: string; txHash: string }> {
  const response = await api.post<API.ResponseData<BackendRedemptionResponse>>(
    USER_PATHS.SUBSCRIPTION_REDEEM(subscriptionId)
  )
  const item = response.object_data
  return {
    redemptionId: String(item?.id ?? ''),
    txHash: item?.execute_tx_hash || item?.id?.toString() || '',
  }
}

/**
 * 获取赎回预览
 */
export async function getRedemptionPreview(subscriptionId: number): Promise<RedemptionPreview> {
  const response = await api.get<API.ResponseData<BackendSubscriptionResponse>>(
    USER_PATHS.SUBSCRIPTION_DETAIL(subscriptionId)
  )
  const subscription = response.object_data

  return {
    subscriptionId,
    assetName: subscription?.asset_name || 'Unknown Asset',
    assetSymbol: subscription?.asset_symbol || 'N/A',
    invested: String(subscription?.amount ?? 0),
    returns: String(subscription?.expected_interest ?? 0),
    total: String(subscription?.total_return ?? 0),
    apy: subscription?.apy ?? 0,
    lockPeriod: subscription?.lock_period ?? 0,
    daysRemaining: subscription?.days_remaining ?? 0,
    isMatured: Boolean(subscription?.is_matured),
    recipientAddress: subscription?.wallet_address || '',
  }
}

// ═══════════════════════════════════════════════════════════
// Export Service Object
// ═══════════════════════════════════════════════════════════

export const redemptionService = {
  getUserRedemptions,
  getRedemptionDetail,
  requestRedemption,
  getRedemptionPreview,
}
