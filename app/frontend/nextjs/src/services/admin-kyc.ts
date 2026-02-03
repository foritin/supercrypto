/**
 * Admin KYC Service - Enhanced Version
 * 增强版 KYC 管理服务
 * 
 * 功能扩展:
 * - 风险评级 (Risk Scoring)
 * - 审核时间统计
 * - 批量操作
 * - 高级筛选
 * - 审核日志
 */

import { get, post } from "./api";
import type { KycStatusType, OnChainSyncStatus } from "./admin";

// ============ 增强版 Types ============

/** 风险等级 */
export type RiskLevel = "low" | "medium" | "high" | "critical";

/** 审核优先级 */
export type ReviewPriority = "low" | "normal" | "high" | "urgent";

/** 增强版 KYC 列表项 */
export interface EnhancedKycItem {
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
  // 增强字段
  risk_level: RiskLevel;
  risk_score: number; // 0-100
  priority: ReviewPriority;
  processing_time_minutes: number | null; // 处理耗时
  is_pep: boolean; // 政治敏感人物
  is_sanctioned: boolean; // 制裁名单
  source_ip: string | null;
  device_fingerprint: string | null;
}

/** KYC 审核日志条目 */
export interface KycAuditLogEntry {
  id: number;
  kyc_id: number;
  action: "submit" | "review" | "approve" | "reject" | "resubmit" | "sync" | "reset";
  actor_address: string;
  actor_role: "user" | "admin" | "system";
  details: Record<string, unknown>;
  created_at: string;
}

/** 增强版 KYC 详情 */
export interface EnhancedKycDetail {
  kyc: EnhancedKycItem;
  documents: {
    id_front?: string;
    id_back?: string;
    selfie?: string;
  };
  audit_logs: KycAuditLogEntry[];
  ocr_data: {
    full_name?: string;
    id_number?: string;
    date_of_birth?: string;
    expiry_date?: string;
    nationality?: string;
    confidence_score: number;
  } | null;
  facial_comparison: {
    similarity_score: number; // 0-100
    liveness_score: number; // 0-100
    is_match: boolean;
  } | null;
  risk_details: {
    factors: Array<{
      type: string;
      score: number;
      description: string;
    }>;
    pep_matches: Array<{
      name: string;
      position: string;
      country: string;
      match_score: number;
    }>;
    sanction_matches: Array<{
      name: string;
      list: string;
      match_score: number;
    }>;
  } | null;
}

/** 增强版 KYC 统计 */
export interface EnhancedKycStats {
  // 基础统计
  pending: number;
  approved: number;
  rejected: number;
  failed_sync: number;
  total: number;
  
  // 时间统计
  avg_processing_time_minutes: number;
  median_processing_time_minutes: number;
  
  // 转化率
  approval_rate: number; // 0-100
  resubmit_rate: number; // 0-100
  
  // 风险分布
  risk_distribution: Record<RiskLevel, number>;
  
  // 趋势数据 (最近7天)
  daily_stats: Array<{
    date: string;
    submitted: number;
    approved: number;
    rejected: number;
    avg_processing_time: number;
  }>;
  
  // 处理者统计
  reviewer_stats: Array<{
    address: string;
    reviewed_count: number;
    avg_processing_time: number;
    approval_rate: number;
  }>;
}

/** 批量审核请求 */
export interface BatchReviewRequest {
  kyc_ids: number[];
  action: "approve" | "reject";
  reject_reason_code?: string;
  reject_reason?: string;
  is_accredited?: boolean;
}

/** 批量审核响应 */
export interface BatchReviewResponse {
  total: number;
  success: number;
  failed: number;
  results: Array<{
    kyc_id: number;
    success: boolean;
    error?: string;
  }>;
}

/** KYC 筛选参数 */
export interface KycFilterParams {
  status?: KycStatusType;
  risk_level?: RiskLevel;
  priority?: ReviewPriority;
  country_code?: string;
  date_from?: string;
  date_to?: string;
  search_query?: string; // 钱包地址或姓名搜索
  has_pep?: boolean;
  has_sanction?: boolean;
  page?: number;
  page_size?: number;
  sort_by?: "submitted_at" | "risk_score" | "priority" | "processing_time";
  sort_order?: "asc" | "desc";
}

// ============ API Functions ============

/**
 * 获取增强版 KYC 统计
 */
export async function getEnhancedKycStats(): Promise<EnhancedKycStats> {
  const data = await get<{ object_data: EnhancedKycStats }>("/admin/kyc/stats/enhanced");
  return data.object_data;
}

/**
 * 获取增强版 KYC 列表
 */
export async function getEnhancedKycList(
  params: KycFilterParams
): Promise<{ list_data: EnhancedKycItem[]; pagination: { total: number; page: number; page_size: number } }> {
  const data = await get<{
    list_data: EnhancedKycItem[];
    pagination: { total: number; page: number; page_size: number };
  }>("/admin/kyc/list/enhanced", params);
  return data;
}

/**
 * 获取增强版 KYC 详情
 */
export async function getEnhancedKycDetail(kycId: number): Promise<EnhancedKycDetail> {
  const data = await get<{ object_data: EnhancedKycDetail }>(`/admin/kyc/${kycId}/enhanced`);
  return data.object_data;
}

/**
 * 批量审核 KYC
 */
export async function batchReviewKyc(request: BatchReviewRequest): Promise<BatchReviewResponse> {
  const data = await post<{ object_data: BatchReviewResponse }>("/admin/kyc/batch-review", request);
  return data.object_data;
}

/**
 * 获取 KYC 审核日志
 */
export async function getKycAuditLogs(kycId: number): Promise<KycAuditLogEntry[]> {
  const data = await get<{ list_data: KycAuditLogEntry[] }>(`/admin/kyc/${kycId}/audit-logs`);
  return data.list_data;
}

/**
 * 重新计算风险评分
 */
export async function recalculateRiskScore(kycId: number): Promise<{ risk_level: RiskLevel; risk_score: number }> {
  const data = await post<{ object_data: { risk_level: RiskLevel; risk_score: number } }>(
    `/admin/kyc/${kycId}/recalculate-risk`,
    {}
  );
  return data.object_data;
}

/**
 * 导出 KYC 数据
 */
export async function exportKycData(params: KycFilterParams): Promise<{ download_url: string }> {
  const data = await get<{ object_data: { download_url: string } }>("/admin/kyc/export", params);
  return data.object_data;
}

export const adminKycService = {
  getEnhancedKycStats,
  getEnhancedKycList,
  getEnhancedKycDetail,
  batchReviewKyc,
  getKycAuditLogs,
  recalculateRiskScore,
  exportKycData,
};
