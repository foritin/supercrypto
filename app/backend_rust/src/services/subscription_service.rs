use chrono::Utc;
use serde_json::Value;
use sqlx::SqlitePool;

use crate::error::AppError;
use crate::schemas::common::Pagination;

pub struct SubscriptionService;

impl SubscriptionService {
    /// Create a subscription
    pub async fn create(
        db: &SqlitePool,
        wallet_address: &str,
        asset_id: i64,
        amount: &str,
        token_type: &str,
        lock_period: i64,
    ) -> Result<Value, AppError> {
        let start_date = Utc::now().naive_utc();
        let end_date = start_date + chrono::Duration::days(lock_period);
        let apy = Self::get_apy(lock_period);

        let r = sqlx::query!(
            "INSERT INTO subscription (wallet_address, asset_id, amount, token_type, lock_period, apy, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active') RETURNING id, wallet_address, asset_id, amount, token_type, lock_period, apy, rwa_token_amount, start_date, end_date, expected_interest, actual_interest, tx_hash, status, created_at",
            wallet_address, asset_id, amount, token_type, lock_period, apy, start_date, end_date
        ).fetch_one(db).await?;

        Ok(serde_json::json!({
            "id": r.id, "wallet_address": r.wallet_address,
            "asset_id": r.asset_id, "amount": r.amount,
            "token_type": r.token_type, "lock_period": r.lock_period,
            "apy": r.apy, "rwa_token_amount": r.rwa_token_amount,
            "start_date": r.start_date, "end_date": r.end_date,
            "expected_interest": r.expected_interest,
            "actual_interest": r.actual_interest,
            "tx_hash": r.tx_hash, "status": r.status,
            "created_at": r.created_at,
        }))
    }

    /// List subscriptions for a wallet
    pub async fn list_by_wallet(
        db: &SqlitePool,
        wallet_address: &str,
        page: i64,
        page_size: i64,
    ) -> Result<(Vec<Value>, Pagination), AppError> {
        let offset = (page - 1).max(0) * page_size;
        let total = sqlx::query_scalar!(
            "SELECT COUNT(*) FROM subscription WHERE wallet_address = ?", wallet_address
        ).fetch_one(db).await.unwrap_or(0);

        let rows = sqlx::query!(
            "SELECT id, wallet_address, asset_id, amount, token_type, lock_period, apy, rwa_token_amount, start_date, end_date, expected_interest, actual_interest, tx_hash, status, created_at FROM subscription WHERE wallet_address = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
            wallet_address, page_size, offset
        ).fetch_all(db).await?;

        let items: Vec<Value> = rows.into_iter().map(|r| serde_json::json!({
            "id": r.id, "wallet_address": r.wallet_address,
            "asset_id": r.asset_id, "amount": r.amount,
            "token_type": r.token_type, "lock_period": r.lock_period,
            "apy": r.apy, "rwa_token_amount": r.rwa_token_amount,
            "start_date": r.start_date, "end_date": r.end_date,
            "expected_interest": r.expected_interest,
            "actual_interest": r.actual_interest,
            "tx_hash": r.tx_hash, "status": r.status,
            "created_at": r.created_at,
        })).collect();

        Ok((items, Pagination::new(total, page, page_size)))
    }

    /// Get subscription by id
    pub async fn get_by_id(db: &SqlitePool, id: i64) -> Result<Value, AppError> {
        let r = sqlx::query!(
            "SELECT id, wallet_address, asset_id, amount, token_type, lock_period, apy, rwa_token_amount, start_date, end_date, expected_interest, actual_interest, tx_hash, status, created_at FROM subscription WHERE id = ?",
            id
        ).fetch_optional(db).await?
        .ok_or_else(|| AppError::NotFound(format!("subscription {} not found", id)))?;

        Ok(serde_json::json!({
            "id": r.id, "wallet_address": r.wallet_address,
            "asset_id": r.asset_id, "amount": r.amount,
            "token_type": r.token_type, "lock_period": r.lock_period,
            "apy": r.apy, "rwa_token_amount": r.rwa_token_amount,
            "start_date": r.start_date, "end_date": r.end_date,
            "expected_interest": r.expected_interest,
            "actual_interest": r.actual_interest,
            "tx_hash": r.tx_hash, "status": r.status,
            "created_at": r.created_at,
        }))
    }

