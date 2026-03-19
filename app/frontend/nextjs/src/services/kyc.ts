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
import { PUBLIC_PATHS, USER_PATHS, ADMIN_PATHS, DEV_PATHS } from '@/constants/api-paths'
import { api } from '@/services/api'

// ============================================================================
// KYC 文件上传类型定义
// ============================================================================

/**
 * KYC 证件类型
 * - passport: 护照
 * - id_card: 身份证
 * - drivers_license: 驾照
 */
export type KycIdType = 'passport' | 'id_card' | 'drivers_license'

/**
 * KYC 文档类型 (用于上传)
 * 格式: {证件类型}_{正面/背面} 或 selfie
 */
export type KycDocumentType =
  | 'passport_front'
  | 'id_card_front'
  | 'id_card_back'
  | 'drivers_license_front'
  | 'drivers_license_back'
  | 'selfie'

/**
 * Base64 图片文档类型 (用于人脸图片和自拍上传)
 */
export type Base64DocumentType = 'face_image' | 'selfie'

/**
 * Base64 图片上传请求
 */
export interface Base64UploadRequest {
  /** Base64 编码的图片数据 (支持 data URI 或纯 base64) */
  image_data: string
  /** 文档类型: face_image 或 selfie */
  document_type: Base64DocumentType
}

/**
 * KYC 文件上传响应
 */
export interface KycUploadResponse {
  /** 文档类型 */
  document_type: KycDocumentType
  /** 文件路径 (MinIO 对象名) */
  file_path: string
}

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
  on_chain_sync_status?: string | null
}

/**
 * KYC Full Response (includes ID and timestamps)
 */
export interface KycFullResponse extends KycStatusResponse {
  id: number
  environment: string
  reviewer_address: string | null
  external_kyc_id: string | null
  created_at: string
  updated_at: string
  // 基本信息
  full_name: string | null
  date_of_birth: string | null
  address: string | null
  // 多证件信息
  documents: KycDocumentResponse[]
  has_selfie: boolean
  // 向后兼容字段 (已废弃)
  id_type: string | null
  id_number: string | null
  id_number_last4: string | null
  has_id_front: boolean
  has_id_back: boolean
  // 文档 URL
  id_front_url: string | null
  id_back_url: string | null
  selfie_url: string | null
  // 活体检测
  liveness_verified: boolean
  // 链上同步状态
  on_chain_sync_status: string | null
  on_chain_tx_hash: string | null
}

/**
 * KYC 单个证件信息
 */
export interface KycDocumentInfo {
  id_type: KycIdType
  id_number: string
  document_expiry: string // YYYY-MM-DD
  id_front_url: string
  id_back_url?: string // 护照可为空
}

/**
 * KYC Apply Request (多证件版本)
 */
export interface KycApplyRequest {
  wallet_address?: string // 将由后端从 JWT 中获取
  country_code?: string
  full_name: string
  date_of_birth: string // YYYY-MM-DD
  documents: KycDocumentInfo[] // 1-3 种证件
  selfie_url?: string
  face_image_url?: string // MinIO path for face image from liveness detection
  liveness_video_url?: string // MinIO path for liveness video (optional)
}

/**
 * KYC 证件响应信息
 */
export interface KycDocumentResponse {
  id_type: string
  id_number_last4: string | null
  document_expiry: string | null
  has_front: boolean
  has_back: boolean
}

/**
 * KYC Review Request (Admin) - Story 2.9 增强版
 */
export interface KycReviewRequest {
  approved: boolean
  reject_reason_code?: string
  reject_reason?: string
  is_accredited?: boolean
  review_steps?: {
    basic_info_confirmed: boolean
    documents_confirmed: boolean
    risk_assessment_confirmed: boolean
    confirmed_at: string
  }
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
  // falib 返回格式: { code, data: { object_data, list_data, msg, pagination } }
  // api interceptor 已解包到 data 层
  const response = await api.get<API.ResponseData<KycStatusResponse>>(
    PUBLIC_PATHS.KYC_STATUS(walletAddress)
  )
  return response.object_data as KycStatusResponse
}

// ============================================================================
// 用户接口
// ============================================================================

/**
 * 上传 KYC 文档到 MinIO
 * 参考 Asset Media 上传模式
 *
 * @param documentType - 文档类型: id_front (证件正面), id_back (证件背面), selfie (自拍照)
 * @param file - 要上传的文件 (支持 JPG/PNG/PDF, 最大 10MB)
 * @returns 上传响应，包含文件路径
 *
 * @example
 * ```typescript
 * const result = await uploadKycDocument('id_front', file)
 * console.log(result.file_path) // kyc/0x742d35.../id_front_abc123.jpg
 * ```
 */
export async function uploadKycDocument(
  documentType: KycDocumentType,
  file: File
): Promise<KycUploadResponse> {
  const formData = new FormData()
  formData.append('document_type', documentType)
  formData.append('file', file)

  const response = await api.post<API.ResponseData<KycUploadResponse>>(
    USER_PATHS.KYC_UPLOAD,
    formData
  )
  return response.object_data as KycUploadResponse
}

