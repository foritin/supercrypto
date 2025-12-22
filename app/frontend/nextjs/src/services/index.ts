// API 类型在 types/api.d.ts 中通过 API namespace 全局声明
export { api, ApiError } from "./api";
export {
  kycService,
  KycStatus,
  type KycStatusResponse,
  type KycFullResponse,
  type KycApplyRequest,
} from "./kyc";
export {
  adminService,
  type PlatformStatsResponse,
  type AuditLogResponse,
  type AuditLogQuery,
} from "./admin";
