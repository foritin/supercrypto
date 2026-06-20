use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Subscription {
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
    pub original_end_date: Option<DateTime<Utc>>,
    pub redeemed_at: Option<DateTime<Utc>>,
    pub expected_interest: Decimal,
    pub actual_interest: Decimal,
    pub tx_hash: Option<String>,
    pub redeem_tx_hash: Option<String>,
    pub status: String,
    pub environment: String,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}
