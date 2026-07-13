use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct AuditLog {
    pub id: i64,
    pub action: String,
    pub category: String,
    pub resource_type: String,
    pub resource_id: Option<i64>,
    pub actor_address: Option<String>,
    pub actor_role: Option<String>,
    pub details: Option<serde_json::Value>,
    pub status: String,
    pub created_at: Option<NaiveDateTime>,
}
