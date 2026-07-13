use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Account {
    pub id: i64,
    pub address: String,
    pub private_key: String,
    pub roles: serde_json::Value,
    pub network: String,
    pub last_login_dt: Option<NaiveDateTime>,
    pub encrypted_private_key: Option<String>,
    pub balance: String,
    pub is_active: i64,
    pub is_blocked: i64,
    pub blocked_at: Option<NaiveDateTime>,
    pub blocked_by: Option<String>,
    pub blocked_reason: Option<String>,
    pub is_deleted: i64,
    pub deleted_at: Option<NaiveDateTime>,
    pub deleted_by: Option<String>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct AccountCreate {
    pub address: String,
    pub private_key: String,
    pub roles: serde_json::Value,
    pub network: String,
    pub encrypted_private_key: Option<String>,
    pub balance: String,
    pub is_active: i64,
}
