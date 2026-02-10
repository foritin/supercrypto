/**
 * Admin Service
 * 管理员相关 API 调用
 */
import { get } from "./api";

// ============ 类型定义 ============

/** TVL 资产分解 */
export interface TVLBreakdown {
  asset_id: number;
  asset_name: string;
  amount: number;
  percentage: number;
}

/** TVL 统计响应 */
export interface TVLStatsResponse {
  total_tvl: number;
  change_24h: number;
  change_7d: number;
  breakdown: TVLBreakdown[];
}

/** 用户统计响应 */
export interface UserStatsResponse {
  total_users: number;
  kyc_approved: number;
  kyc_pending: number;
  kyc_rejected: number;
  new_users_24h: number;
  new_users_7d: number;
  kyc_conversion_rate: number;
}

/** 质押池统计响应 */
export interface StakingPoolStatsResponse {
  total_staked: number;
  active_stakes: number;
  total_rewards_distributed: number;
  rewards_pool_remaining: number;
  avg_stake_period: number;
  period_distribution: Record<number, number>;
}

/** 平台统计汇总 */
export interface PlatformStatsResponse {
  tvl: TVLStatsResponse;
  users: UserStatsResponse;
  staking: StakingPoolStatsResponse;
  active_subscriptions: number;
  total_subscriptions: number;
  total_assets: number;
}

/** 审计日志类型 */
export type AuditAction =
  | "KYC_APPROVE"
  | "KYC_REJECT"
  | "ASSET_CREATE"
  | "ASSET_UPDATE"
  | "ASSET_PAUSE"
  | "CONTRACT_BIND"
  | "CONTRACT_SYNC"
  | "STAKING_START"
  | "STAKING_PAUSE"
  | "ADMIN_ACTION";

