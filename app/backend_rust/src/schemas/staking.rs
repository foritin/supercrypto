// Staking schemas
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct StakingStats {
    pub total_staked: String,
    pub total_claimed: String,
    pub active_count: i64,
    pub completed_count: i64,
}

#[derive(Debug, Serialize)]
pub struct ClaimResponse {
    pub staking_id: i64,
    pub claimed_amount: String,
    pub total_claimed: String,
    pub remaining_rewards: String,
}
