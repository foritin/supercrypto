use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Asset {
    pub id: i32,
    pub name: String,
    pub symbol: String,
    pub description: Option<String>,
    pub asset_type: String,
    pub image_url: Option<String>,
    pub document_url: Option<String>,
    pub location: Option<String>,
    pub current_price: Decimal,
    pub price_updated_at: Option<DateTime<Utc>>,
    pub total_supply: Decimal,
    pub subscribed_amount: Decimal,
    pub min_subscription: Decimal,
    pub subscription_start_at: Option<DateTime<Utc>>,
    pub subscription_end_at: Option<DateTime<Utc>>,
    pub apy_3m: Decimal,
    pub apy_6m: Decimal,
    pub apy_12m: Decimal,
    pub subscription_mode: String,
    pub project: Option<String>,
    pub contract_address: Option<String>,
    pub frame_style: Option<String>,
    pub status: String,
    pub environment: String,
    pub created_by: Option<i32>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct AssetContractBinding {
    pub id: i32,
    pub asset_id: i32,
    pub contract_name: String,
    pub contract_address: String,
    pub contract_type: String,
    pub is_primary: bool,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct AssetPriceHistory {
    pub id: i32,
    pub asset_id: Option<i32>,
    pub price: Decimal,
    pub source: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}
