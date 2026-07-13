use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct MediaFile {
    pub id: i64,
    pub owner_address: String,
    pub file_name: String,
    pub storage_path: String,
    pub file_size: Option<i64>,
    pub mime_type: Option<String>,
    pub created_at: Option<NaiveDateTime>,
}
