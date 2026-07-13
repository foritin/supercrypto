use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct TransactionAudit {
    pub id: i64,
    pub tx_hash: String,
    pub from_address: Option<String>,
    pub to_address: Option<String>,
    pub amount: Option<String>,
    pub token_type: Option<String>,
    pub status: String,
    pub tx_type: Option<String>,
    pub block_number: Option<i64>,
    pub gas_used: Option<String>,
    pub gas_price: Option<String>,
    pub network: String,
    pub environment: String,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct RedemptionRequest {
    pub id: i64,
    pub subscription_id: i64,
    pub wallet_address: String,
    pub amount: String,
    pub status: String,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct RedemptionSignature {
    pub id: i64,
    pub redemption_id: i64,
    pub signer_address: String,
    pub signature: String,
    pub created_at: Option<NaiveDateTime>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct RedemptionEvent {
    pub id: i64,
    pub redemption_id: i64,
    pub event_type: String,
    pub tx_hash: Option<String>,
    pub block_number: Option<i64>,
    pub created_at: Option<NaiveDateTime>,
}
