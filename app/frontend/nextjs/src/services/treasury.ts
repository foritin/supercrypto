/**
 * Treasury Service
 * 国库多签相关 API 服务
 */

import { ADMIN_PATHS, DEV_PATHS } from '@/constants/api-paths'
import { api } from '@/services/api'
import type {
  RedemptionEvent,
  MultisigConfig,
  RedemptionQueueResponse,
  RedemptionRequest,
  TreasuryStats,
  MultisigStatusResponse,
  TreasuryInitRequest,
  TreasuryInitResponse,
  RedemptionQueueQuery,
  SignRedemptionRequest,
  ExecuteRedemptionRequest,
  RejectRedemptionRequest,
} from '@/types/treasury'

interface BackendQueueItem {
  id: number
  subscription_id: number
  wallet_address: string
  asset_name?: string | null
  asset_symbol?: string | null
  principal: number
  interest: number
  total_amount: number
  status: 'pending' | 'approved' | 'executed' | 'rejected'
  proposal_id?: number | null
  created_at: string
  signature_count: number
  required_signatures: number
}

interface BackendSignerInfo {
  address: string
  has_signed: boolean
  signed_at?: string | null
  tx_hash?: string | null
}

interface BackendDetailResponse {
  id: number
  subscription_id: number
  wallet_address: string
  asset_name?: string | null
  asset_symbol?: string | null
  principal: number
  interest: number
  total_amount: number
  status: 'pending' | 'approved' | 'executed' | 'rejected'
  proposal_id?: number | null
  proposal_tx_hash?: string | null
  executed_at?: string | null
  execute_tx_hash?: string | null
  created_at: string
  environment: string
  signers: BackendSignerInfo[]
  required_signatures: number
  events?: BackendRedemptionEvent[]
}

interface BackendRedemptionEvent {
  id: number
  event_type:
    | 'request_created'
    | 'proposal_created'
    | 'signature_submitted'
    | 'threshold_reached'
    | 'executed'
    | 'rejected'
  status?: 'pending' | 'approved' | 'executed' | 'rejected' | null
  actor_address?: string | null
  tx_hash?: string | null
  message?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
}

interface BackendMultisigStatus {
  contract_address?: string | null
  signers: string[]
  signer_count: number
  required_signatures: number
  is_initialized: boolean
}

interface BackendTreasuryStats {
  total_requests: number
  pending_count: number
  approved_count: number
  executed_count: number
  rejected_count: number
  total_redeemed_amount: number
}

interface BackendTreasuryConfig {
  contract_address?: string | null
  signers: string[]
  required_signatures: number
}

function mapStatus(status: 'pending' | 'approved' | 'executed' | 'rejected'): RedemptionRequest['status'] {
  if (status === 'approved') {
    return 'signing'
  }
  return status
}

function mapEventStatus(status?: 'pending' | 'approved' | 'executed' | 'rejected' | null): RedemptionEvent['status'] | undefined {
  if (!status) {
    return undefined
  }
  if (status === 'approved') {
    return 'signing'
  }
  return status
}

function mapRedemptionEvent(event: BackendRedemptionEvent): RedemptionEvent {
  const eventStatus = mapEventStatus(event.status)
  const actorAddress = event.actor_address || undefined
  const txHash = event.tx_hash || undefined
  const message = event.message || undefined
  const metadata = event.metadata || undefined

  return {
    id: String(event.id),
    eventType: event.event_type,
    ...(eventStatus ? { status: eventStatus } : {}),
    ...(actorAddress ? { actorAddress } : {}),
    ...(txHash ? { txHash } : {}),
    ...(message ? { message } : {}),
    ...(metadata ? { metadata } : {}),
    createdAt: event.created_at,
  }
}

function toSigner(address: string) {
  return {
    address,
    isActive: true,
  }
}

function getSyntheticSignTxHash(id: number, idx: number): string {
  const idHex = id.toString(16).padStart(4, '0')
  const idxHex = idx.toString(16).padStart(4, '0')
  return `0xsynthetic${idHex}${idxHex}`
}

async function buildQueueItem(
  item: BackendQueueItem,
  allSigners: string[]
): Promise<RedemptionRequest> {
  let detail: BackendDetailResponse | null = null
  try {
    const response = await api.get<API.ResponseData<BackendDetailResponse>>(
      ADMIN_PATHS.TREASURY_QUEUE_DETAIL(item.id)
    )
    detail = response.object_data as BackendDetailResponse
  } catch {
    detail = null
  }

  const detailSigners = detail?.signers || []
  const signatures = detailSigners
    .filter((signer) => signer.has_signed)
    .map((signer, idx) => ({
      signerAddress: signer.address,
      signedAt: signer.signed_at || item.created_at,
      txHash: signer.tx_hash || getSyntheticSignTxHash(item.id, idx),
    }))

  const signerAddresses = allSigners.length
    ? allSigners
    : detailSigners.map((signer) => signer.address)

  const proposalId = detail?.proposal_id || item.proposal_id || undefined
  const proposalTxHash = detail?.proposal_tx_hash || undefined
  const executedAt = detail?.executed_at || undefined
  const executeTxHash = detail?.execute_tx_hash || undefined

  return {
    id: String(item.id),
    requestId: item.id,
    subscriptionId: item.subscription_id,
    userAddress: item.wallet_address,
    assetName: item.asset_name || 'Unknown Asset',
    assetSymbol: item.asset_symbol || 'N/A',
    principal: String(item.principal ?? 0),
    interest: String(item.interest ?? 0),
    totalAmount: String(item.total_amount ?? 0),
    status: mapStatus(item.status),
    ...(proposalId !== undefined ? { proposalId } : {}),
    ...(proposalTxHash ? { proposalTxHash } : {}),
    ...(executedAt ? { executedAt } : {}),
    ...(executeTxHash ? { executeTxHash } : {}),
    createdAt: item.created_at,
    signatures,
    signers: signerAddresses.map(toSigner),
    threshold: detail?.required_signatures || item.required_signatures || 2,
    environment: detail?.environment || 'unknown',
  }
}

