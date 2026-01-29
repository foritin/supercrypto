// API 类型在 types/api.d.ts 中通过 API namespace 全局声明
export { api, ApiError } from "./api";
export {
  kycService,
  KycStatus,
  type KycStatusResponse,
  type KycFullResponse,
  type KycApplyRequest,
  type KycDocumentType,
  type KycUploadResponse,
  uploadKycDocument,
} from "./kyc";
export {
  adminService,
  type PlatformStatsResponse,
  type AuditLogResponse,
  type AuditLogQuery,
} from "./admin";
export {
  auditService,
  AuditCategory,
  AuditAction,
  AuditStatus,
  TransactionAuditType,
  TransactionAuditStatus,
  type AuditLog,
  type TransactionAudit,
  type AuditStats,
  type TransactionStats,
  type AuditLogQueryParams,
  type TransactionAuditQueryParams,
} from "./audit";
