use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// 认购创建请求
#[derive(Debug, Deserialize)]
pub struct CreateSubscriptionRequest {
    pub asset_id: i64,
    pub amount: f64,
    pub token_type: String,
    pub lock_period: i64,
    pub tx_hash: Option<String>,
}

/// 认购响应
#[derive(Debug, Serialize, FromRow)]
pub struct SubscriptionResponse {
    pub id: i64,
    pub wallet_address: String,
    pub asset_id: i64,
    pub asset_name: Option<String>,
    pub asset_symbol: Option<String>,
    pub amount: Option<f64>,
    pub token_type: String,
    pub lock_period: i64,
    pub apy: Option<f64>,
    pub rwa_token_amount: Option<f64>,
    pub start_date: Option<NaiveDateTime>,
    pub end_date: Option<NaiveDateTime>,
    pub expected_interest: Option<f64>,
    pub actual_interest: Option<f64>,
    pub total_return: Option<f64>,
    pub days_remaining: Option<i64>,
    pub is_matured: Option<i64>,
    pub tx_hash: Option<String>,
    pub redeem_tx_hash: Option<String>,
    pub status: String,
    pub environment: String,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

/// 质押创建请求
#[derive(Debug, Deserialize)]
pub struct CreateStakingRequest {
    pub subscription_id: Option<i64>,
    pub amount: f64,
    pub period: i64,
}

/// 质押响应
#[derive(Debug, Serialize, FromRow)]
pub struct StakingResponse {
    pub id: i64,
    pub wallet_address: String,
    pub subscription_id: Option<i64>,
    pub amount: String,
    pub period: i64,
    pub multiplier: String,
    pub start_date: NaiveDateTime,
    pub end_date: NaiveDateTime,
    pub expected_rewards: String,
    pub claimed_rewards: String,
    pub status: String,
    pub created_at: Option<NaiveDateTime>,
}

/// KYC 上传请求
#[derive(Debug, Deserialize)]
pub struct KycUploadRequest {
    pub id_type: String,
    pub id_number: String,
    pub document_expiry: Option<String>,
}

/// KYC 申请请求
#[derive(Debug, Deserialize)]
pub struct KycApplyRequest {
    pub full_name: String,
    pub date_of_birth: String,
    pub email: String,
    pub phone: String,
    pub address_line1: String,
    pub city: String,
    pub state: String,
    pub postal_code: String,
    pub residence_country: String,
}
