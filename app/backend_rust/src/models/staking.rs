use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct StakingRecord {
    pub id: i32,
    pub wallet_address: String,
    pub subscription_id: Option<i32>,
    pub amount: Decimal,
    pub period: i32,
    pub multiplier: Decimal,
    pub start_date: DateTime<Utc>,
    pub end_date: DateTime<Utc>,
    pub expected_rewards: Decimal,
    pub claimed_rewards: Decimal,
    pub status: String,
    pub stake_tx_hash: Option<String>,
    pub unstake_tx_hash: Option<String>,
    pub environment: String,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct StakingLimit {
    pub id: i32,
    pub date: NaiveDate,
    pub base_limit: Decimal,
    pub carried_limit: Decimal,
    pub used_limit: Decimal,
    pub environment: String,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct RewardClaim {
    pub id: i32,
    pub wallet_address: String,
    pub staking_record_id: i32,
    pub amount: Decimal,
    pub tx_hash: Option<String>,
    pub environment: String,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}
