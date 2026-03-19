/**
 * Audit Service
 * 审计日志和交易审计相关 API 调用
 */
import { API_BASE_URL } from "@/constants/api";

import { get } from "./api";

// ============ 枚举类型 ============

/** 审计类别 */
export enum AuditCategory {
  ACCOUNT = "account",
  PERMISSION = "permission",
  CONTRACT = "contract",
  ASSET = "asset",
  AUTH = "auth",
  SYSTEM = "system",
  KYC = "kyc",
  STAKING = "staking",
}

/** 审计操作类型 */
export enum AuditAction {
  // 账户操作
  ACCOUNT_CREATE = "account.create",
  ACCOUNT_UPDATE = "account.update",
  ACCOUNT_DELETE = "account.delete",
  ACCOUNT_BLOCK = "account.block",
  ACCOUNT_UNBLOCK = "account.unblock",
  // 认证操作
  AUTH_LOGIN = "auth.login",
  AUTH_LOGOUT = "auth.logout",
  AUTH_LOGIN_FAILED = "auth.login_failed",
  AUTH_REFRESH = "auth.refresh",
  // KYC 操作
  KYC_APPROVE = "kyc_approve",
  KYC_REJECT = "kyc_reject",
  KYC_RESET = "kyc_reset",
  // 合约操作
  CONTRACT_REGISTER = "contract.register",
  CONTRACT_UNREGISTER = "contract.unregister",
  CONTRACT_UPDATE = "contract_update",
  // 权限操作
  PERMISSION_GRANT = "permission.grant",
  PERMISSION_REVOKE = "permission.revoke",
  // 其他
  OTHER = "other",
}

/** 审计状态 */
export enum AuditStatus {
  SUCCESS = "success",
  FAILED = "failed",
  PENDING = "pending",
  REVERTED = "reverted",
}

/** 交易类型 */
export enum TransactionAuditType {
  TRANSFER = "transfer",
  TOKEN_TRANSFER = "token_transfer",
  TOKEN_APPROVE = "token_approve",
  CONTRACT_DEPLOY = "contract_deploy",
  CONTRACT_CALL = "contract_call",
  STAKING = "staking",
  UNSTAKING = "unstaking",
  CLAIM_REWARD = "claim_reward",
  SWAP = "swap",
  OTHER = "other",
}

/** 交易状态 */
export enum TransactionAuditStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  FAILED = "failed",
  REVERTED = "reverted",
  DROPPED = "dropped",
}

// ============ 类型定义 ============

/** 审计日志 */
export interface AuditLog {
  id: number;
  category: AuditCategory;
  action: AuditAction;
  status: AuditStatus;
  // 操作者信息
  operator_id: number | null;
  operator_address: string | null;
  operator_type: string | null;
  // 目标信息
  target_type: string | null;
  target_id: number | null;
  target_address: string | null;
  // 操作详情
  description: string | null;
  reason: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  extra_data: Record<string, unknown> | null;
  // 请求上下文
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  // 区块链关联
  tx_hash: string | null;
  block_number: number | null;
  gas_used: number | null;
  // 时间和性能
  operated_at: string;
  duration_ms: number | null;
  // 错误信息
  error_code: string | null;
  error_message: string | null;
  // 环境
  environment: string;
}

/** 交易审计 */
export interface TransactionAudit {
  id: number;
  tx_hash: string;
  chain_id: number;
  network: string;
  from_address: string;
  to_address: string | null;
  value: string;
  tx_type: TransactionAuditType;
  status: TransactionAuditStatus;
  // Token 信息
  token_address: string | null;
  token_symbol: string | null;
  token_decimals: number | null;
  token_amount: string | null;
  // 合约调用信息
  contract_name: string | null;
  function_name: string | null;
  function_args: Record<string, unknown> | null;
  // Gas 信息
  gas_price: string | null;
  gas_limit: number | null;
  gas_used: number | null;
  effective_gas_price: string | null;
  gas_cost: string | null;
  // 区块信息
  block_number: number | null;
  block_timestamp: string | null;
  nonce: number | null;
  // 关联信息
  operator_id: number | null;
  related_audit_id: number | null;
  // 其他
  description: string | null;
  extra_data: Record<string, unknown> | null;
  error_message: string | null;
  // 时间戳
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  // 环境
  environment: string;
}

/** 审计统计 */
export interface AuditStats {
  total_operations: number;
  success_count: number;
  failed_count: number;
  pending_count: number;
  by_category: Record<string, number>;
  by_action: Record<string, number>;
  start_time: string | null;
  end_time: string | null;
}

