// KYC schemas
use chrono::NaiveDateTime;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct KycListItem {
    pub id: i64,
    pub address: Option<String>,
    pub network: Option<String>,
    pub status: Option<String>,
    pub full_name: Option<String>,
    pub submitted_at: Option<NaiveDateTime>,
    pub reviewed_at: Option<NaiveDateTime>,
    pub risk_level: Option<String>,
    pub risk_score: Option<i64>,
    pub priority: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct KycDetail {
    pub id: i64,
    pub address: Option<String>,
    pub network: Option<String>,
    pub status: Option<String>,
    pub submitted_at: Option<NaiveDateTime>,
    pub reviewed_at: Option<NaiveDateTime>,
    pub reviewer_address: Option<String>,
    pub reject_reason: Option<String>,
    pub full_name: Option<String>,
    pub date_of_birth: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub country_code: Option<String>,
    pub risk_level: Option<String>,
    pub risk_score: Option<i64>,
    pub priority: Option<String>,
    pub documents: Vec<KycDocumentItem>,
}

#[derive(Debug, Serialize)]
pub struct KycDocumentItem {
    pub id: i64,
    pub id_type: Option<String>,
    pub id_number_last4: Option<String>,
    pub document_expiry: Option<String>,
    pub id_front_url: Option<String>,
    pub id_back_url: Option<String>,
}
