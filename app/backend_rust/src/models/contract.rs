use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ContractDeployment {
    pub id: i64,
    pub name: String,
    pub address: String,
    pub deployer_address: String,
    pub network: String,
    pub chain_id: i64,
    pub scope: String,
    pub contract_type: String,
    pub project_name: String,
    pub tx_hash: String,
    pub status: String,
    pub abi_path: Option<String>,
    #[sqlx(default)]
    pub abi: Option<String>,
    #[sqlx(default)]
    pub is_primary: i64,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ContractConfig {
    pub id: i64,
    pub contract_name: String,
    pub project_name: String,
    pub provider_key: Option<String>,
    pub provider_key_hash: Option<String>,
    pub dependencies: Option<serde_json::Value>,
    pub contract_type: String,
    pub scope: String,
    pub description: Option<String>,
    pub dependency_type: String,
    pub is_primary: i64,
    pub deploy_order: Option<i64>,
    pub required_deps: Option<serde_json::Value>,
    pub optional_deps: Option<serde_json::Value>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ProviderRegistry {
    pub id: i64,
    pub provider_address: String,
    pub chain_id: i64,
    pub network: String,
    pub key: String,
    pub key_hash: String,
    pub is_registered: i64,
    pub registered_address: String,
    pub is_deleted: i64,
    pub deleted_at: Option<NaiveDateTime>,
    pub deleted_by: Option<String>,
    #[sqlx(default)]
    pub category: Option<String>,
    #[sqlx(default)]
    pub contract_name: Option<String>,
    #[sqlx(default)]
    pub last_synced_at: Option<NaiveDateTime>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}
