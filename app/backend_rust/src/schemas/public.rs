use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

/// 资产列表响应项
#[derive(Debug, Serialize, Deserialize)]
pub struct AssetListItem {
    pub id: i64,
    pub name: String,
    pub symbol: String,
    pub description: Option<String>,
    pub asset_type: String,
    pub image_url: Option<String>,
    pub location: Option<String>,
    pub current_price: String,
    pub total_supply: String,
    pub subscribed_amount: String,
    pub min_subscription: String,
    pub apy_3m: String,
    pub apy_6m: String,
    pub apy_12m: String,
    pub subscription_mode: String,
    pub status: String,
    pub environment: String,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

/// 资产详情响应
#[derive(Debug, Serialize, Deserialize)]
pub struct AssetDetail {
    pub id: i64,
    pub name: String,
    pub symbol: String,
    pub description: Option<String>,
    pub asset_type: String,
    pub image_url: Option<String>,
    pub document_url: Option<String>,
    pub location: Option<String>,
    pub current_price: String,
    pub price_updated_at: Option<NaiveDateTime>,
    pub total_supply: String,
    pub subscribed_amount: String,
    pub min_subscription: String,
    pub subscription_start_at: Option<NaiveDateTime>,
    pub subscription_end_at: Option<NaiveDateTime>,
    pub apy_3m: String,
    pub apy_6m: String,
    pub apy_12m: String,
    pub subscription_mode: String,
    pub project: Option<String>,
    pub contract_address: Option<String>,
    pub frame_style: Option<String>,
    pub status: String,
    pub environment: String,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

/// 合约地址响应
#[derive(Debug, Serialize, Deserialize)]
pub struct ContractAddressItem {
    pub name: String,
    pub address: String,
    pub project_name: String,
    pub network: String,
    pub chain_id: i64,
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
    pub is_verified: i64,
}

/// 质押配置响应
#[derive(Debug, Serialize, Deserialize)]
pub struct StakingConfig {
    pub periods: Vec<StakingPeriodConfig>,
    pub plt_token: PltTokenInfo,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StakingPeriodConfig {
    pub days: i64,
    pub multiplier: String,
    pub label: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PltTokenInfo {
    pub symbol: String,
    pub name: String,
    pub decimals: i64,
}

/// 质押限额响应
#[derive(Debug, Serialize, Deserialize)]
pub struct StakingLimitResponse {
    pub date: String,
    pub base_limit: String,
    pub carried_limit: String,
    pub used_limit: String,
    pub remaining_limit: String,
    pub total_limit: String,
    pub is_exhausted: i64,
}

/// 认购预览请求
#[derive(Debug, Deserialize)]
pub struct SubscriptionPreviewRequest {
    pub asset_id: i64,
    pub amount: String,
    pub token_type: Option<String>,
    pub lock_period: Option<i64>,
}

/// 认购预览响应
#[derive(Debug, Serialize, Deserialize)]
pub struct SubscriptionPreviewResponse {
    pub asset_id: i64,
    pub amount: String,
    pub token_type: String,
    pub lock_period: i64,
    pub apy: String,
    pub expected_interest: String,
    pub total_return: String,
    pub start_date: NaiveDateTime,
    pub end_date: Option<NaiveDateTime>,
}