    /// Create pending subscription
    pub async fn create_pending(
        db: &SqlitePool,
        wallet_address: &str,
        asset_id: i64,
        amount: &str,
        token_type: &str,
        lock_period: i64,
    ) -> Result<Value, AppError> {
        let apy = Self::get_apy(lock_period);
        let r = sqlx::query!(
            "INSERT INTO subscription (wallet_address, asset_id, amount, token_type, lock_period, apy, status) VALUES (?, ?, ?, ?, ?, ?, 'pending') RETURNING id, status, created_at",
            wallet_address, asset_id, amount, token_type, lock_period, apy
        ).fetch_one(db).await?;

        Ok(serde_json::json!({
            "id": r.id, "status": r.status, "created_at": r.created_at,
        }))
    }

    /// Confirm subscription with tx hash
    pub async fn confirm(db: &SqlitePool, subscription_id: i64, tx_hash: &str) -> Result<Value, AppError> {
        sqlx::query!(
            "UPDATE subscription SET status = 'active', tx_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            tx_hash, subscription_id
        ).execute(db).await?;
        Self::get_by_id(db, subscription_id).await
    }

    /// Redeem subscription
    pub async fn redeem(db: &SqlitePool, id: i64) -> Result<Value, AppError> {
        sqlx::query!(
            "UPDATE subscription SET status = 'redeemed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", id
        ).execute(db).await?;

        let r = sqlx::query!(
            "INSERT INTO redemption_request (subscription_id, status) VALUES (?, 'pending') RETURNING id, status, created_at",
            id
        ).fetch_one(db).await?;

        Ok(serde_json::json!({
            "subscription_id": id,
            "redemption_id": r.id,
            "status": r.status,
            "created_at": r.created_at,
        }))
    }

    /// Preview subscription returns
    pub fn preview(asset_id: i64, amount: &str, token_type: &str, lock_period: i64) -> Value {
        let apy = Self::get_apy(lock_period);
        let amount_f: f64 = amount.parse().unwrap_or(0.0);
        let expected_interest = amount_f * apy;
        let start_date = Utc::now().naive_utc();
        let end_date = start_date + chrono::Duration::days(lock_period);

        serde_json::json!({
            "asset_id": asset_id,
            "amount": amount,
            "token_type": token_type,
            "lock_period": lock_period,
            "apy": apy.to_string(),
            "expected_interest": expected_interest.to_string(),
            "total_return": (amount_f + expected_interest).to_string(),
            "start_date": start_date,
            "end_date": end_date,
        })
    }

    /// Get subscription stats for a wallet
    pub async fn subscription_stats(db: &SqlitePool, wallet_address: &str) -> Result<Value, AppError> {
        let total = sqlx::query_scalar!(
            "SELECT COUNT(*) FROM subscription WHERE wallet_address = ?", wallet_address
        ).fetch_one(db).await.unwrap_or(0);

        let active = sqlx::query_scalar!(
            "SELECT COUNT(*) FROM subscription WHERE wallet_address = ? AND status = 'active'", wallet_address
        ).fetch_one(db).await.unwrap_or(0);

        let total_amount = sqlx::query_scalar!(
            "SELECT COALESCE(SUM(CAST(amount AS REAL)), 0.0) FROM subscription WHERE wallet_address = ?", wallet_address
        ).fetch_one(db).await.unwrap_or(0.0);

        Ok(serde_json::json!({
            "total": total,
            "active": active,
            "total_amount": total_amount.to_string(),
        }))
    }

    fn get_apy(lock_period: i64) -> f64 {
        match lock_period {
            90 => 0.06,
            180 => 0.12,
            365 => 0.20,
            _ => 0.04,
        }
    }
}
