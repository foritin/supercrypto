// KYC schemas
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct KycListItem {
    pub id: i32,
    pub address: String,
    pub network: String,
    pub status: String,
    pub full_name: Option<String>,
    pub submitted_at: Option<DateTime<Utc>>,
    pub reviewed_at: Option<DateTime<Utc>>,
    pub risk_level: String,
    pub risk_score: i32,
    pub priority: String,
}

#[derive(Debug, Serialize)]
pub struct KycDetail {
    pub id: i32,
    pub address: String,
    pub network: String,
    pub status: String,
    pub submitted_at: Option<DateTime<Utc>>,
    pub reviewed_at: Option<DateTime<Utc>>,
    pub reviewer_address: Option<String>,
    pub reject_reason: Option<String>,
    pub full_name: Option<String>,
    pub date_of_birth: Option<NaiveDate>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub country_code: Option<String>,
    pub risk_level: String,
    pub risk_score: i32,
    pub priority: String,
    pub documents: Vec<KycDocumentItem>,
}

#[derive(Debug, Serialize)]
pub struct KycDocumentItem {
    pub id: i32,
    pub id_type: String,
    pub id_number_last4: Option<String>,
    pub document_expiry: Option<NaiveDate>,
    pub id_front_url: Option<String>,
    pub id_back_url: Option<String>,
}
