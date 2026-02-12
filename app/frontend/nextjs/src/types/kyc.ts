/**
 * KYC 类型定义
 * 集中导出所有 KYC 相关类型
 */
export type {
  KycStatus,
  KycIdType,
  KycStatusResponse,
  KycFullResponse,
  KycDocumentInfo,
  KycApplyRequest,
  KycDocumentResponse,
  KycReviewRequest,
  PaginatedResponse,
} from '@/services/kyc'

export type {
  KycItem,
  KycDetail,
  KycAuditLogEntry,
  KycStats,
  KycFilterParams,
  RiskLevel,
  ReviewPriority,
  BatchReviewRequest,
  BatchReviewResponse,
  KycReviewRequest as AdminKycReviewRequest,
} from '@/services/admin-kyc'
