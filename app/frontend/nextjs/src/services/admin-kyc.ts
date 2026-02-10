/**
 * Admin KYC Service
 * KYC 管理服务
 * 
 * 功能:
 * - 风险评级 (Risk Scoring)
 * - 审核时间统计
 * - 批量操作
 * - 高级筛选
 * - 审核日志
 */

import { get, post, put } from "./api";
import type { KycStatusType, OnChainSyncStatus } from "./admin";
import type { ReviewStepsData } from "@/components/admin-kyc/stepper-reducer";

// ============ Types ============

/** 风险等级 */
export type RiskLevel = "low" | "medium" | "high" | "critical";

/** 审核优先级 */
export type ReviewPriority = "low" | "normal" | "high" | "urgent";

/** KYC 列表项 */
export interface KycItem {
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
  // 风险评估字段
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
  action: "submit" | "review" | "approve" | "reject" | "resubmit" | "sync" | "reset" | "admit" | "revoke";
  actor_address: string;
  actor_role: "user" | "admin" | "system";
  details: Record<string, unknown>;
  created_at: string;
}

/** KYC 详情 */
export interface KycDetail {
  kyc: KycItem;
  documents: {
    id_front?: string;
    id_back?: string;
    selfie?: string;
    face_image?: string;      // 活体检测人脸照片
    liveness_video?: string;  // 活体检测视频
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

/** KYC 统计 */
export interface KycStats {
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

/** 单条 KYC 审核请求（含审核步骤轨迹） */
export interface KycReviewRequest {
  approved: boolean;
  reject_reason_code?: string;
  reject_reason?: string;
  is_accredited?: boolean;
  /** 审核步骤确认轨迹 */
  review_steps?: ReviewStepsData;
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
 * 获取 KYC 统计
 */
export async function getKycStats(): Promise<KycStats> {
  const data = await get<{ object_data: KycStats }>("/admin/kyc/stats");
  return data.object_data;
}

/**
 * 获取 KYC 列表
 */
export async function getKycList(
  params: KycFilterParams
): Promise<{ list_data: KycItem[]; pagination: { total: number; page: number; page_size: number } }> {
  const data = await get<{
    list_data: KycItem[];
    pagination: { total: number; page: number; page_size: number };
  }>("/admin/kyc/", params as Record<string, unknown>);
  return data;
}

/**
 * 获取 KYC 详情
 */
export async function getKycDetail(kycId: number): Promise<KycDetail> {
  const data = await get<{ object_data: KycDetail }>(`/admin/kyc/${kycId}`);
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
  const data = await get<{ object_data: { download_url: string } }>("/admin/kyc/export", params as Record<string, unknown>);
  return data.object_data;
}

/**
 * 更新审核步骤进度
 * 将当前步骤和确认状态持久化到后端，以便审核员关闭浏览器后恢复进度
 */
export async function updateReviewProgress(
  kycId: number,
  currentStep: number,
  confirmedSteps: boolean[]
): Promise<void> {
  await put(`/admin/kyc/${kycId}/review-progress`, {
    current_step: currentStep,
    confirmed_steps: confirmedSteps,
  });
}

/**
 * 记录链上准入结果
 * 前端完成 addInvestor 交易后调用，更新 on_chain_sync_status 为 SYNCED
 */
export async function recordAdmission(kycId: number, txHash: string): Promise<KycDetail> {
  const data = await post<{ object_data: KycDetail }>(
    `/admin/kyc/${kycId}/record-admission`,
    { tx_hash: txHash }
  );
  return data.object_data;
}

/**
 * 记录链上解除准入结果
 * 前端完成 removeInvestor 交易后调用，更新 on_chain_sync_status 为 PENDING
 */
export async function recordRevocation(kycId: number, txHash: string, reason: string): Promise<KycDetail> {
  const data = await post<{ object_data: KycDetail }>(
    `/admin/kyc/${kycId}/record-revocation`,
    { tx_hash: txHash, reason }
  );
  return data.object_data;
}

/**
 * 获取 KYCManager 合约信息
 * 返回合约地址和部署者地址，用于前端验证钱包权限
 */
export async function getKycContractInfo(): Promise<{ contract_address: string; deployer_address: string }> {
  const data = await get<{ object_data: { contract_address: string; deployer_address: string } }>(
    '/admin/kyc/contract-info'
  );
  return data.object_data;
}

// ============ Service Object ============

export const adminKycService = {
  // New names (preferred)
  getKycStats,
  getKycList,
  getKycDetail,
  batchReviewKyc,
  getKycAuditLogs,
  recalculateRiskScore,
  exportKycData,
  updateReviewProgress,
  recordAdmission,
  recordRevocation,
  getKycContractInfo,
};

// Re-export ReviewStepsData from stepper-reducer for service-layer consumers
export type { ReviewStepsData } from "@/components/admin-kyc/stepper-reducer";
