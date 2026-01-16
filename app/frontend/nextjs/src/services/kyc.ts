/**
 * KYC Service
 * API calls for KYC-related operations
 *
 * 路由变更：
 * - 公开接口：/public/kyc/*（状态查询）
 * - 用户接口：/user/kyc/*（上传、申请）
 * - 管理员接口：/admin/kyc/*（审核、列表）
 * - 开发工具：/kyc/dev/*
 */
import { api } from '@/services/api'
import { PUBLIC_PATHS, USER_PATHS, ADMIN_PATHS, DEV_PATHS } from '@/constants/api-paths'

/**
 * KYC Status enum
 */
export enum KycStatus {
  NOT_STARTED = 'not_started',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/**
 * KYC Status Response
 */
export interface KycStatusResponse {
  wallet_address: string
  status: KycStatus
  submitted_at: string | null
  reviewed_at: string | null
  reject_reason: string | null
  country_code: string | null
  is_accredited: boolean
}

/**
 * KYC Full Response (includes ID and timestamps)
 */
export interface KycFullResponse extends KycStatusResponse {
  id: number
  environment: string
  reviewer_id: number | null
  external_kyc_id: string | null
  created_at: string
  updated_at: string
}

/**
 * KYC Apply Request
 */
export interface KycApplyRequest {
  wallet_address?: string // 将由后端从 JWT 中获取
  country_code?: string
  id_type?: string
  id_number?: string
  full_name?: string
  date_of_birth?: string
  id_front_url?: string
  id_back_url?: string
  selfie_url?: string
}

/**
 * KYC Review Request (Admin) - Story 2.9 增强版
 */
export interface KycReviewRequest {
  approved: boolean
  reject_reason_code?: string
  reject_reason?: string
  is_accredited?: boolean
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// ============================================================================
// 公开接口
// ============================================================================

/**
 * Get KYC status for a wallet address (公开接口)
 */
export async function getKycStatus(walletAddress: string): Promise<KycStatusResponse> {
  const response = await api.get<API.ResponseData<KycStatusResponse>>(
    PUBLIC_PATHS.KYC_STATUS(walletAddress)
  )
  return response.object_data as KycStatusResponse
}

// ============================================================================
// 用户接口
// ============================================================================

/**
 * Apply for KYC (需要 JWT 认证)
 */
export async function applyKyc(data: KycApplyRequest): Promise<KycFullResponse> {
  const response = await api.post<API.ResponseData<KycFullResponse>>(USER_PATHS.KYC_APPLY, data)
  return response.object_data as KycFullResponse
}

// ============================================================================
// 管理员接口
// ============================================================================

/**
 * List KYC records (admin)
 */
export async function listKyc(params: {
  status?: KycStatus
  page?: number
  page_size?: number
}): Promise<PaginatedResponse<KycFullResponse>> {
  const searchParams = new URLSearchParams()
  if (params.status) searchParams.set('status', params.status)
  if (params.page) searchParams.set('page', params.page.toString())
  if (params.page_size) searchParams.set('page_size', params.page_size.toString())

  const query = searchParams.toString()
  const response = await api.get<API.ResponseData<KycFullResponse>>(
    `${ADMIN_PATHS.KYC_LIST}${query ? `?${query}` : ''}`
  )

  return {
    items: response.list_data || [],
    total: response.pagination?.total || 0,
    page: response.pagination?.page || 1,
    page_size: response.pagination?.page_size || 10,
    total_pages: response.pagination?.total_pages || 0,
  }
}

/**
 * Get KYC by ID (admin)
 */
export async function getKycById(id: number): Promise<KycFullResponse> {
  const response = await api.get<API.ResponseData<KycFullResponse>>(ADMIN_PATHS.KYC_DETAIL(id))
  return response.object_data as KycFullResponse
}

/**
 * Review KYC (admin)
 */
export async function reviewKyc(id: number, data: KycReviewRequest): Promise<KycFullResponse> {
  const response = await api.post<API.ResponseData<KycFullResponse>>(
    ADMIN_PATHS.KYC_REVIEW(id),
    data
  )
  return response.object_data as KycFullResponse
}

/**
 * Retry on-chain sync (admin) - Story 2.8
 */
export async function retrySyncKyc(id: number): Promise<KycFullResponse> {
  const response = await api.post<API.ResponseData<KycFullResponse>>(ADMIN_PATHS.KYC_RETRY_SYNC(id))
  return response.object_data as KycFullResponse
}

// ============================================================================
// 开发工具
// ============================================================================

/**
 * Quick approve KYC (dev only)
 */
export async function quickApproveKyc(walletAddress: string): Promise<KycFullResponse> {
  const response = await api.post<API.ResponseData<KycFullResponse>>(
    DEV_PATHS.KYC_QUICK_APPROVE(walletAddress)
  )
  return response.object_data as KycFullResponse
}

/**
 * Reset KYC (dev only)
 */
export async function resetKyc(
  walletAddress: string
): Promise<{ wallet_address: string; reset: boolean }> {
  const response = await api.delete<API.ResponseData<{ wallet_address: string; reset: boolean }>>(
    DEV_PATHS.KYC_RESET(walletAddress)
  )
  return response.object_data as { wallet_address: string; reset: boolean }
}

// ============================================================================
// 聚合导出
// ============================================================================

export const kycService = {
  // 公开
  getStatus: getKycStatus,

  // 用户
  apply: applyKyc,

  // 管理员
  list: listKyc,
  getById: getKycById,
  review: reviewKyc,
  retrySync: retrySyncKyc,

  // 开发工具
  quickApprove: quickApproveKyc,
  reset: resetKyc,
}
