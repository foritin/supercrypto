use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// 区块链网络配置表 (aligned with Python backend Chain model)
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Chain {
    pub id: i64,
    pub chain_id: i64,
    pub name: String,
    pub display_name: String,
    pub symbol: String,
    pub decimals: i64,
    pub rpc_url: String,
    pub rpc_url_backup: Option<String>,
    pub block_explorer: Option<String>,
    pub environment: String,
    pub is_testnet: bool,
    pub is_enabled: bool,
    pub icon: Option<String>,
    pub sort_order: i64,
    pub metadata: Option<serde_json::Value>,
    // network column kept for backward compat (Python uses environment instead)
    pub network: Option<String>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}