/** 交易统计 */
export interface TransactionStats {
  total_transactions: number;
  pending_count: number;
  confirmed_count: number;
  failed_count: number;
  reverted_count: number;
  by_type: Record<string, number>;
  by_chain: Record<number, number>;
  total_gas_used: number;
  total_gas_cost: string;
  start_time: string | null;
  end_time: string | null;
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  list_data: T[];
  pagination: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

/** 审计日志查询参数 */
export interface AuditLogQueryParams {
  category?: AuditCategory;
  action?: AuditAction;
  operator_id?: number;
  operator_type?: string;
  target_type?: string;
  target_id?: number;
  status?: AuditStatus;
  start_time?: string;
  end_time?: string;
  tx_hash?: string;
  ip_address?: string;
  page?: number;
  page_size?: number;
}

/** 交易审计查询参数 */
export interface TransactionAuditQueryParams {
  chain_id?: number;
  from_address?: string;
  to_address?: string;
  tx_type?: TransactionAuditType;
  status?: TransactionAuditStatus;
  token_address?: string;
  operator_id?: number;
  start_time?: string;
  end_time?: string;
  page?: number;
  page_size?: number;
}

// ============ API 调用 ============

/**
 * 查询审计日志
 */
export async function queryAuditLogs(
  params?: AuditLogQueryParams
): Promise<PaginatedResponse<AuditLog>> {
  const data = await get<PaginatedResponse<AuditLog>>(
    "/admin/audit-logs",
    params as Record<string, unknown>
  );
  // 防御性处理：确保返回的数据结构完整
  return {
    list_data: data?.list_data || [],
    pagination: data?.pagination || { total: 0, page: 1, page_size: 20, total_pages: 0 },
  };
}

/**
 * 获取审计日志详情
 */
export async function getAuditLog(logId: number): Promise<AuditLog> {
  const data = await get<{ object_data: AuditLog }>(
    `/admin/audit-logs/${logId}`
  );
  return data.object_data;
}

/**
 * 获取审计统计
 */
export async function getAuditStats(params?: {
  start_time?: string;
  end_time?: string;
}): Promise<AuditStats> {
  const data = await get<{ object_data: AuditStats }>(
    "/admin/audit-logs/stats",
    params
  );
  // 防御性处理：返回默认统计数据
  return data?.object_data || {
    total_operations: 0,
    success_count: 0,
    failed_count: 0,
    by_category: {},
    by_action: {},
    by_operator_type: {},
  };
}

/**
 * 获取操作者历史
 */
export async function getOperatorHistory(
  operatorId: number,
  limit?: number
): Promise<AuditLog[]> {
  const data = await get<{ list_data: AuditLog[] }>(
    `/admin/audit-logs/operator/${operatorId}`,
    { limit }
  );
  return data.list_data;
}

/**
 * 获取目标对象历史
 */
export async function getTargetHistory(
  targetType: string,
  targetId: number,
  limit?: number
): Promise<AuditLog[]> {
  const data = await get<{ list_data: AuditLog[] }>(
    `/admin/audit-logs/target/${targetType}/${targetId}`,
    { limit }
  );
  return data.list_data;
}

/**
 * 导出审计日志
 */
export async function exportAuditLogs(
  params?: AuditLogQueryParams
): Promise<Blob> {
  // 从 localStorage 获取正确的 token key
  const token = localStorage.getItem("supercrypto-jwt");
  const response = await fetch(
    `${API_BASE_URL}/admin/audit-logs/export?${new URLSearchParams(
      params as Record<string, string>
    )}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.blob();
}

// ============ 交易审计 API ============

/**
 * 查询交易审计
 */
export async function queryTransactionAudits(
  params?: TransactionAuditQueryParams
): Promise<PaginatedResponse<TransactionAudit>> {
  const data = await get<PaginatedResponse<TransactionAudit>>(
    "/admin/transactions/audit",
    params as Record<string, unknown>
  );
  // 防御性处理：确保返回的数据结构完整
  return {
    list_data: data?.list_data || [],
    pagination: data?.pagination || { total: 0, page: 1, page_size: 20, total_pages: 0 },
  };
}

/**
 * 获取交易详情
 */
export async function getTransactionAudit(
  txHash: string
): Promise<TransactionAudit> {
  const data = await get<{ object_data: TransactionAudit }>(
    `/admin/transactions/audit/${txHash}`
  );
  return data.object_data;
}

/**
 * 获取交易统计
 */
export async function getTransactionStats(params?: {
  chain_id?: number;
  start_time?: string;
  end_time?: string;
}): Promise<TransactionStats> {
  const data = await get<{ object_data: TransactionStats }>(
    "/admin/transactions/audit/stats",
    params
  );
  // 防御性处理：返回默认统计数据
  return data?.object_data || {
    total_transactions: 0,
    pending_count: 0,
    confirmed_count: 0,
    failed_count: 0,
    reverted_count: 0,
    by_type: {},
    by_chain: {},
    total_gas_used: 0,
    total_gas_cost: "0",
  };
}

/**
 * 获取待确认交易
 */
export async function getPendingTransactions(
  chainId?: number
): Promise<TransactionAudit[]> {
  const data = await get<{ list_data: TransactionAudit[] }>(
    "/admin/transactions/audit/pending",
    chainId ? { chain_id: chainId } : undefined
  );
  return data?.list_data || [];
}

// ============ 导出服务对象 ============

export const auditService = {
  // 审计日志
  queryLogs: queryAuditLogs,
  getLog: getAuditLog,
  getStats: getAuditStats,
  getOperatorHistory,
  getTargetHistory,
  export: exportAuditLogs,
  // 交易审计
  queryTransactions: queryTransactionAudits,
  getTransaction: getTransactionAudit,
  getTransactionStats,
  getPendingTransactions,
};
