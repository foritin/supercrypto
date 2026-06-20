use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Account {
    pub id: i32,
    pub address: String,
    pub private_key: String,
    pub roles: serde_json::Value,
    pub network: String,
    pub last_login_dt: Option<DateTime<Utc>>,
    pub encrypted_private_key: Option<String>,
    pub balance: Decimal,
    pub is_active: bool,
    pub is_blocked: bool,
    pub blocked_at: Option<DateTime<Utc>>,
    pub blocked_by: Option<String>,
    pub blocked_reason: Option<String>,
    pub is_deleted: bool,
    pub deleted_at: Option<DateTime<Utc>>,
    pub deleted_by: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct AccountCreate {
    pub address: String,
    pub private_key: String,
    pub roles: serde_json::Value,
    pub network: String,
    pub encrypted_private_key: Option<String>,
    pub balance: Decimal,
    pub is_active: bool,
}
