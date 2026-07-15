use serde_json::Value;
use sqlx::SqlitePool;

use crate::error::AppError;
use crate::schemas::common::Pagination;

pub struct TransactionService;

impl TransactionService {
    /// Create a transaction audit record
    pub async fn create_audit(
        db: &SqlitePool,
        tx_hash: &str,
        from_address: Option<&str>,
        to_address: Option<&str>,
        amount: Option<&str>,
        _token_type: Option<&str>,
        tx_type: Option<&str>,
    ) -> Result<Value, AppError> {
        let r = sqlx::query!(
            "INSERT INTO transaction_audit (tx_hash, tx_type, from_address, to_address, amount, status) VALUES (?, ?, ?, ?, ?, 'pending') RETURNING id, tx_hash, tx_type, from_address, to_address, amount, status, created_at",
            tx_hash, tx_type, from_address, to_address, amount
        ).fetch_one(db).await?;

        Ok(serde_json::json!({
            "id": r.id, "tx_hash": r.tx_hash, "tx_type": r.tx_type,
            "from_address": r.from_address, "to_address": r.to_address,
            "amount": r.amount, "status": r.status, "created_at": r.created_at,
        }))
    }

    /// List transactions with pagination and optional filters
    pub async fn list(
        db: &SqlitePool,
        page: i64,
        page_size: i64,
        status: Option<&str>,
        tx_type: Option<&str>,
    ) -> Result<(Vec<Value>, Pagination), AppError> {
        let offset = (page - 1).max(0) * page_size;
        let _base_query = "FROM transaction_audit WHERE 1=1";
        let _conditions = String::new();
        let mut params: Vec<String> = Vec::new();

        if let Some(s) = status {
            params.push(format!("'{}'", s));
        }
        if let Some(t) = tx_type {
            params.push(format!("'{}'", t));
        }

        let rows = sqlx::query!(
            "SELECT id, tx_hash, tx_type, from_address, to_address, amount, status, created_at FROM transaction_audit ORDER BY created_at DESC LIMIT ? OFFSET ?",
            page_size, offset
        ).fetch_all(db).await?;

        let total = sqlx::query_scalar!("SELECT COUNT(*) FROM transaction_audit")
            .fetch_one(db).await.unwrap_or(0);

        let items: Vec<Value> = rows.into_iter().map(|r| serde_json::json!({
            "id": r.id, "tx_hash": r.tx_hash, "tx_type": r.tx_type,
            "from_address": r.from_address, "to_address": r.to_address,
            "value": r.amount, "amount": r.amount, "status": r.status,
            "created_at": r.created_at,
        })).collect();

        Ok((items, Pagination::new(total, page, page_size)))
    }

    /// Get transaction by id
    pub async fn get_by_id(db: &SqlitePool, id: i64) -> Result<Value, AppError> {
        let r = sqlx::query!(
            "SELECT id, tx_hash, tx_type, from_address, to_address, amount, status, created_at FROM transaction_audit WHERE id = ?",
            id
        ).fetch_optional(db).await?
        .ok_or_else(|| AppError::NotFound(format!("transaction {} not found", id)))?;

        Ok(serde_json::json!({
            "id": r.id, "tx_hash": r.tx_hash, "tx_type": r.tx_type,
            "from_address": r.from_address, "to_address": r.to_address,
            "amount": r.amount, "status": r.status, "created_at": r.created_at,
        }))
    }

    /// Get transaction by hash
    pub async fn get_by_hash(db: &SqlitePool, tx_hash: &str) -> Result<Value, AppError> {
        let r = sqlx::query!(
            "SELECT id, tx_hash, tx_type, from_address, to_address, amount, status, created_at FROM transaction_audit WHERE tx_hash = ?",
            tx_hash
        ).fetch_optional(db).await?
        .ok_or_else(|| AppError::NotFound(format!("transaction {} not found", tx_hash)))?;

        Ok(serde_json::json!({
            "id": r.id, "tx_hash": r.tx_hash, "tx_type": r.tx_type,
            "from_address": r.from_address, "to_address": r.to_address,
            "amount": r.amount, "status": r.status, "created_at": r.created_at,
        }))
    }

