use serde_json::Value;
use sqlx::SqlitePool;

use crate::error::AppError;
use crate::schemas::common::Pagination;

/// Row type for query_as to avoid sqlx macro type mismatch in if/else
#[derive(Debug, sqlx::FromRow)]
struct AssetRow {
    id: i64,
    name: String,
    symbol: String,
    description: Option<String>,
    asset_type: String,
    image_url: Option<String>,
    location: Option<String>,
    current_price: String,
    total_supply: String,
    subscribed_amount: String,
    min_subscription: String,
    apy_3m: String,
    apy_6m: String,
    apy_12m: String,
    subscription_mode: String,
    status: String,
    environment: String,
    created_at: Option<chrono::NaiveDateTime>,
    updated_at: Option<chrono::NaiveDateTime>,
}

pub struct AssetService;

impl AssetService {
    /// List assets with pagination and optional status filter
    pub async fn list(
        db: &SqlitePool,
        page: i64,
        page_size: i64,
        status: Option<&str>,
    ) -> Result<(Vec<Value>, Pagination), AppError> {
        let offset = (page - 1).max(0) * page_size;

        // Build base queries to avoid sqlx macro type mismatch in if/else
        let (total, rows) = if let Some(st) = status {
            let total = sqlx::query_scalar!(
                "SELECT COUNT(*) FROM asset WHERE status = ?", st
            ).fetch_one(db).await.unwrap_or(0);
            let rows = sqlx::query_as::<_, AssetRow>(
                "SELECT id, name, symbol, description, asset_type, image_url, location, current_price, total_supply, subscribed_amount, min_subscription, apy_3m, apy_6m, apy_12m, subscription_mode, status, environment, created_at, updated_at FROM asset WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
            ).bind(st).bind(page_size).bind(offset).fetch_all(db).await?;
            (total, rows)
        } else {
            let total = sqlx::query_scalar!("SELECT COUNT(*) FROM asset")
                .fetch_one(db).await.unwrap_or(0);
            let rows = sqlx::query_as::<_, AssetRow>(
                "SELECT id, name, symbol, description, asset_type, image_url, location, current_price, total_supply, subscribed_amount, min_subscription, apy_3m, apy_6m, apy_12m, subscription_mode, status, environment, created_at, updated_at FROM asset ORDER BY created_at DESC LIMIT ? OFFSET ?"
            ).bind(page_size).bind(offset).fetch_all(db).await?;
            (total, rows)
        };

        let items: Vec<Value> = rows.into_iter().map(|r| {
            serde_json::json!({
                "id": r.id,
                "name": r.name,
                "symbol": r.symbol,
                "description": r.description,
                "asset_type": r.asset_type,
                "image_url": r.image_url,
                "location": r.location,
                "current_price": r.current_price,
                "total_supply": r.total_supply,
                "subscribed_amount": r.subscribed_amount,
                "min_subscription": r.min_subscription,
                "apy_3m": r.apy_3m,
                "apy_6m": r.apy_6m,
                "apy_12m": r.apy_12m,
                "subscription_mode": r.subscription_mode,
                "status": r.status,
                "environment": r.environment,
                "created_at": r.created_at,
                "updated_at": r.updated_at,
            })
        }).collect();

        Ok((items, Pagination::new(total, page, page_size)))
    }

    /// Get asset by id
    pub async fn get_by_id(db: &SqlitePool, id: i64) -> Result<Value, AppError> {
        let r = sqlx::query!(
            "SELECT id, name, symbol, description, asset_type, image_url, document_url, location, current_price, price_updated_at, total_supply, subscribed_amount, min_subscription, apy_3m, apy_6m, apy_12m, subscription_mode, subscription_start_at, subscription_end_at, status, environment, project, frame_style, created_at, updated_at FROM asset WHERE id = ?",
            id
        ).fetch_optional(db).await?
        .ok_or_else(|| AppError::NotFound(format!("asset {} not found", id)))?;

        Ok(serde_json::json!({
            "id": r.id,
            "name": r.name,
            "symbol": r.symbol,
            "description": r.description,
            "asset_type": r.asset_type,
            "image_url": r.image_url,
            "document_url": r.document_url,
            "location": r.location,
            "current_price": r.current_price,
            "price_updated_at": r.price_updated_at,
            "total_supply": r.total_supply,
            "subscribed_amount": r.subscribed_amount,
            "min_subscription": r.min_subscription,
            "apy_3m": r.apy_3m,
            "apy_6m": r.apy_6m,
            "apy_12m": r.apy_12m,
            "subscription_mode": r.subscription_mode,
            "subscription_start_at": r.subscription_start_at,
            "subscription_end_at": r.subscription_end_at,
            "status": r.status,
            "environment": r.environment,
            "project": r.project,
            "frame_style": r.frame_style,
            "created_at": r.created_at,
            "updated_at": r.updated_at,
        }))
    }

    /// Create a new asset
    pub async fn create(
        db: &SqlitePool,
        name: &str,
        symbol: &str,
        description: Option<&str>,
        asset_type: &str,
        image_url: Option<&str>,
        document_url: Option<&str>,
        location: Option<&str>,
        total_supply: &str,
        min_subscription: &str,
        apy_3m: &str,
        apy_6m: &str,
        apy_12m: &str,
        subscription_mode: &str,
        project: Option<&str>,
        frame_style: Option<&str>,
    ) -> Result<Value, AppError> {
        let r = sqlx::query!(
            "INSERT INTO asset (name, symbol, description, asset_type, image_url, document_url, location, total_supply, min_subscription, apy_3m, apy_6m, apy_12m, subscription_mode, project, frame_style) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id, name, symbol, asset_type, status, created_at",
            name, symbol, description, asset_type, image_url, document_url, location, total_supply, min_subscription, apy_3m, apy_6m, apy_12m, subscription_mode, project, frame_style
        ).fetch_one(db).await?;

        Ok(serde_json::json!({
            "id": r.id,
            "name": r.name,
            "symbol": r.symbol,
            "asset_type": r.asset_type,
            "status": r.status,
            "created_at": r.created_at,
        }))
    }

    /// Update asset
    pub async fn update(
        db: &SqlitePool,
        id: i64,
        name: Option<&str>,
        symbol: Option<&str>,
        description: Option<&str>,
        current_price: Option<&str>,
        status: Option<&str>,
    ) -> Result<Value, AppError> {
        sqlx::query!(
            "UPDATE asset SET name = COALESCE(?, name), symbol = COALESCE(?, symbol), description = COALESCE(?, description), current_price = COALESCE(?, current_price), status = COALESCE(?, status), updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            name, symbol, description, current_price, status, id
        ).execute(db).await?;
        Self::get_by_id(db, id).await
    }

    /// Update asset price
    pub async fn update_price(db: &SqlitePool, id: i64, price: &str, _source: Option<&str>) -> Result<Value, AppError> {
        sqlx::query!(
            "UPDATE asset SET current_price = ?, price_updated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            price, id
        ).execute(db).await?;
        Self::get_by_id(db, id).await
    }

    /// Update asset status
    pub async fn update_status(db: &SqlitePool, id: i64, status: &str) -> Result<Value, AppError> {
        sqlx::query!("UPDATE asset SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", status, id)
            .execute(db).await?;
        Self::get_by_id(db, id).await
    }
}
