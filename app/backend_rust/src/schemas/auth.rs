use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// 登录请求
#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub address: String,
    pub signature: String,
    pub expires_in_mins: Option<i64>,
}

/// 登录响应
#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: String,
    pub expires_in_mins: i64,
}

/// Token 刷新请求
#[derive(Debug, Deserialize)]
pub struct RefreshRequest {
    pub refresh_token: String,
}

/// 当前用户信息
#[derive(Debug, Serialize, FromRow)]
pub struct UserInfo {
    pub id: i32,
    pub address: String,
    pub roles: serde_json::Value,
    pub network: String,
    pub last_login_dt: Option<DateTime<Utc>>,
    pub is_active: bool,
    pub is_blocked: bool,
    pub balance: Decimal,
}
