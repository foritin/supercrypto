// Subscription schemas
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct PendingSubscriptionRequest {
    pub asset_id: i32,
    pub amount: Decimal,
    pub token_type: String,
    pub lock_period: i32,
}

#[derive(Debug, Deserialize)]
pub struct ConfirmSubscriptionRequest {
    pub tx_hash: String,
}

#[derive(Debug, Serialize)]
pub struct SubscriptionReceipt {
    pub tx_hash: String,
    pub status: String,
    pub block_number: Option<i64>,
    pub gas_used: Option<Decimal>,
}
