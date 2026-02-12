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
  exportAuditLogs,
} from "./audit";

// 类型从 types/ 目录集中导出
export {
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
} from "@/types/audit";
