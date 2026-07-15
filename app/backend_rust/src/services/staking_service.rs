use chrono::Utc;
use serde_json::Value;
use sqlx::SqlitePool;

use crate::error::AppError;
use crate::schemas::common::Pagination;

pub struct StakingService;

impl StakingService {
    /// Create a staking position
    pub async fn create(
        db: &SqlitePool,
        wallet_address: &str,
        subscription_id: Option<i64>,
        amount: &str,
        period: i64,
    ) -> Result<Value, AppError> {
        let start_date = Utc::now().naive_utc();
        let end_date = start_date + chrono::Duration::days(period);
        let multiplier = Self::get_multiplier(period);

        let r = sqlx::query!(
            "INSERT INTO staking_record (wallet_address, subscription_id, amount, period, multiplier, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'active') RETURNING id, wallet_address, subscription_id, amount, period, multiplier, start_date, end_date, expected_rewards, claimed_rewards, status, created_at",
            wallet_address, subscription_id, amount, period, multiplier, start_date, end_date
        ).fetch_one(db).await?;

        Ok(serde_json::json!({
            "id": r.id, "wallet_address": r.wallet_address,
            "subscription_id": r.subscription_id, "amount": r.amount,
            "period": r.period, "multiplier": r.multiplier,
            "start_date": r.start_date, "end_date": r.end_date,
            "expected_rewards": r.expected_rewards, "claimed_rewards": r.claimed_rewards,
            "status": r.status, "created_at": r.created_at,
        }))
    }

    /// List staking positions for a wallet
    pub async fn list_by_wallet(
        db: &SqlitePool,
        wallet_address: &str,
        page: i64,
        page_size: i64,
    ) -> Result<(Vec<Value>, Pagination), AppError> {
        let offset = (page - 1).max(0) * page_size;
        let total = sqlx::query_scalar!(
            "SELECT COUNT(*) FROM staking_record WHERE wallet_address = ?", wallet_address
        ).fetch_one(db).await.unwrap_or(0);

        let rows = sqlx::query!(
            "SELECT id, wallet_address, subscription_id, amount, period, multiplier, start_date, end_date, expected_rewards, claimed_rewards, status, created_at FROM staking_record WHERE wallet_address = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
            wallet_address, page_size, offset
        ).fetch_all(db).await?;

        let items: Vec<Value> = rows.into_iter().map(|r| serde_json::json!({
            "id": r.id, "wallet_address": r.wallet_address,
            "subscription_id": r.subscription_id, "amount": r.amount,
            "period": r.period, "multiplier": r.multiplier,
            "start_date": r.start_date, "end_date": r.end_date,
            "expected_rewards": r.expected_rewards, "claimed_rewards": r.claimed_rewards,
            "status": r.status, "created_at": r.created_at,
        })).collect();

        Ok((items, Pagination::new(total, page, page_size)))
    }

    /// Get staking position by id
    pub async fn get_by_id(db: &SqlitePool, id: i64) -> Result<Value, AppError> {
        let r = sqlx::query!(
            "SELECT id, wallet_address, subscription_id, amount, period, multiplier, start_date, end_date, expected_rewards, claimed_rewards, status, created_at FROM staking_record WHERE id = ?",
            id
        ).fetch_optional(db).await?
        .ok_or_else(|| AppError::NotFound(format!("staking {} not found", id)))?;

        Ok(serde_json::json!({
            "id": r.id, "wallet_address": r.wallet_address,
            "subscription_id": r.subscription_id, "amount": r.amount,
            "period": r.period, "multiplier": r.multiplier,
            "start_date": r.start_date, "end_date": r.end_date,
            "expected_rewards": r.expected_rewards, "claimed_rewards": r.claimed_rewards,
            "status": r.status, "created_at": r.created_at,
        }))
    }

    /// Unstake
    pub async fn unstake(db: &SqlitePool, id: i64) -> Result<Value, AppError> {
        sqlx::query!(
            "UPDATE staking_record SET status = 'unstaked', updated_at = CURRENT_TIMESTAMP WHERE id = ?", id
        ).execute(db).await?;
        Self::get_by_id(db, id).await
    }

    /// Claim rewards
    pub async fn claim_rewards(db: &SqlitePool, id: i64) -> Result<Value, AppError> {
        let r = sqlx::query!(
            "SELECT id, expected_rewards, claimed_rewards FROM staking_record WHERE id = ?", id
        ).fetch_optional(db).await?
        .ok_or_else(|| AppError::NotFound(format!("staking {} not found", id)))?;

        let expected: f64 = r.expected_rewards.parse().unwrap_or(0.0);
        let claimed: f64 = r.claimed_rewards.parse().unwrap_or(0.0);
        let remaining = (expected - claimed).max(0.0);

        let expected_str = expected.to_string();
        sqlx::query!(
            "UPDATE staking_record SET claimed_rewards = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            expected_str, id
        ).execute(db).await?;

        Ok(serde_json::json!({
            "staking_id": id,
            "claimed_amount": remaining.to_string(),
            "total_claimed": expected.to_string(),
            "remaining_rewards": "0.0",
        }))
    }

    /// Get staking stats for a wallet
    pub async fn stats(db: &SqlitePool, wallet_address: &str) -> Result<Value, AppError> {
        let total_staked = sqlx::query_scalar!(
            "SELECT COALESCE(SUM(CAST(amount AS REAL)), 0.0) FROM staking_record WHERE wallet_address = ?",
            wallet_address
        ).fetch_one(db).await.unwrap_or(0.0);

        let total_claimed = sqlx::query_scalar!(
            "SELECT COALESCE(SUM(CAST(claimed_rewards AS REAL)), 0.0) FROM staking_record WHERE wallet_address = ?",
            wallet_address
        ).fetch_one(db).await.unwrap_or(0.0);

        let active_count = sqlx::query_scalar!(
            "SELECT COUNT(*) FROM staking_record WHERE wallet_address = ? AND status = 'active'",
            wallet_address
        ).fetch_one(db).await.unwrap_or(0);

        let completed_count = sqlx::query_scalar!(
            "SELECT COUNT(*) FROM staking_record WHERE wallet_address = ? AND status IN ('unstaked','completed')",
            wallet_address
        ).fetch_one(db).await.unwrap_or(0);

        Ok(serde_json::json!({
            "total_staked": total_staked.to_string(),
            "total_claimed": total_claimed.to_string(),
            "active_count": active_count,
            "completed_count": completed_count,
        }))
    }

    /// Preview staking rewards
    pub async fn preview(amount: &str, period: i64) -> Result<Value, AppError> {
        let multiplier = Self::get_multiplier(period);
        let amount_f: f64 = amount.parse().unwrap_or(0.0);
        let expected = amount_f * multiplier;
        Ok(serde_json::json!({
            "amount": amount,
            "period": period,
            "multiplier": multiplier.to_string(),
            "expected_rewards": expected.to_string(),
        }))
    }

    fn get_multiplier(period: i64) -> f64 {
        match period {
            30 => 0.05,
            90 => 0.18,
            180 => 0.40,
            365 => 0.85,
            _ => 0.05,
        }
    }
}