/** 审计日志响应 */
export interface AuditLogResponse {
  id: number;
  operator_address: string;
  action: AuditAction;
  target_type?: string;
  target_id?: string;
  details?: Record<string, unknown>;
  success: boolean;
  error_message?: string;
  tx_hash?: string;
  ip_address?: string;
  environment: string;
  created_at: string;
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
export interface AuditLogQuery {
  action?: AuditAction;
  operator_address?: string;
  target_type?: string;
  success?: boolean;
  page?: number;
  page_size?: number;
}

// ============ API 调用 ============

/**
 * 获取平台统计汇总
 */
export async function getPlatformStats(): Promise<PlatformStatsResponse> {
  const data = await get<{ object_data: PlatformStatsResponse }>("/admin/stats");
  return data.object_data;
}

/**
 * 获取 TVL 统计
 */
export async function getTVLStats(): Promise<TVLStatsResponse> {
  const data = await get<{ object_data: TVLStatsResponse }>("/admin/stats/tvl");
  return data.object_data;
}

/**
 * 获取用户统计
 */
export async function getUserStats(): Promise<UserStatsResponse> {
  const data = await get<{ object_data: UserStatsResponse }>("/admin/stats/users");
  return data.object_data;
}

/**
 * 获取质押池统计
 */
export async function getStakingStats(): Promise<StakingPoolStatsResponse> {
  const data = await get<{ object_data: StakingPoolStatsResponse }>(
    "/admin/stats/staking"
  );
  return data.object_data;
}

/**
 * 获取审计日志列表
 */
export async function getAuditLogs(
  query?: AuditLogQuery
): Promise<PaginatedResponse<AuditLogResponse>> {
  const data = await get<PaginatedResponse<AuditLogResponse>>(
    "/admin/audit-logs",
    query as Record<string, unknown> | undefined
  );
  return data;
}

/**
 * 获取审计日志详情
 */
export async function getAuditLogDetail(
  logId: number
): Promise<AuditLogResponse> {
  const data = await get<{ object_data: AuditLogResponse }>(
    `/admin/audit-logs/${logId}`
  );
  return data.object_data;
}

// ============ KYC Admin Types (Story 2.9) ============

/** KYC 状态 */
export type KycStatusType = "not_started" | "pending" | "approved" | "rejected";

/** 链上同步状态 */
export type OnChainSyncStatus =
  | "not_required"
  | "pending"
  | "synced"
  | "failed"
  | "revoked";

/** KYC 列表项 */
export interface AdminKycItem {
  id: number;
  wallet_address: string;
  environment: string;
  status: KycStatusType;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewer_address: string | null;
  reject_reason: string | null;
  country_code: string | null;
  is_accredited: boolean;
  id_type: string | null;
  id_number_last4: string | null;
  full_name: string | null;
  date_of_birth: string | null;
  has_id_front: boolean;
  has_id_back: boolean;
  has_selfie: boolean;
  on_chain_sync_status: OnChainSyncStatus | null;
  on_chain_tx_hash: string | null;
  on_chain_error: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** KYC 详情响应 */
export interface AdminKycDetail {
  kyc: AdminKycItem;
  documents: {
    id_front?: string;
    id_back?: string;
    selfie?: string;
  };
}

/** KYC 统计 */
export interface KycStats {
  pending: number;
  approved: number;
  rejected: number;
  failed_sync: number;
  total: number;
}

/** 拒绝原因选项 (支持多语言) */
export interface RejectReasonOption {
  code: string;
  labels: {
    zh: string;
    en: string;
  };
}

/** 合约对比响应 */
export interface KycContractComparison {
  database: {
    status: string;
    sync_status: string | null;
    tx_hash: string | null;
    synced_at: string | null;
    error: string | null;
  };
  on_chain: {
    verified: boolean | null;
    info: Record<string, unknown> | null;
    error: string | null;
  };
}

// ============ KYC Admin API (Story 2.9) ============

/**
 * 获取 KYC 统计
 */
export async function getKycStats(): Promise<KycStats> {
  const data = await get<{ object_data: KycStats }>("/admin/kyc/stats");
  return data.object_data;
}

/**
 * 获取待审核 KYC 列表
 */
export async function getPendingKycList(params?: {
  page?: number;
  page_size?: number;
}): Promise<PaginatedResponse<AdminKycItem>> {
  const data = await get<PaginatedResponse<AdminKycItem>>(
    "/admin/kyc/pending",
    params
  );
  return data;
}

/**
 * 获取 KYC 列表
 */
export async function getKycList(params?: {
  status?: KycStatusType;
  page?: number;
  page_size?: number;
}): Promise<PaginatedResponse<AdminKycItem>> {
  const data = await get<PaginatedResponse<AdminKycItem>>(
    "/admin/kyc/list",
    params
  );
  return data;
}

/**
 * 获取同步失败的 KYC 列表
 */
export async function getFailedSyncKycList(): Promise<AdminKycItem[]> {
  const data = await get<{ list_data: AdminKycItem[] }>("/admin/kyc/failed-sync");
  return data.list_data;
}

/**
 * 获取拒绝原因预设列表
 */
export async function getRejectReasons(): Promise<RejectReasonOption[]> {
  const data = await get<{ list_data: RejectReasonOption[] }>(
    "/admin/kyc/reject-reasons"
  );
  return data.list_data;
}

/**
 * 获取 KYC 详情
 */
export async function getKycDetail(kycId: number): Promise<AdminKycDetail> {
  const data = await get<{ object_data: AdminKycDetail }>(`/admin/kyc/${kycId}`);
  return data.object_data;
}

/**
 * 获取 KYC 合约对比
 */
export async function getKycContractComparison(
  kycId: number
): Promise<KycContractComparison> {
  const data = await get<{ object_data: KycContractComparison }>(
    `/admin/kyc/${kycId}/contract-comparison`
  );
  return data.object_data;
}

export const adminService = {
  getPlatformStats,
  getTVLStats,
  getUserStats,
  getStakingStats,
  getAuditLogs,
  getAuditLogDetail,
  // KYC Admin (Story 2.9)
  getKycStats,
  getPendingKycList,
  getKycList,
  getFailedSyncKycList,
  getRejectReasons,
  getKycDetail,
  getKycContractComparison,
};
