use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Asset {
    pub id: i64,
    pub name: String,
    pub symbol: String,
    pub description: Option<String>,
    pub asset_type: String,
    pub image_url: Option<String>,
    pub document_url: Option<String>,
    pub location: Option<String>,
    pub current_price: String,
    pub price_updated_at: Option<NaiveDateTime>,
    pub total_supply: String,
    pub subscribed_amount: String,
    pub min_subscription: String,
    pub subscription_start_at: Option<NaiveDateTime>,
    pub subscription_end_at: Option<NaiveDateTime>,
    pub apy_3m: String,
    pub apy_6m: String,
    pub apy_12m: String,
    pub subscription_mode: String,
    pub project: Option<String>,
    pub contract_address: Option<String>,
    pub frame_style: Option<String>,
    pub status: String,
    pub environment: String,
    pub created_by: Option<i64>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct AssetContractBinding {
    pub id: i64,
    pub asset_id: i64,
    pub contract_name: String,
    pub contract_address: String,
    pub contract_type: String,
    pub is_primary: i64,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct AssetPriceHistory {
    pub id: i64,
    pub asset_id: Option<i64>,
    pub price: String,
    pub source: Option<String>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

/// 资产媒体表 (aligned with Python backend AssetMedia model)
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct AssetMedia {
    pub id: i64,
    pub asset_id: i64,
    pub media_type: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub url: String,
    pub thumbnail_url: Option<String>,
    pub file_name: Option<String>,
    pub file_size: Option<i64>,
    pub mime_type: Option<String>,
    pub sort_order: i64,
    pub is_primary: bool,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

/// 资产特征表 (aligned with Python backend AssetFeatures model - fixed schema, OneToOne)
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct AssetFeatures {
    pub id: i64,
    pub asset_id: i64,
    pub bedrooms: Option<i64>,
    pub bathrooms: Option<String>,
    pub sqft: Option<i64>,
    pub sqm: Option<i64>,
    pub lot_size: Option<i64>,
    pub year_built: Option<i64>,
    pub year_renovated: Option<i64>,
    pub property_type: Option<String>,
    pub stories: Option<i64>,
    pub rental_status: Option<String>,
    pub monthly_rent: Option<String>,
    pub lease_end_date: Option<String>,
    pub amenities: Option<serde_json::Value>,
    pub neighborhood: Option<serde_json::Value>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}
