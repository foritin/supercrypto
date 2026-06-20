use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ContractDeployment {
    pub id: i32,
    pub name: String,
    pub address: String,
    pub deployer_address: String,
    pub network: String,
    pub chain_id: i32,
    pub scope: String,
    pub contract_type: String,
    pub project_name: String,
    pub tx_hash: String,
    pub status: String,
    pub abi_path: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ContractConfig {
    pub id: i32,
    pub contract_name: String,
    pub project_name: String,
    pub provider_key: Option<String>,
    pub provider_key_hash: Option<String>,
    pub dependencies: Option<serde_json::Value>,
    pub contract_type: String,
    pub scope: String,
    pub description: Option<String>,
    pub dependency_type: String,
    pub is_primary: bool,
    pub deploy_order: Option<i32>,
    pub required_deps: Option<serde_json::Value>,
    pub optional_deps: Option<serde_json::Value>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ProviderRegistry {
    pub id: i32,
    pub provider_address: String,
    pub chain_id: i32,
    pub network: String,
    pub key: String,
    pub key_hash: String,
    pub is_registered: bool,
    pub registered_address: String,
    pub is_deleted: bool,
    pub deleted_at: Option<DateTime<Utc>>,
    pub deleted_by: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}