/**
 * 获取国库配置
 */
export async function getConfig(): Promise<MultisigConfig> {
  const response = await api.get<API.ResponseData<BackendTreasuryConfig>>(DEV_PATHS.TREASURY_CONFIG)
  const config = response.object_data

  const contractAddress = config?.contract_address || undefined
  return {
    signers: (config?.signers || []).map(toSigner),
    threshold: config?.required_signatures || 0,
    ...(contractAddress ? { contractAddress } : {}),
    balance: '0',
    environment: 'unknown',
  }
}

/**
 * 获取赎回队列
 */
export async function getQueue(query: RedemptionQueueQuery = {}): Promise<RedemptionQueueResponse> {
  const params = new URLSearchParams()
  const status = query.status
  if (status) {
    params.append('status', status === 'signing' ? 'approved' : status)
  }

  const page = query.page || 1
  const pageSize = query.pageSize || 10
  params.append('page', String(page))
  params.append('page_size', String(pageSize))

  const queueResponse = await api.get<API.ResponseData<BackendQueueItem>>(
    `${ADMIN_PATHS.TREASURY_QUEUE}?${params.toString()}`
  )

  const multisigResult = await api
    .get<API.ResponseData<BackendMultisigStatus>>(ADMIN_PATHS.TREASURY_MULTISIG_STATUS)
    .catch(() => null)

  const backendItems = queueResponse.list_data || []
  const allSigners = (multisigResult?.object_data?.signers || []) as string[]
  const items = await Promise.all(
    backendItems.map((item) => buildQueueItem(item as BackendQueueItem, allSigners))
  )

  return {
    items,
    total: queueResponse.pagination?.total || 0,
    page,
    pageSize,
    totalPages: queueResponse.pagination?.total_pages || 0,
  }
}

/**
 * 获取赎回详情
 */
export async function getRedemptionDetail(redemptionId: string): Promise<RedemptionRequest> {
  const numericId = Number(redemptionId)
  const [detailResponse, multisigResponse] = await Promise.all([
    api.get<API.ResponseData<BackendDetailResponse>>(
      ADMIN_PATHS.TREASURY_QUEUE_DETAIL(numericId)
    ),
    api.get<API.ResponseData<BackendMultisigStatus>>(ADMIN_PATHS.TREASURY_MULTISIG_STATUS),
  ])

  const detail = detailResponse.object_data
  if (!detail) {
    throw new Error('Redemption request not found')
  }

  const allSigners = (multisigResponse.object_data?.signers || []) as string[]
  const signatures = (detail.signers || [])
    .filter((signer) => signer.has_signed)
    .map((signer, idx) => ({
      signerAddress: signer.address,
      signedAt: signer.signed_at || detail.created_at,
      txHash: signer.tx_hash || getSyntheticSignTxHash(detail.id, idx),
    }))

  const proposalId = detail.proposal_id || undefined
  const proposalTxHash = detail.proposal_tx_hash || undefined
  const executedAt = detail.executed_at || undefined
  const executeTxHash = detail.execute_tx_hash || undefined
  const events = (detail.events || [])
    .map(mapRedemptionEvent)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  return {
    id: String(detail.id),
    requestId: detail.id,
    subscriptionId: detail.subscription_id,
    userAddress: detail.wallet_address,
    assetName: detail.asset_name || 'Unknown Asset',
    assetSymbol: detail.asset_symbol || 'N/A',
    principal: String(detail.principal ?? 0),
    interest: String(detail.interest ?? 0),
    totalAmount: String(detail.total_amount ?? 0),
    status: mapStatus(detail.status),
    ...(proposalId !== undefined ? { proposalId } : {}),
    ...(proposalTxHash ? { proposalTxHash } : {}),
    ...(executedAt ? { executedAt } : {}),
    ...(executeTxHash ? { executeTxHash } : {}),
    createdAt: detail.created_at,
    signatures,
    signers: allSigners.map(toSigner),
    threshold: detail.required_signatures || 2,
    environment: detail.environment || 'unknown',
    events,
  }
}

/**
 * 获取国库统计
 */
