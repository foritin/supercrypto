pub mod account;
pub mod asset;
pub mod subscription;
pub mod staking;
pub mod kyc;
pub mod contract;
pub mod chain;

use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct TimestampFields {
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}