    /// Update transaction status
    pub async fn update_status(db: &SqlitePool, id: i64, status: &str) -> Result<Value, AppError> {
        sqlx::query!(
            "UPDATE transaction_audit SET status = ? WHERE id = ?", status, id
        ).execute(db).await?;
        Self::get_by_id(db, id).await
    }

    /// Get transaction stats
    pub async fn stats(db: &SqlitePool) -> Result<Value, AppError> {
        let total = sqlx::query_scalar!("SELECT COUNT(*) FROM transaction_audit")
            .fetch_one(db).await.unwrap_or(0);
        let pending = sqlx::query_scalar!("SELECT COUNT(*) FROM transaction_audit WHERE status = 'pending'")
            .fetch_one(db).await.unwrap_or(0);
        let completed = sqlx::query_scalar!("SELECT COUNT(*) FROM transaction_audit WHERE status = 'completed'")
            .fetch_one(db).await.unwrap_or(0);
        let failed = sqlx::query_scalar!("SELECT COUNT(*) FROM transaction_audit WHERE status = 'failed'")
            .fetch_one(db).await.unwrap_or(0);

        Ok(serde_json::json!({
            "total": total,
            "pending": pending,
            "completed": completed,
            "failed": failed,
        }))
    }

    /// Pending transactions
    pub async fn pending(
        db: &SqlitePool,
        page: i64,
        page_size: i64,
    ) -> Result<(Vec<Value>, Pagination), AppError> {
        let offset = (page - 1).max(0) * page_size;
        let total = sqlx::query_scalar!("SELECT COUNT(*) FROM transaction_audit WHERE status = 'pending'")
            .fetch_one(db).await.unwrap_or(0);

        let rows = sqlx::query!(
            "SELECT id, tx_hash, tx_type, from_address, to_address, amount, status, created_at FROM transaction_audit WHERE status = 'pending' ORDER BY created_at DESC LIMIT ? OFFSET ?",
            page_size, offset
        ).fetch_all(db).await?;

        let items: Vec<Value> = rows.into_iter().map(|r| serde_json::json!({
            "id": r.id, "tx_hash": r.tx_hash, "tx_type": r.tx_type,
            "from_address": r.from_address, "to_address": r.to_address,
            "value": r.amount, "status": r.status, "created_at": r.created_at,
        })).collect();

        Ok((items, Pagination::new(total, page, page_size)))
    }

    /// Record user transaction audit
    pub async fn record_user_tx(
        db: &SqlitePool,
        wallet_address: &str,
        tx_hash: &str,
        tx_type: Option<&str>,
        amount: Option<&str>,
    ) -> Result<Value, AppError> {
        Self::create_audit(db, tx_hash, Some(wallet_address), None, amount, None, tx_type).await
    }

    /// List user's own transactions
    pub async fn list_user_txs(
        db: &SqlitePool,
        wallet_address: &str,
        page: i64,
        page_size: i64,
    ) -> Result<(Vec<Value>, Pagination), AppError> {
        let offset = (page - 1).max(0) * page_size;
        let total = sqlx::query_scalar!(
            "SELECT COUNT(*) FROM transaction_audit WHERE from_address = ? OR to_address = ?",
            wallet_address, wallet_address
        ).fetch_one(db).await.unwrap_or(0);

        let rows = sqlx::query!(
            "SELECT id, tx_hash, tx_type, from_address, to_address, amount, status, created_at FROM transaction_audit WHERE from_address = ? OR to_address = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
            wallet_address, wallet_address, page_size, offset
        ).fetch_all(db).await?;

        let items: Vec<Value> = rows.into_iter().map(|r| serde_json::json!({
            "id": r.id, "tx_hash": r.tx_hash, "tx_type": r.tx_type,
            "from_address": r.from_address, "to_address": r.to_address,
            "amount": r.amount, "status": r.status, "created_at": r.created_at,
        })).collect();

        Ok((items, Pagination::new(total, page, page_size)))
    }

    /// Update user tx status
    pub async fn update_user_tx_status(db: &SqlitePool, tx_hash: &str, status: &str) -> Result<Value, AppError> {
        sqlx::query!(
            "UPDATE transaction_audit SET status = ? WHERE tx_hash = ?", status, tx_hash
        ).execute(db).await?;
        Self::get_by_hash(db, tx_hash).await
    }
}
