use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct StakingRecord {
    pub id: i64,
    pub wallet_address: String,
    pub subscription_id: Option<i64>,
    pub amount: String,
    pub period: i64,
    pub multiplier: String,
    pub start_date: NaiveDateTime,
    pub end_date: NaiveDateTime,
    pub expected_rewards: String,
    pub claimed_rewards: String,
    pub status: String,
    pub stake_tx_hash: Option<String>,
    pub unstake_tx_hash: Option<String>,
    pub environment: String,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct StakingLimit {
    pub id: i64,
    pub date: String,
    pub base_limit: String,
    pub carried_limit: String,
    pub used_limit: String,
    pub environment: String,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct RewardClaim {
    pub id: i64,
    pub wallet_address: String,
    pub staking_record_id: i64,
    pub amount: String,
    pub tx_hash: Option<String>,
    pub environment: String,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}
