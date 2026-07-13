use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

/// 资产创建请求
#[derive(Debug, Deserialize)]
pub struct CreateAssetRequest {
    pub name: String,
    pub symbol: String,
    pub description: Option<String>,
    pub asset_type: String,
    pub image_url: Option<String>,
    pub document_url: Option<String>,
    pub location: Option<String>,
    pub total_supply: String,
    pub min_subscription: String,
    pub subscription_start_at: Option<NaiveDateTime>,
    pub subscription_end_at: Option<NaiveDateTime>,
    pub apy_3m: String,
    pub apy_6m: String,
    pub apy_12m: String,
    pub subscription_mode: String,
    pub project: Option<String>,
    pub frame_style: Option<String>,
}

/// 资产更新请求
#[derive(Debug, Deserialize)]
pub struct UpdateAssetRequest {
    pub name: Option<String>,
    pub symbol: Option<String>,
    pub description: Option<String>,
    pub current_price: Option<String>,
    pub status: Option<String>,
}

/// 资产价格更新请求
#[derive(Debug, Deserialize)]
pub struct UpdateAssetPriceRequest {
    pub price: String,
    pub source: Option<String>,
}

/// 绑定项目请求
#[derive(Debug, Deserialize)]
pub struct BindProjectRequest {
    pub project_name: String,
    pub contract_address: String,
    pub contract_name: String,
    pub is_primary: i64,
}

/// KYC 审核请求
#[derive(Debug, Deserialize)]
pub struct KycReviewRequest {
    pub status: String,
    pub reject_reason: Option<String>,
    pub reviewer_address: String,
}

/// 平台统计响应
#[derive(Debug, Serialize)]
pub struct StatsResponse {
    pub total_users: i64,
    pub total_assets: i64,
    pub total_subscriptions: i64,
    pub total_staking: i64,
    pub total_tvl: String,
    pub total_staking_rewards: String,
}

/// 账户创建请求
#[derive(Debug, Deserialize)]
pub struct CreateAccountRequest {
    pub address: String,
    pub private_key: String,
    pub roles: Vec<String>,
    pub network: String,
}

/// 交易创建请求
#[derive(Debug, Deserialize)]
pub struct CreateTransactionRequest {
    pub tx_hash: String,
    pub from_address: Option<String>,
    pub to_address: Option<String>,
    pub amount: Option<String>,
    pub token_type: Option<String>,
    pub tx_type: Option<String>,
}