export async function getStats(): Promise<TreasuryStats> {
  const [statsResponse, multisigResponse, pendingQueue, approvedQueue] = await Promise.all([
    api.get<API.ResponseData<BackendTreasuryStats>>(ADMIN_PATHS.TREASURY_STATS),
    api.get<API.ResponseData<BackendMultisigStatus>>(ADMIN_PATHS.TREASURY_MULTISIG_STATUS),
    api.get<API.ResponseData<BackendQueueItem>>(`${ADMIN_PATHS.TREASURY_QUEUE}?status=pending&page=1&page_size=100`),
    api.get<API.ResponseData<BackendQueueItem>>(`${ADMIN_PATHS.TREASURY_QUEUE}?status=approved&page=1&page_size=100`),
  ])

  const stats = statsResponse.object_data
  const multisig = multisigResponse.object_data
  const pendingItems = pendingQueue.list_data || []
  const approvedItems = approvedQueue.list_data || []
  const pendingTotal = [...pendingItems, ...approvedItems].reduce(
    (sum, item) => sum + Number((item as BackendQueueItem).total_amount || 0),
    0
  )

  return {
    balance: '0',
    pendingCount: (stats?.pending_count || 0) + (stats?.approved_count || 0),
    pendingTotal: String(pendingTotal),
    executedCount: stats?.executed_count || 0,
    executedTotal: String(stats?.total_redeemed_amount || 0),
    signerCount: multisig?.signer_count || 0,
    threshold: multisig?.required_signatures || 0,
  }
}

/**
 * 获取多签状态
 */
export async function getMultisigStatus(): Promise<MultisigStatusResponse> {
  const [statusResponse, statsResponse] = await Promise.all([
    api.get<API.ResponseData<BackendMultisigStatus>>(ADMIN_PATHS.TREASURY_MULTISIG_STATUS),
    api.get<API.ResponseData<BackendTreasuryStats>>(ADMIN_PATHS.TREASURY_STATS),
  ])

  const status = statusResponse.object_data
  const stats = statsResponse.object_data

  return {
    contractAddress: status?.contract_address || '',
    signers: (status?.signers || []).map(toSigner),
    threshold: status?.required_signatures || 0,
    proposalCount: stats?.total_requests || 0,
    executedCount: stats?.executed_count || 0,
    environment: 'unknown',
  }
}

/**
 * 初始化国库多签
 */
export async function initTreasury(data: TreasuryInitRequest): Promise<TreasuryInitResponse> {
  const response = await api.post<API.ResponseData<{
    contract_address: string
    tx_hash: string
    signer_count: number
    required_signatures: number
  }>>(
    DEV_PATHS.TREASURY_INIT,
    {
      signer_addresses: data.signers,
      required_signatures: data.threshold,
    }
  )

  const result = response.object_data
  return {
    contractAddress: result?.contract_address || '',
    signers: data.signers,
    threshold: result?.required_signatures || data.threshold,
    txHash: result?.tx_hash || '',
  }
}

/**
 * 签名赎回请求
 */
export async function signRedemption(data: SignRedemptionRequest): Promise<void> {
  const txHash = data.signature?.trim()
  if (!txHash) {
    throw new Error('Missing on-chain signature transaction hash')
  }

  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    throw new Error('Invalid transaction hash format')
  }

  const numericId = Number(data.redemptionId)
  await api.post<API.ResponseData<Record<string, unknown>>>(
    ADMIN_PATHS.TREASURY_QUEUE_SIGN(numericId),
    {
      tx_hash: txHash,
    }
  )
}

/**
 * 执行赎回请求
 */
export async function executeRedemption(data: ExecuteRedemptionRequest): Promise<void> {
  const txHash = data.txHash?.trim()
  if (!txHash) {
    throw new Error('Missing on-chain execute transaction hash')
  }

  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    throw new Error('Invalid transaction hash format')
  }

  const numericId = Number(data.redemptionId)
  await api.post<API.ResponseData<Record<string, unknown>>>(
    ADMIN_PATHS.TREASURY_QUEUE_EXECUTE(numericId),
    {
      tx_hash: txHash,
    }
  )
}

/**
 * 拒绝赎回请求
 */
export async function rejectRedemption(data: RejectRedemptionRequest): Promise<void> {
  const numericId = Number(data.redemptionId)
  await api.post<API.ResponseData<Record<string, unknown>>>(
    ADMIN_PATHS.TREASURY_QUEUE_REJECT(numericId),
    {
      reason: data.reason,
    }
  )
}

// ═══════════════════════════════════════════════════════════
// Export Service Object
// ═══════════════════════════════════════════════════════════

export const treasuryService = {
  getConfig,
  getQueue,
  getRedemptionDetail,
  getStats,
  getMultisigStatus,
  initTreasury,
  signRedemption,
  executeRedemption,
  rejectRedemption,
}

// Export types
export type {
  TreasuryInitRequest,
  TreasuryInitResponse,
  SignRedemptionRequest,
  ExecuteRedemptionRequest,
  RejectRedemptionRequest,
  RedemptionQueueQuery,
}
