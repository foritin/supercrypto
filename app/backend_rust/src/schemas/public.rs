use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

/// 资产列表响应项
#[derive(Debug, Serialize, Deserialize)]
pub struct AssetListItem {
    pub id: i32,
    pub name: String,
    pub symbol: String,
    pub description: Option<String>,
    pub asset_type: String,
    pub image_url: Option<String>,
    pub location: Option<String>,
    pub current_price: Decimal,
    pub total_supply: Decimal,
    pub subscribed_amount: Decimal,
    pub min_subscription: Decimal,
    pub apy_3m: Decimal,
    pub apy_6m: Decimal,
    pub apy_12m: Decimal,
    pub subscription_mode: String,
    pub status: String,
    pub environment: String,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

/// 资产详情响应
#[derive(Debug, Serialize, Deserialize)]
pub struct AssetDetail {
    pub id: i32,
    pub name: String,
    pub symbol: String,
    pub description: Option<String>,
    pub asset_type: String,
    pub image_url: Option<String>,
    pub document_url: Option<String>,
    pub location: Option<String>,
    pub current_price: Decimal,
    pub price_updated_at: Option<DateTime<Utc>>,
    pub total_supply: Decimal,
    pub subscribed_amount: Decimal,
    pub min_subscription: Decimal,
    pub subscription_start_at: Option<DateTime<Utc>>,
    pub subscription_end_at: Option<DateTime<Utc>>,
    pub apy_3m: Decimal,
    pub apy_6m: Decimal,
    pub apy_12m: Decimal,
    pub subscription_mode: String,
    pub project: Option<String>,
    pub contract_address: Option<String>,
    pub frame_style: Option<String>,
    pub status: String,
    pub environment: String,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

/// 合约地址响应
#[derive(Debug, Serialize, Deserialize)]
pub struct ContractAddressItem {
    pub name: String,
    pub address: String,
    pub project_name: String,
    pub network: String,
    pub chain_id: i32,
}

/// 平台信息响应
#[derive(Debug, Serialize, Deserialize)]
pub struct PlatformInfo {
    pub app_name: String,
    pub version: String,
    pub environment: String,
    pub chain: ChainInfo,
    pub contracts: Vec<ContractAddressItem>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChainInfo {
    pub name: String,
    pub network: String,
    pub chain_id: u64,
    pub rpc_url: String,
}

/// KYC 状态响应
#[derive(Debug, Serialize, Deserialize)]
pub struct KycStatusResponse {
    pub address: String,
    pub status: String,
    pub is_verified: bool,
}

/// 质押配置响应
#[derive(Debug, Serialize, Deserialize)]
pub struct StakingConfig {
    pub periods: Vec<StakingPeriodConfig>,
    pub plt_token: PltTokenInfo,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StakingPeriodConfig {
    pub days: i32,
    pub multiplier: Decimal,
    pub label: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PltTokenInfo {
    pub symbol: String,
    pub name: String,
    pub decimals: i32,
}

/// 质押限额响应
#[derive(Debug, Serialize, Deserialize)]
pub struct StakingLimitResponse {
    pub date: String,
    pub base_limit: Decimal,
    pub carried_limit: Decimal,
    pub used_limit: Decimal,
    pub remaining_limit: Decimal,
    pub total_limit: Decimal,
    pub is_exhausted: bool,
}

/// 认购预览请求
#[derive(Debug, Deserialize)]
pub struct SubscriptionPreviewRequest {
    pub asset_id: i32,
    pub amount: Decimal,
    pub token_type: Option<String>,
    pub lock_period: Option<i32>,
}

/// 认购预览响应
#[derive(Debug, Serialize, Deserialize)]
pub struct SubscriptionPreviewResponse {
    pub asset_id: i32,
    pub amount: Decimal,
    pub token_type: String,
    pub lock_period: i32,
    pub apy: Decimal,
    pub expected_interest: Decimal,
    pub total_return: Decimal,
    pub start_date: DateTime<Utc>,
    pub end_date: Option<DateTime<Utc>>,
}
