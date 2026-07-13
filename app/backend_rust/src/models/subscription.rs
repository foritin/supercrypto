use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Subscription {
    pub id: i64,
    pub wallet_address: String,
    pub asset_id: i64,
    pub amount: String,
    pub token_type: String,
    pub lock_period: i64,
    pub apy: String,
    pub rwa_token_amount: String,
    pub start_date: Option<NaiveDateTime>,
    pub end_date: Option<NaiveDateTime>,
    pub original_end_date: Option<NaiveDateTime>,
    pub redeemed_at: Option<NaiveDateTime>,
    pub expected_interest: String,
    pub actual_interest: String,
    pub tx_hash: Option<String>,
    pub redeem_tx_hash: Option<String>,
    pub status: String,
    pub environment: String,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}
