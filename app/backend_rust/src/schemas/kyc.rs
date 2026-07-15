// KYC schemas
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct KycListItem {
    pub id: i64,
    pub address: Option<String>,
    pub network: Option<String>,
    pub status: Option<String>,
    pub full_name: Option<String>,
    pub submitted_at: Option<NaiveDateTime>,
    pub reviewed_at: Option<NaiveDateTime>,
    pub risk_level: Option<String>,
    pub risk_score: Option<i64>,
    pub priority: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct KycDetail {
    pub id: i64,
    pub address: Option<String>,
    pub network: Option<String>,
    pub status: Option<String>,
    pub submitted_at: Option<NaiveDateTime>,
    pub reviewed_at: Option<NaiveDateTime>,
    pub reviewer_address: Option<String>,
    pub reject_reason: Option<String>,
    pub full_name: Option<String>,
    pub date_of_birth: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub country_code: Option<String>,
    pub risk_level: Option<String>,
    pub risk_score: Option<i64>,
    pub priority: Option<String>,
    pub documents: Vec<KycDocumentItem>,
}

#[derive(Debug, Serialize)]
pub struct KycDocumentItem {
    pub id: i64,
    pub id_type: Option<String>,
    pub id_number_last4: Option<String>,
    pub document_expiry: Option<String>,
    pub id_front_url: Option<String>,
    pub id_back_url: Option<String>,
}

// ============ Review Schemas ============

/// KYC 审核请求 (管理员用) — 对应 Python KycReviewRequest
#[derive(Debug, Deserialize)]
pub struct KycReviewRequest {
    pub approved: bool,
    #[serde(default)]
    pub is_accredited: bool,
    pub reject_reason: Option<String>,
    pub reject_reason_code: Option<String>,
    pub review_steps: Option<ReviewStepsData>,
}

/// 审核步骤确认数据 — 对应 Python ReviewStepsData
#[derive(Debug, Deserialize, Serialize)]
pub struct ReviewStepsData {
    pub current_step: i32,
    pub confirmed_steps: Vec<bool>,
    pub reviewer_notes: Option<String>,
}

/// 批量审核请求 — 对应 Python BatchReviewRequest
#[derive(Debug, Deserialize)]
pub struct BatchReviewRequest {
    pub kyc_ids: Vec<i64>,
    pub action: String,
    pub reject_reason_code: Option<String>,
    pub reject_reason: Option<String>,
    #[serde(default)]
    pub is_accredited: bool,
}

/// 批量审核单条结果 — 对应 Python BatchReviewResult
#[derive(Debug, Serialize)]
pub struct BatchReviewResult {
    pub kyc_id: i64,
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// 批量审核响应 — 对应 Python BatchReviewResponse
#[derive(Debug, Serialize)]
pub struct BatchReviewResponse {
    pub total: usize,
    pub success: usize,
    pub failed: usize,
    pub results: Vec<BatchReviewResult>,
}
