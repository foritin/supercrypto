// Staking schemas
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct StakingStats {
    pub total_staked: Decimal,
    pub total_claimed: Decimal,
    pub active_count: i64,
    pub completed_count: i64,
}

#[derive(Debug, Serialize)]
pub struct ClaimResponse {
    pub staking_id: i32,
    pub claimed_amount: Decimal,
    pub total_claimed: Decimal,
    pub remaining_rewards: Decimal,
}