/**
 * 上传 Base64 编码的图片到 MinIO
 * 用于人脸图片和自拍照上传
 *
 * @param imageData - Base64 编码的图片数据 (支持 data URI 格式 `data:image/jpeg;base64,...` 或纯 base64 字符串)
 * @param documentType - 文档类型: face_image (人脸图片) 或 selfie (自拍照)
 * @returns 上传响应，包含 MinIO 文件路径
 *
 * @example
 * ```typescript
 * // 使用 data URI 格式
 * const result = await uploadBase64Image('data:image/jpeg;base64,/9j/4AAQ...', 'face_image')
 * console.log(result.file_path) // kyc/0x742d35.../face_image_abc123.jpg
 *
 * // 使用纯 base64 字符串
 * const result = await uploadBase64Image('/9j/4AAQ...', 'face_image')
 * ```
 */
export async function uploadBase64Image(
  imageData: string,
  documentType: Base64DocumentType
): Promise<KycUploadResponse> {
  const requestBody: Base64UploadRequest = {
    image_data: imageData,
    document_type: documentType,
  }

  const response = await api.post<API.ResponseData<KycUploadResponse>>(
    USER_PATHS.KYC_UPLOAD_BASE64,
    requestBody
  )
  return response.object_data as KycUploadResponse
}

/**
 * 上传活体检测视频到 MinIO
 * 用于记录活体检测过程
 *
 * @param videoBlob - 视频 Blob (WebM 格式, 最大 50MB)
 * @returns 上传响应，包含 MinIO 文件路径
 *
 * @example
 * ```typescript
 * // 从 MediaRecorder 获取视频 Blob
 * const videoBlob = new Blob(chunks, { type: 'video/webm' })
 * const result = await uploadLivenessVideo(videoBlob)
 * console.log(result.file_path) // kyc/0x742d35.../liveness_video_abc123.webm
 * ```
 */
export async function uploadLivenessVideo(videoBlob: Blob): Promise<KycUploadResponse> {
  const formData = new FormData()
  formData.append('file', videoBlob, 'liveness_video.webm')

  const response = await api.post<API.ResponseData<KycUploadResponse>>(
    USER_PATHS.KYC_UPLOAD_VIDEO,
    formData
  )
  return response.object_data as KycUploadResponse
}

/**
 * Apply for KYC (需要 JWT 认证)
 */
export async function applyKyc(data: KycApplyRequest): Promise<KycFullResponse> {
  const response = await api.post<API.ResponseData<KycFullResponse>>(USER_PATHS.KYC_APPLY, data)
  return response.object_data as KycFullResponse
}

/**
 * 更新 KYC 状态
 * 用户只能在 rejected 状态时设置为 not_started（重新提交）
 *
 * @param targetStatus - 目标状态 (目前只支持 'not_started')
 * @returns 更新后的状态
 */
export async function updateKycStatus(targetStatus: string): Promise<{ status: string }> {
  const requestBody = {
    target_status: targetStatus,
  }

  const response = await api.post<API.ResponseData<{ status: string }>>(
    USER_PATHS.KYC_STATUS_UPDATE,
    requestBody
  )
  return response.object_data as { status: string }
}

/**
 * 获取已上传 KYC 文档的预签名 URL (用于预览)
 *
 * @param filePath - 文件路径 (上传时返回的 file_path)
 * @returns 预签名 URL，有效期 1 小时
 *
 * @example
 * ```typescript
 * const result = await getKycDocumentUrl('kyc/0x742d35.../id_front_abc123.jpg')
 * console.log(result.url) // https://minio.example.com/...
 * ```
 */
export async function getKycDocumentUrl(
  filePath: string
): Promise<{ url: string; file_path: string }> {
  const response = await api.get<API.ResponseData<{ url: string; file_path: string }>>(
    `${USER_PATHS.KYC_DOCUMENT_URL}?file_path=${encodeURIComponent(filePath)}`
  )
  return response.object_data as { url: string; file_path: string }
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
 * Confirm quick approve KYC after wallet tx is mined (dev only)
 */
export async function confirmQuickApproveKyc(
  walletAddress: string,
  txHash: string
): Promise<KycFullResponse> {
  const response = await api.post<API.ResponseData<KycFullResponse>>(
    DEV_PATHS.KYC_QUICK_APPROVE_CONFIRM(walletAddress),
    { tx_hash: txHash }
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
  uploadDocument: uploadKycDocument,
  uploadBase64Image: uploadBase64Image,
  uploadLivenessVideo: uploadLivenessVideo,
  getDocumentUrl: getKycDocumentUrl,
  apply: applyKyc,
  updateStatus: updateKycStatus,

  // 管理员
  list: listKyc,
  getById: getKycById,
  review: reviewKyc,

  // 开发工具
  quickApprove: quickApproveKyc,
  confirmQuickApprove: confirmQuickApproveKyc,
  reset: resetKyc,
}
