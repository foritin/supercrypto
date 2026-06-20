pub mod account;
pub mod asset;
pub mod subscription;
pub mod staking;
pub mod kyc;
pub mod contract;
pub mod chain;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct TimestampFields {
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}
