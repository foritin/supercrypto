use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// 认购创建请求
#[derive(Debug, Deserialize)]
pub struct CreateSubscriptionRequest {
    pub asset_id: i32,
    pub amount: Decimal,
    pub token_type: String,
    pub lock_period: i32,
}

/// 认购响应
#[derive(Debug, Serialize, FromRow)]
pub struct SubscriptionResponse {
    pub id: i32,
    pub wallet_address: String,
    pub asset_id: i32,
    pub amount: Decimal,
    pub token_type: String,
    pub lock_period: i32,
    pub apy: Decimal,
    pub rwa_token_amount: Decimal,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub expected_interest: Decimal,
    pub actual_interest: Decimal,
    pub tx_hash: Option<String>,
    pub status: String,
    pub created_at: Option<DateTime<Utc>>,
}

/// 质押创建请求
#[derive(Debug, Deserialize)]
pub struct CreateStakingRequest {
    pub subscription_id: Option<i32>,
    pub amount: Decimal,
    pub period: i32,
}

/// 质押响应
#[derive(Debug, Serialize, FromRow)]
pub struct StakingResponse {
    pub id: i32,
    pub wallet_address: String,
    pub subscription_id: Option<i32>,
    pub amount: Decimal,
    pub period: i32,
    pub multiplier: Decimal,
    pub start_date: DateTime<Utc>,
    pub end_date: DateTime<Utc>,
    pub expected_rewards: Decimal,
    pub claimed_rewards: Decimal,
    pub status: String,
    pub created_at: Option<DateTime<Utc>>,
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
