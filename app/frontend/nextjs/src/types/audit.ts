/**
 * 审计业务类型定义
 * 集中导出所有审计和交易审计相关类型
 */

// 审计日志类型（来自 services/audit）
export {
  AuditCategory,
  AuditAction,
  AuditStatus,
  TransactionAuditType,
  TransactionAuditStatus,
} from '@/services/audit'

export type {
  AuditLog,
  TransactionAudit,
  AuditStats,
  TransactionStats,
  PaginatedResponse,
  AuditLogQueryParams,
  TransactionAuditQueryParams,
} from '@/services/audit'

// 交易审计类型（来自 services/transaction-audit）
export {
  TransactionType as TransactionAuditRecordType,
} from '@/services/transaction-audit'

export type {
  RecordTransactionRequest,
  TransactionAuditRecord,
} from '@/services/transaction-audit'
