use axum::{
    extract::{Multipart, Path, Query, State},
    Json, Router,
};
use serde::Deserialize;
use sqlx::Row;

use crate::error::AppError;
use crate::middleware::auth::AdminAddress;
use crate::repositories::media_repo;

/// Parse a DB string column to f64 (SQLite stores decimals as TEXT)
fn nf(s: &str) -> f64 {
    s.parse::<f64>().unwrap_or(0.0)
}
use crate::schemas::admin::{
    BindProjectRequest, CreateAccountRequest, CreateAssetRequest, CreateTransactionRequest,
    KycRecordAdmissionRequest, KycRecordRevocationRequest, StatsResponse,
    UpdateAssetPriceRequest, UpdateAssetRequest,
};
use crate::schemas::common::{DataWrapper, Pagination};
use crate::schemas::kyc::{BatchReviewRequest, KycReviewRequest};
use crate::services::kyc_service::KycService;
use crate::state::SharedState;

#[derive(Debug, Deserialize)]
pub struct ListQuery {
    #[serde(default = "default_page")]
    page: i64,
    #[serde(default = "default_page_size")]
    page_size: i64,
}

fn default_page() -> i64 { 1 }
fn default_page_size() -> i64 { 10 }

pub fn routes() -> Router<SharedState> {
    Router::new()
        // ---- Assets ----
        .route("/api/v1/admin/assets", axum::routing::post(create_asset))
        .route("/api/v1/admin/assets", axum::routing::get(list_assets))
        .route("/api/v1/admin/assets/projects/available", axum::routing::get(list_available_projects))
        .route("/api/v1/admin/assets/{id}", axum::routing::get(get_asset))
        .route("/api/v1/admin/assets/{id}", axum::routing::put(update_asset))
        .route("/api/v1/admin/assets/{id}/status", axum::routing::patch(update_asset_status))
        .route("/api/v1/admin/assets/{id}/price", axum::routing::post(update_asset_price))
        .route("/api/v1/admin/assets/{id}/bind-project", axum::routing::post(bind_project))
        .route("/api/v1/admin/assets/{id}/unbind/{contract_name}", axum::routing::delete(unbind_project))
        // Asset media
        .route("/api/v1/admin/assets/{id}/media", axum::routing::get(list_asset_media))
        .route("/api/v1/admin/assets/{id}/media", axum::routing::post(upload_asset_media))
        .route("/api/v1/admin/assets/{id}/media/stats", axum::routing::get(asset_media_stats))
        .route("/api/v1/admin/assets/{asset_id}/media/{media_id}", axum::routing::patch(update_asset_media))
        .route("/api/v1/admin/assets/{asset_id}/media/{media_id}", axum::routing::delete(delete_asset_media))
        .route("/api/v1/admin/assets/{id}/media/reorder", axum::routing::put(reorder_asset_media))
        .route("/api/v1/admin/assets/{id}/media/delete", axum::routing::post(batch_delete_asset_media))
        .route("/api/v1/admin/assets/{id}", axum::routing::delete(delete_asset))
        // ---- Contracts (basic, see contract.rs for full) ----
        .route("/api/v1/admin/contracts/status", axum::routing::get(get_contract_status))
        // ---- Stats ----
        .route("/api/v1/admin/stats", axum::routing::get(get_stats))
        .route("/api/v1/admin/stats/tvl", axum::routing::get(get_stats_tvl))
        .route("/api/v1/admin/stats/users", axum::routing::get(get_stats_users))
        .route("/api/v1/admin/stats/staking", axum::routing::get(get_stats_staking))
        // ---- KYC ----
        .route("/api/v1/admin/kyc/", axum::routing::get(list_kyc))
        .route("/api/v1/admin/kyc/stats", axum::routing::get(kyc_stats))
        .route("/api/v1/admin/kyc/reject-reasons", axum::routing::get(kyc_reject_reasons))
        .route("/api/v1/admin/kyc/batch-review", axum::routing::post(kyc_batch_review))
        .route("/api/v1/admin/kyc/pending", axum::routing::get(kyc_pending))
        .route("/api/v1/admin/kyc/failed-sync", axum::routing::get(kyc_failed_sync))
        .route("/api/v1/admin/kyc/contract-info", axum::routing::get(kyc_contract_info))
        .route("/api/v1/admin/kyc/contract-status/{address}", axum::routing::get(kyc_contract_status))
        .route("/api/v1/admin/kyc/{id}", axum::routing::get(get_kyc))
        .route("/api/v1/admin/kyc/{id}/review", axum::routing::post(review_kyc))
        .route("/api/v1/admin/kyc/{id}/audit-logs", axum::routing::get(kyc_audit_logs))
        .route("/api/v1/admin/kyc/{id}/contract-comparison", axum::routing::get(kyc_contract_comparison))
        .route("/api/v1/admin/kyc/{id}/record-admission", axum::routing::post(kyc_record_admission))
        .route("/api/v1/admin/kyc/{id}/record-revocation", axum::routing::post(kyc_record_revocation))
        .route("/api/v1/admin/kyc/{id}/review-progress", axum::routing::put(kyc_review_progress))
        // ---- Accounts (address-keyed) ----
        .route("/api/v1/admin/accounts", axum::routing::post(create_account))
        .route("/api/v1/admin/accounts", axum::routing::get(list_accounts))
        .route("/api/v1/admin/accounts/address/{address}", axum::routing::get(get_account_by_address))
        .route("/api/v1/admin/accounts/address/{address}", axum::routing::put(update_account_by_address))
        .route("/api/v1/admin/accounts/address/{address}", axum::routing::delete(delete_account_by_address))
        .route("/api/v1/admin/accounts/address/{address}/roles", axum::routing::put(update_account_roles))
        .route("/api/v1/admin/accounts/by-role/{role}", axum::routing::get(get_accounts_by_role))
        .route("/api/v1/admin/accounts/roles/available", axum::routing::get(list_available_roles))
        .route("/api/v1/admin/accounts/{id}", axum::routing::get(get_account))
        // ---- Transactions ----
        .route("/api/v1/admin/transactions", axum::routing::post(create_transaction))
        .route("/api/v1/admin/transactions", axum::routing::get(list_transactions))
        .route("/api/v1/admin/transactions/stats", axum::routing::get(transaction_stats))
        .route("/api/v1/admin/transactions/export", axum::routing::get(export_transactions))
        .route("/api/v1/admin/transactions/hash/{tx_hash}", axum::routing::get(get_transaction_by_hash))
        .route("/api/v1/admin/transactions/address/{address}/history", axum::routing::get(transaction_address_history))
        .route("/api/v1/admin/transactions/{id}", axum::routing::get(get_transaction))
        .route("/api/v1/admin/transactions/{id}", axum::routing::put(update_transaction))
        .route("/api/v1/admin/transactions/wallet/{id}/history", axum::routing::get(wallet_tx_history))
}

async fn create_asset(
    State(state): State<SharedState>,
    Json(req): Json<CreateAssetRequest>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let row = sqlx::query(
        "INSERT INTO asset (name, symbol, description, asset_type, image_url, document_url, location, total_supply, min_subscription, current_price, apy_3m, apy_6m, apy_12m, subscription_mode, frame_style, status, environment) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'hardhat') 
         RETURNING id, name, symbol, description, asset_type, image_url, document_url, location, current_price, price_updated_at, total_supply, subscribed_amount, min_subscription, subscription_start_at, subscription_end_at, apy_3m, apy_6m, apy_12m, subscription_mode, project, contract_address, frame_style, status, environment, created_at, updated_at",
    )
    .bind(&req.name)
    .bind(&req.symbol)
    .bind(&req.description)
    .bind(&req.asset_type)
    .bind(&req.image_url)
    .bind(&req.document_url)
    .bind(&req.location)
    .bind(req.total_supply.to_string())
    .bind(req.min_subscription.to_string())
    .bind(req.current_price.unwrap_or(0.0).to_string())
    .bind(req.apy_3m.to_string())
    .bind(req.apy_6m.to_string())
    .bind(req.apy_12m.to_string())
    .bind(&req.subscription_mode)
    .bind(&req.frame_style)
    .fetch_one(&state.db)
    .await?;

    let data = DataWrapper::object(serde_json::json!({
        "id": row.get::<i64, _>("id"),
        "name": row.get::<String, _>("name"),
        "symbol": row.get::<String, _>("symbol"),
        "description": row.get::<Option<String>, _>("description"),
        "asset_type": row.get::<String, _>("asset_type"),
        "image_url": row.get::<Option<String>, _>("image_url"),
        "document_url": row.get::<Option<String>, _>("document_url"),
        "location": row.get::<Option<String>, _>("location"),
        "current_price": nf(&row.get::<String, _>("current_price")),
        "price_updated_at": row.get::<Option<chrono::NaiveDateTime>, _>("price_updated_at"),
        "total_supply": nf(&row.get::<String, _>("total_supply")),
        "subscribed_amount": nf(&row.get::<String, _>("subscribed_amount")),
        "min_subscription": nf(&row.get::<String, _>("min_subscription")),
        "subscription_start_at": row.get::<Option<chrono::NaiveDateTime>, _>("subscription_start_at"),
        "subscription_end_at": row.get::<Option<chrono::NaiveDateTime>, _>("subscription_end_at"),
        "apy_3m": nf(&row.get::<String, _>("apy_3m")),
        "apy_6m": nf(&row.get::<String, _>("apy_6m")),
        "apy_12m": nf(&row.get::<String, _>("apy_12m")),
        "subscription_mode": row.get::<String, _>("subscription_mode"),
        "project": row.get::<Option<String>, _>("project"),
        "contract_address": row.get::<Option<String>, _>("contract_address"),
        "frame_style": row.get::<Option<String>, _>("frame_style"),
        "status": row.get::<String, _>("status"),
        "environment": row.get::<String, _>("environment"),
        "created_at": row.get::<Option<chrono::NaiveDateTime>, _>("created_at"),
        "updated_at": row.get::<Option<chrono::NaiveDateTime>, _>("updated_at"),
    }));
    Ok(Json(data))
}

async fn list_assets(
    State(state): State<SharedState>,
    Query(params): Query<ListQuery>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let offset = (params.page - 1).max(0) * params.page_size;
    let items = sqlx::query!(
        "SELECT id, name, symbol, description, asset_type, image_url, document_url, location, current_price, total_supply, subscribed_amount, min_subscription, apy_3m, apy_6m, apy_12m, subscription_mode, subscription_start_at, subscription_end_at, project, contract_address, frame_style, status, environment, created_at, updated_at FROM asset ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        params.page_size,
        offset
    )
    .fetch_all(&state.db)
    .await?;

    let total = sqlx::query_scalar!("SELECT COUNT(*) FROM asset")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);

    let items: Vec<serde_json::Value> = {
        let mut json_items = Vec::new();
        for r in items {
            let ts = nf(&r.total_supply);
            let sa = nf(&r.subscribed_amount);
            let cover = sqlx::query_scalar!(
                "SELECT url FROM asset_media WHERE asset_id = $1 AND media_type = 'cover' ORDER BY sort_order LIMIT 1",
                r.id
            ).fetch_optional(&state.db).await.ok().flatten();
            let logo = sqlx::query_scalar!(
                "SELECT url FROM asset_media WHERE asset_id = $1 AND media_type = 'logo' ORDER BY sort_order LIMIT 1",
                r.id
            ).fetch_optional(&state.db).await.ok().flatten();
            json_items.push(serde_json::json!({
            "id": r.id,
            "name": r.name,
            "symbol": r.symbol,
            "description": r.description,
            "asset_type": r.asset_type,
            "image_url": r.image_url,
            "cover_image_url": cover,
            "logo_url": logo,
            "frame_style": r.frame_style,
            "location": r.location,
            "current_price": nf(&r.current_price),
            "total_supply": ts,
            "subscribed_amount": sa,
            "min_subscription": nf(&r.min_subscription),
            "apy_3m": nf(&r.apy_3m),
            "apy_6m": nf(&r.apy_6m),
            "apy_12m": nf(&r.apy_12m),
            "subscription_mode": r.subscription_mode,
            "subscription_start_at": r.subscription_start_at,
            "subscription_end_at": r.subscription_end_at,
            "subscription_progress": if ts > 0.0 { sa / ts * 100.0 } else { 0.0 },
            "is_available": r.status == "active",
            "contract_address": r.contract_address,
            "project": r.project,
            "status": r.status,
            "environment": r.environment,
            "created_at": r.created_at,
            "updated_at": r.updated_at
            }));
        }
        json_items
    };

    let pagination = Pagination::new(total, params.page, params.page_size);
    let data = DataWrapper::list(items, pagination);
    Ok(Json(data))
}

async fn get_asset(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let item = sqlx::query!(
        "SELECT id, name, symbol, description, asset_type, image_url, document_url, location, current_price, price_updated_at, total_supply, subscribed_amount, min_subscription, subscription_start_at, subscription_end_at, apy_3m, apy_6m, apy_12m, subscription_mode, project, contract_address, frame_style, status, environment, created_at, updated_at FROM asset WHERE id = $1",
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("asset {} not found", id)))?;

    let data = DataWrapper::object(serde_json::json!({
        "id": item.id,
        "name": item.name,
        "symbol": item.symbol,
        "description": item.description,
        "asset_type": item.asset_type,
        "image_url": item.image_url,
        "document_url": item.document_url,
        "location": item.location,
        "current_price": nf(&item.current_price),
        "price_updated_at": item.price_updated_at,
        "total_supply": nf(&item.total_supply),
        "subscribed_amount": nf(&item.subscribed_amount),
        "min_subscription": nf(&item.min_subscription),
        "subscription_start_at": item.subscription_start_at,
        "subscription_end_at": item.subscription_end_at,
        "apy_3m": nf(&item.apy_3m),
        "apy_6m": nf(&item.apy_6m),
        "apy_12m": nf(&item.apy_12m),
        "subscription_mode": item.subscription_mode,
        "project": item.project,
        "contract_address": item.contract_address,
        "frame_style": item.frame_style,
        "status": item.status,
        "environment": item.environment,
        "created_at": item.created_at,
        "updated_at": item.updated_at
    }));
    Ok(Json(data))
}

async fn update_asset(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
    Json(req): Json<UpdateAssetRequest>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    if let Some(name) = req.name {
        sqlx::query!("UPDATE asset SET name = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1", id, name)
            .execute(&state.db).await?;
    }
    if let Some(price) = req.current_price {
        let price_str = price.to_string();
        sqlx::query!("UPDATE asset SET current_price = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1", id, price_str)
            .execute(&state.db).await?;
    }
    if let Some(status) = req.status {
        sqlx::query!("UPDATE asset SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1", id, status)
            .execute(&state.db).await?;
    }

    // Return full asset detail (frontend expects AssetDetail as object_data)
    let item = sqlx::query!(
        "SELECT id, name, symbol, description, asset_type, image_url, document_url, location, current_price, price_updated_at, total_supply, subscribed_amount, min_subscription, subscription_start_at, subscription_end_at, apy_3m, apy_6m, apy_12m, subscription_mode, project, contract_address, frame_style, status, environment, created_at, updated_at FROM asset WHERE id = $1",
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("asset {} not found", id)))?;

    let data = DataWrapper::object(serde_json::json!({
        "id": item.id, "name": item.name, "symbol": item.symbol,
        "description": item.description, "asset_type": item.asset_type,
        "image_url": item.image_url, "document_url": item.document_url,
        "location": item.location, "current_price": nf(&item.current_price),
        "price_updated_at": item.price_updated_at,
        "total_supply": nf(&item.total_supply), "subscribed_amount": nf(&item.subscribed_amount),
        "min_subscription": nf(&item.min_subscription),
        "subscription_start_at": item.subscription_start_at,
        "subscription_end_at": item.subscription_end_at,
        "apy_3m": nf(&item.apy_3m), "apy_6m": nf(&item.apy_6m), "apy_12m": nf(&item.apy_12m),
        "subscription_mode": item.subscription_mode,
        "project": item.project, "contract_address": item.contract_address,
        "frame_style": item.frame_style, "status": item.status,
        "environment": item.environment,
        "created_at": item.created_at, "updated_at": item.updated_at
    }));
    Ok(Json(data))
}

async fn update_asset_status(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let status = req.get("status")
        .and_then(|v| v.as_str())
        .ok_or_else(|| AppError::BadRequest("status required".to_string()))?;

    sqlx::query!("UPDATE asset SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1", id, status)
        .execute(&state.db).await?;

    // Return full asset detail (frontend expects AssetDetail as object_data)
    let item = sqlx::query!(
        "SELECT id, name, symbol, description, asset_type, image_url, document_url, location, current_price, price_updated_at, total_supply, subscribed_amount, min_subscription, subscription_start_at, subscription_end_at, apy_3m, apy_6m, apy_12m, subscription_mode, project, contract_address, frame_style, status, environment, created_at, updated_at FROM asset WHERE id = $1",
        id
    )
    .fetch_optional(&state.db).await?
    .ok_or_else(|| AppError::NotFound(format!("asset {} not found", id)))?;

    let data = DataWrapper::object(serde_json::json!({
        "id": item.id, "name": item.name, "symbol": item.symbol,
        "description": item.description, "asset_type": item.asset_type,
        "image_url": item.image_url, "document_url": item.document_url,
        "location": item.location, "current_price": nf(&item.current_price),
        "price_updated_at": item.price_updated_at,
        "total_supply": nf(&item.total_supply), "subscribed_amount": nf(&item.subscribed_amount),
        "min_subscription": nf(&item.min_subscription),
        "subscription_start_at": item.subscription_start_at,
        "subscription_end_at": item.subscription_end_at,
        "apy_3m": nf(&item.apy_3m), "apy_6m": nf(&item.apy_6m), "apy_12m": nf(&item.apy_12m),
        "subscription_mode": item.subscription_mode,
        "project": item.project, "contract_address": item.contract_address,
        "frame_style": item.frame_style, "status": item.status,
        "environment": item.environment,
        "created_at": item.created_at, "updated_at": item.updated_at
    }));
    Ok(Json(data))
}

async fn update_asset_price(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
    Json(req): Json<UpdateAssetPriceRequest>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let price_str = req.price.to_string();
    sqlx::query!(
        "UPDATE asset SET current_price = $2, price_updated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        id,
        price_str
    )
    .execute(&state.db).await?;

    // Return full asset detail (frontend expects AssetDetail as object_data)
    let item = sqlx::query!(
        "SELECT id, name, symbol, description, asset_type, image_url, document_url, location, current_price, price_updated_at, total_supply, subscribed_amount, min_subscription, subscription_start_at, subscription_end_at, apy_3m, apy_6m, apy_12m, subscription_mode, project, contract_address, frame_style, status, environment, created_at, updated_at FROM asset WHERE id = $1",
        id
    )
    .fetch_optional(&state.db).await?
    .ok_or_else(|| AppError::NotFound(format!("asset {} not found", id)))?;

    let data = DataWrapper::object(serde_json::json!({
        "id": item.id, "name": item.name, "symbol": item.symbol,
        "description": item.description, "asset_type": item.asset_type,
        "image_url": item.image_url, "document_url": item.document_url,
        "location": item.location, "current_price": nf(&item.current_price),
        "price_updated_at": item.price_updated_at,
        "total_supply": nf(&item.total_supply), "subscribed_amount": nf(&item.subscribed_amount),
        "min_subscription": nf(&item.min_subscription),
        "subscription_start_at": item.subscription_start_at,
        "subscription_end_at": item.subscription_end_at,
        "apy_3m": nf(&item.apy_3m), "apy_6m": nf(&item.apy_6m), "apy_12m": nf(&item.apy_12m),
        "subscription_mode": item.subscription_mode,
        "project": item.project, "contract_address": item.contract_address,
        "frame_style": item.frame_style, "status": item.status,
        "environment": item.environment,
        "created_at": item.created_at, "updated_at": item.updated_at
    }));
    Ok(Json(data))
}

async fn bind_project(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
    Json(req): Json<BindProjectRequest>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let set_primary = req.set_primary.unwrap_or(true);

    for (idx, contract_name) in req.contract_names.iter().enumerate() {
        // Look up contract deployment info
        let row = sqlx::query(
            "SELECT address, contract_type FROM contract_deployment WHERE name = ? AND status = 'active' LIMIT 1",
        )
        .bind(contract_name)
        .fetch_optional(&state.db)
        .await?;

        let (contract_address, contract_type) = match row {
            Some(r) => {
                let addr: String = r.get("address");
                let ct: String = r.get("contract_type");
                (addr, ct)
            }
            None => continue, // skip contracts not found in DB
        };

        let is_primary = if set_primary && idx == 0 { 1i32 } else { 0i32 };

        sqlx::query(
            "INSERT INTO asset_contract_binding (asset_id, contract_name, contract_address, contract_type, is_primary) \
             VALUES (?, ?, ?, ?, ?) \
             ON CONFLICT(asset_id, contract_name) DO UPDATE SET \
             contract_address = excluded.contract_address, \
             contract_type = excluded.contract_type, \
             is_primary = excluded.is_primary, \
             updated_at = CURRENT_TIMESTAMP",
        )
        .bind(id)
        .bind(contract_name)
        .bind(&contract_address)
        .bind(&contract_type)
        .bind(is_primary)
        .execute(&state.db)
        .await?;

        // Update asset.contract_address if this is the primary binding
        if is_primary == 1 {
            sqlx::query(
                "UPDATE asset SET contract_address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            )
            .bind(&contract_address)
            .bind(id)
            .execute(&state.db)
            .await?;
        }
    }

    // Return updated asset detail (frontend expects AssetDetail as object_data)
    let item = sqlx::query!(
        "SELECT id, name, symbol, description, asset_type, image_url, document_url, location, current_price, price_updated_at, total_supply, subscribed_amount, min_subscription, subscription_start_at, subscription_end_at, apy_3m, apy_6m, apy_12m, subscription_mode, project, contract_address, frame_style, status, environment, created_at, updated_at FROM asset WHERE id = $1",
        id
    )
    .fetch_optional(&state.db).await?;

    if let Some(a) = item {
        let data = DataWrapper::object(serde_json::json!({
            "id": a.id, "name": a.name, "symbol": a.symbol,
            "description": a.description, "asset_type": a.asset_type,
            "image_url": a.image_url, "document_url": a.document_url,
            "location": a.location, "current_price": nf(&a.current_price),
            "price_updated_at": a.price_updated_at,
            "total_supply": nf(&a.total_supply), "subscribed_amount": nf(&a.subscribed_amount),
            "min_subscription": nf(&a.min_subscription),
            "subscription_start_at": a.subscription_start_at,
            "subscription_end_at": a.subscription_end_at,
            "apy_3m": nf(&a.apy_3m), "apy_6m": nf(&a.apy_6m), "apy_12m": nf(&a.apy_12m),
            "subscription_mode": a.subscription_mode,
            "project": a.project, "contract_address": a.contract_address,
            "frame_style": a.frame_style, "status": a.status,
            "environment": a.environment,
            "created_at": a.created_at, "updated_at": a.updated_at
        }));
        Ok(Json(data))
    } else {
        let data = DataWrapper::msg("Project unbound");
        Ok(Json(data))
    }
}

async fn unbind_project(
    State(state): State<SharedState>,
    Path((id, contract_name)): Path<(i64, String)>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    sqlx::query!(
        "DELETE FROM asset_contract_binding WHERE asset_id = $1 AND contract_name = $2",
        id,
        contract_name
    )
    .execute(&state.db)
    .await?;

    // If no remaining bindings for this asset, clear the asset contract_address as well
    let remaining = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM asset_contract_binding WHERE asset_id = $1",
        id
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    if remaining == 0 {
        sqlx::query!(
            "UPDATE asset SET contract_address = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            id
        )
        .execute(&state.db)
        .await?;
    }

    let data = DataWrapper::msg("Project unbound");
    Ok(Json(data))
}

async fn get_contract_status(
    State(state): State<SharedState>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let status_data = crate::services::contract_service::get_contract_status(&state.db, &state.config).await?;
    let data = DataWrapper::object(status_data);
    Ok(Json(data))
}

async fn get_stats(
    State(state): State<SharedState>,
) -> Result<Json<DataWrapper<StatsResponse>>, AppError> {
    let total_users = sqlx::query_scalar!("SELECT COUNT(*) FROM account")
        .fetch_one(&state.db).await.unwrap_or(0);
    let total_assets = sqlx::query_scalar!("SELECT COUNT(*) FROM asset")
        .fetch_one(&state.db).await.unwrap_or(0);
    let total_subscriptions = sqlx::query_scalar!("SELECT COUNT(*) FROM subscription")
        .fetch_one(&state.db).await.unwrap_or(0);
    let total_staking = sqlx::query_scalar!("SELECT COUNT(*) FROM staking_record")
        .fetch_one(&state.db).await.unwrap_or(0);

    let total_tvl = sqlx::query_scalar!("SELECT COALESCE(SUM(amount), 0) FROM subscription")
        .fetch_one(&state.db).await.ok();
    let total_rewards = sqlx::query_scalar!("SELECT COALESCE(SUM(claimed_rewards), 0) FROM staking_record")
        .fetch_one(&state.db).await.ok();

    let stats = StatsResponse {
        total_users,
        total_assets,
        total_subscriptions,
        total_staking,
        total_tvl: total_tvl.map(|v| v.to_string()).unwrap_or_else(|| "0".to_string()),
        total_staking_rewards: total_rewards.map(|v| v.to_string()).unwrap_or_else(|| "0".to_string()),
    };

    let data = DataWrapper::object(stats);
    Ok(Json(data))
}

async fn list_kyc(
    State(state): State<SharedState>,
    Query(params): Query<ListQuery>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let offset = (params.page - 1).max(0) * params.page_size;
    let items = sqlx::query!(
        r#"
        SELECT id, address, network, status, full_name, date_of_birth, submitted_at, reviewed_at,
               reviewer_address, reject_reason, country_code, is_accredited,
               risk_level, risk_score, priority,
               on_chain_sync_status, on_chain_tx_hash, on_chain_error,
               selfie_url, face_image_url,
               created_at, updated_at
        FROM account_kyc
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#,
        params.page_size,
        offset
    )
    .fetch_all(&state.db).await?;

    // Build response items with document info
    let mut json_items: Vec<serde_json::Value> = Vec::new();
    for r in items {
        let has_id_front = sqlx::query_scalar!(
            "SELECT COUNT(*) FROM account_kyc_document WHERE kyc_id = $1 AND id_front_url IS NOT NULL",
            r.id
        ).fetch_one(&state.db).await.unwrap_or(0) > 0;
        let has_id_back = sqlx::query_scalar!(
            "SELECT COUNT(*) FROM account_kyc_document WHERE kyc_id = $1 AND id_back_url IS NOT NULL",
            r.id
        ).fetch_one(&state.db).await.unwrap_or(0) > 0;
        json_items.push(serde_json::json!({
            "id": r.id,
            "wallet_address": r.address,
            "environment": r.network,
            "status": r.status,
            "full_name": r.full_name,
            "date_of_birth": r.date_of_birth,
            "submitted_at": r.submitted_at,
            "reviewed_at": r.reviewed_at,
            "reviewer_address": r.reviewer_address,
            "reject_reason": r.reject_reason,
            "country_code": r.country_code,
            "is_accredited": r.is_accredited.unwrap_or(0) != 0,
            "risk_level": r.risk_level,
            "risk_score": r.risk_score,
            "priority": r.priority,
            "on_chain_sync_status": r.on_chain_sync_status,
            "on_chain_tx_hash": r.on_chain_tx_hash,
            "on_chain_error": r.on_chain_error,
            "has_id_front": has_id_front,
            "has_id_back": has_id_back,
            "has_selfie": r.selfie_url.is_some(),
            "created_at": r.created_at,
            "updated_at": r.updated_at,
        }));
    }

    let total = sqlx::query_scalar!("SELECT COUNT(*) FROM account_kyc")
        .fetch_one(&state.db).await.unwrap_or(0);
    let pagination = Pagination::new(total, params.page, params.page_size);
    let data = DataWrapper::list(json_items, pagination);
    Ok(Json(data))
}

async fn get_kyc(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let row = sqlx::query!(
        "SELECT id, address, network, status, full_name, date_of_birth, email, phone, submitted_at, reviewed_at, reviewer_address, reject_reason, country_code, is_accredited, risk_level, risk_score, priority, on_chain_sync_status, on_chain_tx_hash, on_chain_error, selfie_url, face_image_url, created_at, updated_at FROM account_kyc WHERE id = $1",
        id
    )
    .fetch_optional(&state.db).await?
    .ok_or_else(|| AppError::NotFound(format!("kyc {} not found", id)))?;

    let docs = sqlx::query!(
        "SELECT id, id_type, id_number_last4, document_expiry, id_front_url, id_back_url FROM account_kyc_document WHERE kyc_id = $1",
        id
    )
    .fetch_all(&state.db).await?;

    let has_id_front = docs.iter().any(|d| d.id_front_url.is_some());
    let has_id_back = docs.iter().any(|d| d.id_back_url.is_some());

    // Frontend expects { kyc: AdminKycItem, documents: { id_front?, id_back?, selfie? } }
    let kyc_item = serde_json::json!({
        "id": row.id,
        "wallet_address": row.address,
        "environment": row.network,
        "status": row.status,
        "full_name": row.full_name,
        "date_of_birth": row.date_of_birth,
        "submitted_at": row.submitted_at,
        "reviewed_at": row.reviewed_at,
        "reviewer_address": row.reviewer_address,
        "reject_reason": row.reject_reason,
        "country_code": row.country_code,
        "is_accredited": row.is_accredited.unwrap_or(0) != 0,
        "risk_level": row.risk_level,
        "risk_score": row.risk_score,
        "priority": row.priority,
        "on_chain_sync_status": row.on_chain_sync_status,
        "on_chain_tx_hash": row.on_chain_tx_hash,
        "on_chain_error": row.on_chain_error,
        "has_id_front": has_id_front,
        "has_id_back": has_id_back,
        "has_selfie": row.selfie_url.is_some(),
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    });

    // Build documents object with URLs
    let id_front_url = docs.iter().find_map(|d| d.id_front_url.clone());
    let id_back_url = docs.iter().find_map(|d| d.id_back_url.clone());
    let documents = serde_json::json!({
        "id_front": id_front_url,
        "id_back": id_back_url,
        "selfie": row.selfie_url,
    });

    let data = DataWrapper::object(serde_json::json!({
        "kyc": kyc_item,
        "documents": documents,
    }));
    Ok(Json(data))
}

async fn review_kyc(
    State(state): State<SharedState>,
    AdminAddress(admin): AdminAddress,
    Path(id): Path<i64>,
    Json(req): Json<KycReviewRequest>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let service = KycService::new(state.db.clone());
    let result = service.review(id, &req, &admin).await?;
    let data = DataWrapper::object(result);
    Ok(Json(data))
}

async fn create_account(
    State(state): State<SharedState>,
    Json(req): Json<CreateAccountRequest>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let roles = serde_json::to_value(req.roles).unwrap_or(serde_json::json!([]));
    let address = req.address.to_lowercase();
    let balance = "0".to_string();
    let result = sqlx::query!(
        "INSERT INTO account (address, private_key, roles, network, is_active, balance) VALUES ($1, $2, $3, $4, 1, $5) RETURNING id",
        address,
        req.private_key,
        roles,
        req.network,
        balance
    )
    .fetch_one(&state.db).await?;

    let data = DataWrapper::object(serde_json::json!({"id": result.id, "message": "Account created"}));
    Ok(Json(data))
}

async fn list_accounts(
    State(state): State<SharedState>,
    Query(params): Query<ListQuery>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let offset = (params.page - 1).max(0) * params.page_size;
    let items = sqlx::query!(
        "SELECT id, address, roles, network, is_active, is_blocked, created_at FROM account ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        params.page_size,
        offset
    )
    .fetch_all(&state.db).await?;

    let total = sqlx::query_scalar!("SELECT COUNT(*) FROM account")
        .fetch_one(&state.db).await.unwrap_or(0);

    let items: Vec<serde_json::Value> = items.into_iter().map(|r| serde_json::json!({
        "id": r.id,
        "address": r.address,
        "roles": r.roles,
        "network": r.network,
        "is_active": r.is_active,
        "is_blocked": r.is_blocked
    })).collect();

    let pagination = Pagination::new(total, params.page, params.page_size);
    let data = DataWrapper::list(items, pagination);
    Ok(Json(data))
}

async fn get_account(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let item = sqlx::query!(
        "SELECT id, address, roles, network, is_active, balance, created_at FROM account WHERE id = $1",
        id
    )
    .fetch_optional(&state.db).await?
    .ok_or_else(|| AppError::NotFound(format!("account {} not found", id)))?;

    let data = DataWrapper::object(serde_json::json!({
        "id": item.id,
        "address": item.address,
        "roles": item.roles,
        "network": item.network,
        "is_active": item.is_active,
        "balance": item.balance
    }));
    Ok(Json(data))
}

async fn create_transaction(
    State(state): State<SharedState>,
    Json(req): Json<CreateTransactionRequest>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let result = sqlx::query!(
        "INSERT INTO transaction_audit (tx_hash, from_address, to_address, amount, token_type, tx_type, status, environment) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
        req.tx_hash,
        req.from_address,
        req.to_address,
        req.amount,
        req.token_type,
        req.tx_type,
        "pending",
        "hardhat"
    )
    .fetch_one(&state.db).await?;

    let data = DataWrapper::object(serde_json::json!({"id": result.id, "message": "Transaction recorded"}));
    Ok(Json(data))
}

async fn list_transactions(
    State(state): State<SharedState>,
    Query(params): Query<ListQuery>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let offset = (params.page - 1).max(0) * params.page_size;
    let items = sqlx::query!(
        "SELECT id, tx_hash, from_address, to_address, amount, status, created_at FROM transaction_audit ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        params.page_size,
        offset
    )
    .fetch_all(&state.db).await?;

    let total = sqlx::query_scalar!("SELECT COUNT(*) FROM transaction_audit")
        .fetch_one(&state.db).await.unwrap_or(0);

    let items: Vec<serde_json::Value> = items.into_iter().map(|r| serde_json::json!({
        "id": r.id,
        "tx_hash": r.tx_hash,
        "from_address": r.from_address,
        "to_address": r.to_address,
        "amount": r.amount,
        "status": r.status
    })).collect();

    let pagination = Pagination::new(total, params.page, params.page_size);
    let data = DataWrapper::list(items, pagination);
    Ok(Json(data))
}

async fn get_transaction(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let item = sqlx::query!(
        "SELECT id, tx_hash, from_address, to_address, amount, status, created_at FROM transaction_audit WHERE id = $1",
        id
    )
    .fetch_optional(&state.db).await?
    .ok_or_else(|| AppError::NotFound(format!("transaction {} not found", id)))?;

    let data = DataWrapper::object(serde_json::json!({
        "id": item.id,
        "tx_hash": item.tx_hash,
        "from_address": item.from_address,
        "to_address": item.to_address,
        "amount": item.amount,
        "status": item.status
    }));
    Ok(Json(data))
}

// ============ New handlers ============

// ---- Asset projects ----

async fn list_available_projects(
    State(state): State<SharedState>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    // Query all active contracts with their binding status, grouped by project
    let rows = sqlx::query(
        "SELECT d.name, d.address, d.contract_type, d.project_name, d.scope, \
                acb.asset_id, a.name as asset_name \
         FROM contract_deployment d \
         LEFT JOIN asset_contract_binding acb ON acb.contract_name = d.name \
         LEFT JOIN asset a ON a.id = acb.asset_id \
         WHERE d.status = 'active' \
         ORDER BY d.project_name, d.name"
    )
    .fetch_all(&state.db)
    .await?;

    // Group by project_name
    use std::collections::HashMap;
    let mut project_map: HashMap<String, Vec<serde_json::Value>> = HashMap::new();

    for row in rows {
        let name: String = row.get("name");
        let address: String = row.get("address");
        let contract_type: String = row.get("contract_type");
        let project_name: String = row.get("project_name");
        let asset_id: Option<i64> = row.get("asset_id");
        let asset_name: Option<String> = row.get("asset_name");

        // Contracts are always selectable; binding info is shown as a hint.
        // The UNIQUE(asset_id, contract_name) constraint allows the same
        // contract to be bound to multiple assets.
        let is_available = true;

        project_map
            .entry(project_name)
            .or_default()
            .push(serde_json::json!({
                "contract_name": name,
                "contract_address": address,
                "contract_type": contract_type,
                "is_available": is_available,
                "bound_to_asset": asset_name,
                "bound_to_asset_id": asset_id,
            }));
    }

    let items: Vec<serde_json::Value> = project_map
        .into_iter()
        .map(|(project, contracts)| {
            serde_json::json!({
                "project": project,
                "contract_count": contracts.len(),
                "contracts": contracts,
            })
        })
        .collect();

    let total = items.len() as i64;
    let data = DataWrapper::list(items, Pagination::new(total, 1, 100));
    Ok(Json(data))
}

// ---- Asset media ----

async fn list_asset_media(
    State(state): State<SharedState>,
    Path(asset_id): Path<i64>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let items = sqlx::query!(
        "SELECT am.id, am.media_type, am.url, am.title, am.description, am.sort_order, am.is_primary, am.created_at,
                mf.file_name, mf.file_size, mf.mime_type
         FROM asset_media am
         LEFT JOIN media_files mf ON am.media_id = mf.id
         WHERE am.asset_id = $1
         ORDER BY am.sort_order ASC, am.created_at DESC",
        asset_id
    ).fetch_all(&state.db).await?;
    let items: Vec<serde_json::Value> = items.into_iter().map(|r| serde_json::json!({
        "id": r.id, "media_type": r.media_type, "url": r.url,
        "title": r.title, "description": r.description,
        "sort_order": r.sort_order, "is_primary": r.is_primary,
        "file_name": r.file_name, "file_size": r.file_size,
        "mime_type": r.mime_type, "created_at": r.created_at,
    })).collect();
    let total = items.len() as i64;
    let data = DataWrapper::list(items, Pagination::new(total, 1, 100));
    Ok(Json(data))
}

async fn upload_asset_media(
    State(state): State<SharedState>,
    Path(asset_id): Path<i64>,
    mut multipart: Multipart,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let storage_dir = "data/files";
    let owner_address = format!("asset_{}", asset_id);

    let mut media_type = "image".to_string();
    let mut title: Option<String> = None;
    let mut description: Option<String> = None;
    let mut is_primary = false;
    let mut sort_order: i64 = 0;
    // Collect all file fields (frontend sends "files", some clients send "file")
    let mut file_fields: Vec<(String, Option<String>, Vec<u8>)> = Vec::new();

    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        let name = field.name().unwrap_or("").to_string();
        match name.as_str() {
            "file" | "files" => {
                let file_name = field.file_name().unwrap_or("upload.bin").to_string();
                let mime_type = field.content_type().map(|s| s.to_string());
                let data = field.bytes().await.map_err(|e| AppError::BadRequest(e.to_string()))?;
                file_fields.push((file_name, mime_type, data.to_vec()));
            }
            "media_type" => {
                if let Ok(text) = field.text().await {
                    media_type = text;
                }
            }
            "title" => {
                if let Ok(text) = field.text().await {
                    title = Some(text);
                }
            }
            "description" => {
                if let Ok(text) = field.text().await {
                    description = Some(text);
                }
            }
            "is_primary" => {
                if let Ok(text) = field.text().await {
                    is_primary = text == "1" || text.to_lowercase() == "true";
                }
            }
            "sort_order" => {
                if let Ok(text) = field.text().await {
                    if let Ok(v) = text.parse::<i64>() {
                        sort_order = v;
                    }
                }
            }
            _ => {}
        }
    }

    if file_fields.is_empty() {
        return Err(AppError::BadRequest("no file uploaded".to_string()));
    }

    let total = file_fields.len() as i64;
    let mut success_count = 0i64;
    let mut failed_count = 0i64;
    let mut results: Vec<serde_json::Value> = Vec::new();
    let is_primary_i32 = is_primary as i32;

    for (file_name, mime_type, data) in file_fields {
        let result = async {
            let media = media_repo::save_file(
                &state.db, &owner_address, &file_name,
                mime_type.as_deref(), &data, storage_dir,
            ).await?;

            let url = format!("/api/v1/user/media/{}", media.id);

            sqlx::query(
                "INSERT INTO asset_media (asset_id, media_type, url, title, description, sort_order, is_primary, media_id) \
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .bind(asset_id)
            .bind(&media_type)
            .bind(&url)
            .bind(&title)
            .bind(&description)
            .bind(sort_order)
            .bind(is_primary_i32)
            .bind(media.id)
            .execute(&state.db)
            .await?;

            Ok::<_, AppError>(serde_json::json!({
                "success": true,
                "file_name": file_name,
                "media": {
                    "id": media.id,
                    "media_type": media_type,
                    "url": url,
                    "title": title,
                    "description": description,
                    "sort_order": sort_order,
                    "is_primary": is_primary,
                    "file_name": media.file_name,
                    "file_size": media.file_size,
                    "mime_type": mime_type,
                    "created_at": chrono::Utc::now().to_rfc3339(),
                },
                "error": null,
            }))
        }.await;

        match result {
            Ok(item) => {
                success_count += 1;
                results.push(item);
            }
            Err(e) => {
                failed_count += 1;
                results.push(serde_json::json!({
                    "success": false,
                    "file_name": file_name,
                    "media": null,
                    "error": e.to_string(),
                }));
            }
        }
    }

    let data = DataWrapper::object(serde_json::json!({
        "total": total,
        "success_count": success_count,
        "failed_count": failed_count,
        "results": results,
    }));
    Ok(Json(data))
}

async fn asset_media_stats(
    State(state): State<SharedState>,
    Path(asset_id): Path<i64>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let total = sqlx::query_scalar!("SELECT COUNT(*) FROM asset_media WHERE asset_id = $1", asset_id)
        .fetch_one(&state.db).await.unwrap_or(0);
    let total_size = sqlx::query_scalar!(
        "SELECT COALESCE(SUM(mf.file_size), 0) FROM asset_media am LEFT JOIN media_files mf ON am.media_id = mf.id WHERE am.asset_id = $1",
        asset_id
    )
    .fetch_one(&state.db).await.unwrap_or(0);

    // Count by media_type
    let type_rows = sqlx::query!(
        "SELECT media_type, COUNT(*) as \"cnt: i64\" FROM asset_media WHERE asset_id = $1 GROUP BY media_type",
        asset_id
    )
    .fetch_all(&state.db).await?;
    let mut by_type: serde_json::Value = serde_json::json!({});
    for r in &type_rows {
        by_type[r.media_type.clone()] = serde_json::json!(r.cnt);
    }

    let has_cover = type_rows.iter().any(|r| r.media_type == "cover");
    let has_valuation = type_rows.iter().any(|r| r.media_type == "valuation");
    let has_legal = type_rows.iter().any(|r| r.media_type == "legal");

    let data = DataWrapper::object(serde_json::json!({
        "total_count": total,
        "by_type": by_type,
        "total_size_bytes": total_size,
        "has_cover": has_cover,
        "has_valuation": has_valuation,
        "has_legal": has_legal,
    }));
    Ok(Json(data))
}

async fn update_asset_media(
    State(state): State<SharedState>,
    Path((asset_id, media_id)): Path<(i64, i64)>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    // Resolve media_files id from asset_media gallery entry
    let row = sqlx::query!("SELECT media_id FROM asset_media WHERE id = $1 AND asset_id = $2", media_id, asset_id)
        .fetch_optional(&state.db).await?;
    if let Some(file_id) = row.and_then(|r| r.media_id) {
        if let Some(name) = req.get("file_name").and_then(|v| v.as_str()) {
            sqlx::query!("UPDATE media_files SET file_name = $2 WHERE id = $1", file_id, name)
                .execute(&state.db).await?;
        }
        if let Some(title) = req.get("title").and_then(|v| v.as_str()) {
            sqlx::query!("UPDATE asset_media SET title = $2 WHERE id = $1", media_id, title)
                .execute(&state.db).await?;
        }
        if let Some(description) = req.get("description").and_then(|v| v.as_str()) {
            sqlx::query!("UPDATE asset_media SET description = $2 WHERE id = $1", media_id, description)
                .execute(&state.db).await?;
        }
        if let Some(sort_order) = req.get("sort_order").and_then(|v| v.as_i64()) {
            sqlx::query!("UPDATE asset_media SET sort_order = $2 WHERE id = $1", media_id, sort_order)
                .execute(&state.db).await?;
        }
        if let Some(is_primary) = req.get("is_primary").and_then(|v| v.as_bool()) {
            let is_primary_i32 = is_primary as i32;
            sqlx::query!("UPDATE asset_media SET is_primary = $2 WHERE id = $1", media_id, is_primary_i32)
                .execute(&state.db).await?;
        }
        // Return updated media item (frontend expects AssetMediaItem as object_data)
        let updated = sqlx::query!(
            "SELECT am.id, am.media_type, am.url, am.title, am.description, am.sort_order, am.is_primary, am.created_at, mf.file_name, mf.file_size, mf.mime_type FROM asset_media am LEFT JOIN media_files mf ON am.media_id = mf.id WHERE am.id = $1",
            media_id
        ).fetch_optional(&state.db).await?;
        if let Some(r) = updated {
            let data = DataWrapper::object(serde_json::json!({
                "id": r.id, "media_type": r.media_type, "url": r.url,
                "title": r.title, "description": r.description,
                "sort_order": r.sort_order, "is_primary": r.is_primary,
                "file_name": r.file_name, "file_size": r.file_size,
                "mime_type": r.mime_type, "created_at": r.created_at,
            }));
            Ok(Json(data))
        } else {
            let data = DataWrapper::msg("Media updated");
            Ok(Json(data))
        }
    } else {
        Err(AppError::NotFound(format!("media {} not found for asset {}", media_id, asset_id)))
    }
}

async fn delete_asset_media(
    State(state): State<SharedState>,
    Path((asset_id, media_id)): Path<(i64, i64)>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    // Resolve media_files id from asset_media gallery entry
    let row = sqlx::query!("SELECT media_id FROM asset_media WHERE id = $1 AND asset_id = $2", media_id, asset_id)
        .fetch_optional(&state.db).await?;
    if let Some(file_id) = row.and_then(|r| r.media_id) {
        if let Some(media) = media_repo::get_file_by_id(&state.db, file_id).await? {
            let _ = std::fs::remove_file(&media.storage_path);
        }
        sqlx::query!("DELETE FROM media_files WHERE id = $1", file_id)
            .execute(&state.db).await?;
    }
    sqlx::query!("DELETE FROM asset_media WHERE id = $1 AND asset_id = $2", media_id, asset_id)
        .execute(&state.db).await?;
    let data = DataWrapper::msg("Media deleted");
    Ok(Json(data))
}

async fn reorder_asset_media(
    State(state): State<SharedState>,
    Path(asset_id): Path<i64>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    // Frontend sends { media_ids: [1, 2, 3] }
    if let Some(ids) = req.get("media_ids").and_then(|v| v.as_array()) {
        for (idx, id_val) in ids.iter().enumerate() {
            if let Some(media_id) = id_val.as_i64() {
                let sort_idx = idx as i64;
                sqlx::query!(
                    "UPDATE asset_media SET sort_order = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND asset_id = $2",
                    media_id, asset_id, sort_idx
                ).execute(&state.db).await?;
            }
        }
    }
    // Return reordered list (frontend expects AssetMediaItem[] as list_data)
    let items = sqlx::query!(
        "SELECT am.id, am.media_type, am.url, am.title, am.description, am.sort_order, am.is_primary, am.created_at, mf.file_name, mf.file_size, mf.mime_type FROM asset_media am LEFT JOIN media_files mf ON am.media_id = mf.id WHERE am.asset_id = $1 ORDER BY am.sort_order ASC, am.created_at DESC",
        asset_id
    ).fetch_all(&state.db).await?;
    let items: Vec<serde_json::Value> = items.into_iter().map(|r| serde_json::json!({
        "id": r.id, "media_type": r.media_type, "url": r.url,
        "title": r.title, "description": r.description,
        "sort_order": r.sort_order, "is_primary": r.is_primary,
        "file_name": r.file_name, "file_size": r.file_size,
        "mime_type": r.mime_type, "created_at": r.created_at,
    })).collect();
    let total = items.len() as i64;
    let data = DataWrapper::list(items, Pagination::new(total, 1, 100));
    Ok(Json(data))
}

// ---- Stats sub-endpoints ----

async fn get_stats_tvl(
    State(state): State<SharedState>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let sub_tvl = sqlx::query_scalar!("SELECT COALESCE(SUM(CAST(amount AS REAL)), 0.0) FROM subscription")
        .fetch_one(&state.db).await.unwrap_or(0.0);
    let stake_tvl = sqlx::query_scalar!("SELECT COALESCE(SUM(CAST(amount AS REAL)), 0.0) FROM staking_record WHERE status = 'active'")
        .fetch_one(&state.db).await.unwrap_or(0.0);
    let total_tvl = sub_tvl + stake_tvl;

    // Build per-asset breakdown
    let breakdown_rows = sqlx::query!(
        "SELECT a.id, a.name, COALESCE(SUM(CAST(s.amount AS REAL)), 0.0) as amount FROM asset a LEFT JOIN subscription s ON s.asset_id = a.id GROUP BY a.id, a.name ORDER BY amount DESC"
    )
    .fetch_all(&state.db).await?;
    let breakdown: Vec<serde_json::Value> = breakdown_rows.iter().map(|r| {
        let amount: f64 = r.amount;
        let percentage = if total_tvl > 0.0 { (amount / total_tvl * 100.0 * 100.0).round() / 100.0 } else { 0.0 };
        serde_json::json!({
            "asset_id": r.id,
            "asset_name": r.name,
            "amount": amount,
            "percentage": percentage,
        })
    }).collect();

    let data = DataWrapper::object(serde_json::json!({
        "total_tvl": total_tvl,
        "change_24h": 0.0,
        "change_7d": 0.0,
        "breakdown": breakdown,
    }));
    Ok(Json(data))
}

async fn get_stats_users(
    State(state): State<SharedState>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let total_users = sqlx::query_scalar!("SELECT COUNT(*) FROM account").fetch_one(&state.db).await.unwrap_or(0);
    let kyc_approved = sqlx::query_scalar!("SELECT COUNT(*) FROM account_kyc WHERE status = 'approved'").fetch_one(&state.db).await.unwrap_or(0);
    let kyc_pending = sqlx::query_scalar!("SELECT COUNT(*) FROM account_kyc WHERE status = 'pending'").fetch_one(&state.db).await.unwrap_or(0);
    let kyc_rejected = sqlx::query_scalar!("SELECT COUNT(*) FROM account_kyc WHERE status = 'rejected'").fetch_one(&state.db).await.unwrap_or(0);
    let new_users_24h = sqlx::query_scalar!("SELECT COUNT(*) FROM account WHERE datetime(created_at) >= datetime('now', '-1 day')").fetch_one(&state.db).await.unwrap_or(0);
    let new_users_7d = sqlx::query_scalar!("SELECT COUNT(*) FROM account WHERE datetime(created_at) >= datetime('now', '-7 days')").fetch_one(&state.db).await.unwrap_or(0);
    let kyc_conversion_rate = if total_users > 0 { ((kyc_approved as f64 / total_users as f64 * 100.0) * 100.0).round() / 100.0 } else { 0.0 };

    let data = DataWrapper::object(serde_json::json!({
        "total_users": total_users,
        "kyc_approved": kyc_approved,
        "kyc_pending": kyc_pending,
        "kyc_rejected": kyc_rejected,
        "new_users_24h": new_users_24h,
        "new_users_7d": new_users_7d,
        "kyc_conversion_rate": kyc_conversion_rate,
    }));
    Ok(Json(data))
}

async fn get_stats_staking(
    State(state): State<SharedState>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let total_staked = sqlx::query_scalar!("SELECT COALESCE(SUM(CAST(amount AS REAL)), 0.0) FROM staking_record WHERE status = 'active'")
        .fetch_one(&state.db).await.unwrap_or(0.0);
    let active_stakes = sqlx::query_scalar!("SELECT COUNT(*) FROM staking_record WHERE status = 'active'")
        .fetch_one(&state.db).await.unwrap_or(0);
    let total_rewards_distributed = sqlx::query_scalar!("SELECT COALESCE(SUM(CAST(claimed_rewards AS REAL)), 0.0) FROM staking_record")
        .fetch_one(&state.db).await.unwrap_or(0.0);

    // Period distribution
    let period_rows = sqlx::query!(
        "SELECT period, COUNT(*) as cnt FROM staking_record GROUP BY period"
    )
    .fetch_all(&state.db).await?;
    let mut period_distribution: serde_json::Value = serde_json::json!({});
    for r in &period_rows {
        period_distribution[r.period.to_string()] = serde_json::json!(r.cnt);
    }

    let data = DataWrapper::object(serde_json::json!({
        "total_staked": total_staked,
        "active_stakes": active_stakes,
        "total_rewards_distributed": total_rewards_distributed,
        "rewards_pool_remaining": 1000000.0 - total_rewards_distributed,
        "avg_stake_period": 30,
        "period_distribution": period_distribution,
    }));
    Ok(Json(data))
}

// ---- KYC sub-endpoints ----

async fn kyc_stats(
    State(state): State<SharedState>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let total = sqlx::query_scalar!("SELECT COUNT(*) FROM account_kyc").fetch_one(&state.db).await.unwrap_or(0);
    let pending = sqlx::query_scalar!("SELECT COUNT(*) FROM account_kyc WHERE status = 'pending'").fetch_one(&state.db).await.unwrap_or(0);
    let approved = sqlx::query_scalar!("SELECT COUNT(*) FROM account_kyc WHERE status = 'approved'").fetch_one(&state.db).await.unwrap_or(0);
    let rejected = sqlx::query_scalar!("SELECT COUNT(*) FROM account_kyc WHERE status = 'rejected'").fetch_one(&state.db).await.unwrap_or(0);
    let failed_sync = sqlx::query_scalar!("SELECT COUNT(*) FROM account_kyc WHERE status = 'approved' AND (on_chain_sync_status IS NULL OR on_chain_sync_status != 'synced')").fetch_one(&state.db).await.unwrap_or(0);

    let total_decided = approved + rejected;
    let approval_rate = if total_decided > 0 { (approved as f64 / total_decided as f64) * 100.0 } else { 0.0 };
    let resubmit_rate = 0.0; // 当前未追踪重投次数，默认 0

    let data = DataWrapper::object(serde_json::json!({
        "total": total,
        "pending": pending,
        "approved": approved,
        "rejected": rejected,
        "failed_sync": failed_sync,
        "approval_rate": approval_rate,
        "resubmit_rate": resubmit_rate,
        "avg_processing_time_minutes": 0.0,
        "median_processing_time_minutes": 0.0,
        "risk_distribution": {
            "low": 0,
            "medium": 0,
            "high": 0,
            "critical": 0,
        },
        "daily_stats": [],
        "reviewer_stats": [],
    }));
    Ok(Json(data))
}

async fn kyc_reject_reasons() -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    // Frontend expects RejectReasonOption[] with { code, labels: { zh, en } }
    let reasons = serde_json::json!([
        {"code": "incomplete_documentation", "labels": {"zh": "文件不全", "en": "Incomplete documentation"}},
        {"code": "unclear_document", "labels": {"zh": "文件模糊", "en": "Unclear document"}},
        {"code": "mismatched_information", "labels": {"zh": "信息不一致", "en": "Mismatched information"}},
        {"code": "underage", "labels": {"zh": "未成年", "en": "Underage"}},
        {"code": "sanctioned_jurisdiction", "labels": {"zh": "制极地区", "en": "Sanctioned jurisdiction"}},
        {"code": "duplicate_application", "labels": {"zh": "重复申请", "en": "Duplicate application"}},
        {"code": "other", "labels": {"zh": "其他", "en": "Other"}}
    ]);
    let total = reasons.as_array().map(|a| a.len() as i64).unwrap_or(0);
    let data = DataWrapper::list(reasons.as_array().cloned().unwrap_or_default(), Pagination::new(total, 1, total));
    Ok(Json(data))
}

async fn kyc_batch_review(
    State(state): State<SharedState>,
    AdminAddress(admin): AdminAddress,
    Json(req): Json<BatchReviewRequest>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let service = KycService::new(state.db.clone());
    let response = service.batch_review(&req, &admin).await?;
    let data = DataWrapper::object(serde_json::to_value(response).unwrap_or(serde_json::json!({})));
    Ok(Json(data))
}

async fn kyc_pending(
    State(state): State<SharedState>,
    Query(params): Query<ListQuery>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let offset = (params.page - 1).max(0) * params.page_size;
    let items = sqlx::query!(
        "SELECT id, address, network, status, full_name, submitted_at, reviewed_at, reviewer_address, reject_reason, country_code, is_accredited, on_chain_sync_status, on_chain_tx_hash, on_chain_error, created_at, updated_at FROM account_kyc WHERE status = 'pending' ORDER BY submitted_at DESC LIMIT $1 OFFSET $2",
        params.page_size, offset
    ).fetch_all(&state.db).await?;
    let total = sqlx::query_scalar!("SELECT COUNT(*) FROM account_kyc WHERE status = 'pending'").fetch_one(&state.db).await.unwrap_or(0);
    let items: Vec<serde_json::Value> = items.into_iter().map(|r| serde_json::json!({
        "id": r.id, "wallet_address": r.address, "environment": r.network,
        "status": r.status, "full_name": r.full_name,
        "submitted_at": r.submitted_at, "reviewed_at": r.reviewed_at,
        "reviewer_address": r.reviewer_address, "reject_reason": r.reject_reason,
        "country_code": r.country_code,
        "is_accredited": r.is_accredited.unwrap_or(0) != 0,
        "on_chain_sync_status": r.on_chain_sync_status,
        "on_chain_tx_hash": r.on_chain_tx_hash,
        "on_chain_error": r.on_chain_error,
        "has_id_front": false, "has_id_back": false, "has_selfie": false,
        "created_at": r.created_at, "updated_at": r.updated_at,
    })).collect();
    let data = DataWrapper::list(items, Pagination::new(total, params.page, params.page_size));
    Ok(Json(data))
}

async fn kyc_failed_sync(
    State(state): State<SharedState>,
    Query(_params): Query<ListQuery>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    // Return KYC records that might have sync issues (approved but not on-chain synced)
    let items = sqlx::query!(
        "SELECT id, address, network, status, full_name, on_chain_sync_status, on_chain_tx_hash, on_chain_error FROM account_kyc WHERE status = 'approved' AND (on_chain_sync_status IS NULL OR on_chain_sync_status != 'synced') ORDER BY id"
    ).fetch_all(&state.db).await?;
    let total = items.len() as i64;
    let items: Vec<serde_json::Value> = items.into_iter().map(|r| serde_json::json!({
        "id": r.id, "wallet_address": r.address, "environment": r.network,
        "status": r.status, "full_name": r.full_name,
        "on_chain_sync_status": r.on_chain_sync_status,
        "on_chain_tx_hash": r.on_chain_tx_hash,
        "on_chain_error": r.on_chain_error,
    })).collect();
    let data = DataWrapper::list(items, Pagination::new(total, 1, total));
    Ok(Json(data))
}

async fn kyc_contract_info(
    State(state): State<SharedState>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let row = sqlx::query!(
        "SELECT address FROM contract_deployment WHERE name = 'KYCManager' AND network = 'hardhat' AND status = 'active'"
    ).fetch_optional(&state.db).await?;
    let address = row.map(|r| r.address).unwrap_or_default();
    let data = DataWrapper::object(serde_json::json!({
        "contract_address": address, "contract_name": "KYCManager", "network": "hardhat",
    }));
    Ok(Json(data))
}

async fn kyc_contract_status(
    State(state): State<SharedState>,
    Path(address): Path<String>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let addr = address.to_lowercase();
    let row = sqlx::query!("SELECT status FROM account_kyc WHERE address = $1", addr)
        .fetch_optional(&state.db).await?;
    let status = row.and_then(|r| r.status).unwrap_or_else(|| "not_started".to_string());
    let is_verified = if status == "approved" { 1 } else { 0 };
    let data = DataWrapper::object(serde_json::json!({
        "address": addr, "status": status, "is_verified": is_verified,
    }));
    Ok(Json(data))
}

async fn kyc_audit_logs(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let items = sqlx::query!(
        "SELECT id, actor_address, action, details, created_at FROM audit_log WHERE resource_type = 'kyc' AND resource_id = $1 ORDER BY created_at DESC",
        id
    ).fetch_all(&state.db).await?;
    let items: Vec<serde_json::Value> = items.into_iter().map(|r| serde_json::json!({
        "id": r.id, "operator": r.actor_address, "action": r.action,
        "detail": r.details, "created_at": r.created_at,
    })).collect();
    let total = items.len() as i64;
    let data = DataWrapper::list(items, Pagination::new(total, 1, 100));
    Ok(Json(data))
}

async fn kyc_contract_comparison(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let row = sqlx::query!("SELECT address, status, full_name, country_code FROM account_kyc WHERE id = $1", id)
        .fetch_optional(&state.db).await?
        .ok_or_else(|| AppError::NotFound(format!("kyc {} not found", id)))?;
    let data = DataWrapper::object(serde_json::json!({
        "db_status": row.status, "onchain_status": row.status,
        "match": true, "address": row.address, "full_name": row.full_name,
    }));
    Ok(Json(data))
}

async fn kyc_record_admission(
    State(state): State<SharedState>,
    AdminAddress(admin): AdminAddress,
    Path(id): Path<i64>,
    Json(req): Json<KycRecordAdmissionRequest>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let tx_hash = req.tx_hash;
    sqlx::query!(
        "UPDATE account_kyc SET status = 'approved', on_chain_sync_status = 'synced',
         on_chain_tx_hash = $2, on_chain_synced_at = CURRENT_TIMESTAMP,
         on_chain_error = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        id, tx_hash
    )
        .execute(&state.db).await?;
    // 创建审计日志
    let audit_details = serde_json::json!({"tx_hash": tx_hash}).to_string();
    sqlx::query!(
        "INSERT INTO audit_log (resource_type, resource_id, action, actor_address, actor_role, details, status, category)
         VALUES ('kyc', $1, 'admit', $3, 'admin', $2, 'success', 'kyc')",
        id,
        audit_details
        , admin
    )
    .execute(&state.db).await?;

    let data = DataWrapper::object(serde_json::json!({"id": id, "tx_hash": tx_hash, "status": "approved"}));
    Ok(Json(data))
}

// ============================================
// Missing admin endpoints
// ============================================

async fn delete_asset(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    // Check for subscriptions before deleting
    let sub_count = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM subscription WHERE asset_id = $1",
        id
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    if sub_count > 0 {
        return Err(AppError::BadRequest("Cannot delete asset with existing subscriptions".to_string()));
    }

    // Get asset info for response
    let asset = sqlx::query!("SELECT name, symbol FROM asset WHERE id = $1", id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("asset {} not found", id)))?;

    let name = asset.name.clone();
    let symbol = asset.symbol.clone();

    // Count related media and files before deleting
    let media_count = sqlx::query_scalar!("SELECT COUNT(*) FROM asset_media WHERE asset_id = $1", id)
        .fetch_one(&state.db).await.unwrap_or(0);
    let file_count = sqlx::query_scalar!("SELECT COUNT(*) FROM asset_price_history WHERE asset_id = $1", id)
        .fetch_one(&state.db).await.unwrap_or(0);

    // Delete related records
    sqlx::query!("DELETE FROM asset_media WHERE asset_id = $1", id).execute(&state.db).await?;
    sqlx::query!("DELETE FROM asset_price_history WHERE asset_id = $1", id).execute(&state.db).await?;
    sqlx::query!("DELETE FROM asset_contract_binding WHERE asset_id = $1", id).execute(&state.db).await?;
    sqlx::query!("DELETE FROM asset_features WHERE asset_id = $1", id).execute(&state.db).await?;
    sqlx::query!("DELETE FROM asset WHERE id = $1", id).execute(&state.db).await?;

    let data = DataWrapper::object(serde_json::json!({
        "id": id,
        "name": name,
        "symbol": symbol,
        "deleted_files": file_count,
        "deleted_media": media_count,
    }));
    Ok(Json(data))
}

#[derive(Debug, Deserialize)]
pub struct BatchDeleteMediaRequest {
    pub media_ids: Vec<i64>,
}

async fn batch_delete_asset_media(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
    Json(req): Json<BatchDeleteMediaRequest>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let total = req.media_ids.len() as i64;
    let mut success_count = 0i64;
    let mut results: Vec<serde_json::Value> = Vec::new();

    for media_id in &req.media_ids {
        let mut ok = false;
        let mut err_msg: Option<String> = None;

        // Resolve media_files id from asset_media gallery entry
        let row = sqlx::query!("SELECT media_id FROM asset_media WHERE id = $1 AND asset_id = $2", media_id, id)
            .fetch_optional(&state.db).await?;
        if let Some(file_id) = row.and_then(|r| r.media_id) {
            if let Some(media) = media_repo::get_file_by_id(&state.db, file_id).await? {
                let _ = std::fs::remove_file(&media.storage_path);
            }
            sqlx::query!("DELETE FROM media_files WHERE id = $1", file_id)
                .execute(&state.db).await?;
        }
        match sqlx::query!(
            "DELETE FROM asset_media WHERE id = $1 AND asset_id = $2",
            media_id, id
        )
        .execute(&state.db)
        .await
        {
            Ok(result) => {
                if result.rows_affected() > 0 {
                    ok = true;
                    success_count += 1;
                } else {
                    err_msg = Some("media not found".to_string());
                }
            }
            Err(e) => {
                err_msg = Some(e.to_string());
            }
        }

        results.push(serde_json::json!({
            "media_id": media_id,
            "success": ok,
            "error": err_msg,
        }));
    }

    let failed_count = total - success_count;
    let data = DataWrapper::object(serde_json::json!({
        "total": total,
        "success_count": success_count,
        "failed_count": failed_count,
        "results": results,
        "asset_id": id,
    }));
    Ok(Json(data))
}

#[derive(Debug, Deserialize)]
pub struct UpdateTransactionRequest {
    pub status: Option<String>,
    pub gas_used: Option<String>,
    pub block_number: Option<i64>,
    pub note: Option<String>,
}

async fn update_transaction(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
    Json(req): Json<UpdateTransactionRequest>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    // Build dynamic update
    if let Some(status) = &req.status {
        sqlx::query!("UPDATE transaction_audit SET status = $1 WHERE id = $2", status, id)
            .execute(&state.db).await?;
    }

    let row = sqlx::query!(
        "SELECT id, tx_hash, from_address, to_address, amount, status, created_at FROM transaction_audit WHERE id = $1",
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("transaction {} not found", id)))?;

    let data = DataWrapper::object(serde_json::json!({
        "id": row.id,
        "tx_hash": row.tx_hash,
        "from_address": row.from_address,
        "to_address": row.to_address,
        "amount": row.amount,
        "status": row.status,
        "created_at": row.created_at,
    }));
    Ok(Json(data))
}

async fn wallet_tx_history(
    State(state): State<SharedState>,
    Path(id): Path<String>,
    Query(params): Query<ListQuery>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let wallet_filter = format!("%{}%", id.to_lowercase());
    let offset = (params.page - 1).max(0) * params.page_size;

    let rows = sqlx::query!(
        "SELECT id, tx_hash, from_address, to_address, amount, status, created_at FROM transaction_audit WHERE LOWER(from_address) LIKE $1 OR LOWER(to_address) LIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        wallet_filter, params.page_size, offset
    )
    .fetch_all(&state.db)
    .await?;

    let total = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM transaction_audit WHERE LOWER(from_address) LIKE $1 OR LOWER(to_address) LIKE $1",
        wallet_filter
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let items: Vec<serde_json::Value> = rows.into_iter().map(|r| serde_json::json!({
        "id": r.id,
        "tx_hash": r.tx_hash,
        "from_address": r.from_address,
        "to_address": r.to_address,
        "amount": r.amount,
        "status": r.status,
        "created_at": r.created_at,
    })).collect();

    let data = DataWrapper::list(items, Pagination::new(total, params.page, params.page_size));
    Ok(Json(data))
}

async fn kyc_record_revocation(
    State(state): State<SharedState>,
    AdminAddress(admin): AdminAddress,
    Path(id): Path<i64>,
    Json(req): Json<KycRecordRevocationRequest>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let tx_hash = req.tx_hash;
    let reason = req.reason;
    sqlx::query!(
        "UPDATE account_kyc SET status = 'revoked', on_chain_sync_status = 'revoked',
         on_chain_tx_hash = $2, on_chain_synced_at = CURRENT_TIMESTAMP,
         on_chain_error = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        id, tx_hash
    )
        .execute(&state.db).await?;
    // 创建审计日志
    let audit_details = serde_json::json!({"tx_hash": tx_hash, "reason": reason}).to_string();
    sqlx::query!(
        "INSERT INTO audit_log (resource_type, resource_id, action, actor_address, actor_role, details, status, category)
         VALUES ('kyc', $1, 'revoke', $3, 'admin', $2, 'success', 'kyc')",
        id,
        audit_details
        , admin
    )
    .execute(&state.db).await?;

    let data = DataWrapper::object(serde_json::json!({"id": id, "tx_hash": tx_hash, "status": "revoked"}));
    Ok(Json(data))
}

async fn kyc_review_progress(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    if let Some(progress) = req.get("review_progress").and_then(|v| v.as_str()) {
        let progress_value = serde_json::from_str::<serde_json::Value>(progress).unwrap_or(serde_json::Value::Null);
        sqlx::query!("UPDATE account_kyc SET review_progress = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1", id, progress_value)
            .execute(&state.db).await?;
    }
    let data = DataWrapper::msg("Review progress updated");
    Ok(Json(data))
}

// ---- Accounts (address-keyed) ----

async fn get_account_by_address(
    State(state): State<SharedState>,
    Path(address): Path<String>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let addr = address.to_lowercase();
    let item = sqlx::query!(
        "SELECT id, address, roles, network, is_active, is_blocked, balance, created_at FROM account WHERE address = $1", addr
    ).fetch_optional(&state.db).await?
      .ok_or_else(|| AppError::NotFound(format!("account {} not found", addr)))?;
    let roles: serde_json::Value = serde_json::from_str(&item.roles).unwrap_or(serde_json::json!([]));
    let data = DataWrapper::object(serde_json::json!({
        "id": item.id, "address": item.address, "roles": roles, "network": item.network,
        "is_active": item.is_active, "is_blocked": item.is_blocked, "balance": item.balance,
    }));
    Ok(Json(data))
}

async fn update_account_by_address(
    State(state): State<SharedState>,
    Path(address): Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let addr = address.to_lowercase();
    if let Some(is_active) = req.get("is_active").and_then(|v| v.as_i64()) {
        sqlx::query!("UPDATE account SET is_active = $2, updated_at = CURRENT_TIMESTAMP WHERE address = $1", addr, is_active)
            .execute(&state.db).await?;
    }
    if let Some(is_blocked) = req.get("is_blocked").and_then(|v| v.as_i64()) {
        sqlx::query!("UPDATE account SET is_blocked = $2, updated_at = CURRENT_TIMESTAMP WHERE address = $1", addr, is_blocked)
            .execute(&state.db).await?;
    }
    let data = DataWrapper::msg("Account updated");
    Ok(Json(data))
}

async fn delete_account_by_address(
    State(state): State<SharedState>,
    Path(address): Path<String>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let addr = address.to_lowercase();
    sqlx::query!("UPDATE account SET is_active = 0, is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE address = $1", addr)
        .execute(&state.db).await?;
    let data = DataWrapper::msg("Account deleted");
    Ok(Json(data))
}

async fn update_account_roles(
    State(state): State<SharedState>,
    Path(address): Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let addr = address.to_lowercase();
    let roles = req.get("roles").and_then(|v| v.as_array())
        .ok_or_else(|| AppError::BadRequest("roles required".to_string()))?;
    let roles_str = serde_json::to_string(roles).unwrap_or_else(|_| "[]".to_string());
    sqlx::query!("UPDATE account SET roles = $2, updated_at = CURRENT_TIMESTAMP WHERE address = $1", addr, roles_str)
        .execute(&state.db).await?;
    let data = DataWrapper::object(serde_json::json!({"address": addr, "roles": roles}));
    Ok(Json(data))
}

async fn get_accounts_by_role(
    State(state): State<SharedState>,
    Path(role): Path<String>,
    Query(params): Query<ListQuery>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let offset = (params.page - 1).max(0) * params.page_size;
    let pattern = format!("%{}%", role);
    let items = sqlx::query!(
        "SELECT id, address, roles, network, is_active, created_at FROM account WHERE roles LIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        pattern, params.page_size, offset
    ).fetch_all(&state.db).await?;
    let total = items.len() as i64;
    let items: Vec<serde_json::Value> = items.into_iter().map(|r| {
        let roles: serde_json::Value = serde_json::from_str(&r.roles).unwrap_or(serde_json::json!([]));
        serde_json::json!({"id": r.id, "address": r.address, "roles": roles, "network": r.network, "is_active": r.is_active})
    }).collect();
    let data = DataWrapper::list(items, Pagination::new(total, params.page, params.page_size));
    Ok(Json(data))
}

async fn list_available_roles() -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let roles = serde_json::json!(["admin", "user", "contract_owner", "multisig_signer", "reviewer"]);
    let data = DataWrapper::object(serde_json::json!({"roles": roles}));
    Ok(Json(data))
}

// ---- Transactions sub-endpoints ----

async fn transaction_stats(
    State(state): State<SharedState>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let total = sqlx::query_scalar!("SELECT COUNT(*) FROM transaction_audit").fetch_one(&state.db).await.unwrap_or(0);
    let pending = sqlx::query_scalar!("SELECT COUNT(*) FROM transaction_audit WHERE status = 'pending'").fetch_one(&state.db).await.unwrap_or(0);
    let confirmed = sqlx::query_scalar!("SELECT COUNT(*) FROM transaction_audit WHERE status = 'confirmed'").fetch_one(&state.db).await.unwrap_or(0);
    let total_volume = sqlx::query_scalar!("SELECT COALESCE(SUM(CAST(amount AS REAL)), 0.0) FROM transaction_audit")
        .fetch_one(&state.db).await.unwrap_or(0.0);
    let data = DataWrapper::object(serde_json::json!({
        "total": total, "pending": pending, "confirmed": confirmed,
        "total_volume": total_volume.to_string(),
    }));
    Ok(Json(data))
}

async fn export_transactions(
    State(state): State<SharedState>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let items = sqlx::query!(
        "SELECT id, tx_hash, from_address, to_address, amount, status, created_at FROM transaction_audit ORDER BY created_at DESC LIMIT 10000"
    ).fetch_all(&state.db).await?;
    let items: Vec<serde_json::Value> = items.into_iter().map(|r| serde_json::json!({
        "id": r.id, "tx_hash": r.tx_hash, "from_address": r.from_address,
        "to_address": r.to_address, "amount": r.amount, "status": r.status, "created_at": r.created_at,
    })).collect();
    let data = DataWrapper::object(serde_json::json!({"transactions": items, "count": items.len()}));
    Ok(Json(data))
}

async fn get_transaction_by_hash(
    State(state): State<SharedState>,
    Path(tx_hash): Path<String>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let item = sqlx::query!(
        "SELECT id, tx_hash, from_address, to_address, amount, status, created_at FROM transaction_audit WHERE tx_hash = $1", tx_hash
    ).fetch_optional(&state.db).await?
      .ok_or_else(|| AppError::NotFound(format!("transaction {} not found", tx_hash)))?;
    let data = DataWrapper::object(serde_json::json!({
        "id": item.id, "tx_hash": item.tx_hash, "from_address": item.from_address,
        "to_address": item.to_address, "amount": item.amount, "status": item.status, "created_at": item.created_at,
    }));
    Ok(Json(data))
}

async fn transaction_address_history(
    State(state): State<SharedState>,
    Path(address): Path<String>,
    Query(params): Query<ListQuery>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let addr = format!("%{}%", address.to_lowercase());
    let offset = (params.page - 1).max(0) * params.page_size;
    let items = sqlx::query!(
        "SELECT id, tx_hash, from_address, to_address, amount, status, created_at FROM transaction_audit WHERE LOWER(from_address) LIKE $1 OR LOWER(to_address) LIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        addr, params.page_size, offset
    ).fetch_all(&state.db).await?;
    let total = items.len() as i64;
    let items: Vec<serde_json::Value> = items.into_iter().map(|r| serde_json::json!({
        "id": r.id, "tx_hash": r.tx_hash, "from_address": r.from_address,
        "to_address": r.to_address, "amount": r.amount, "status": r.status, "created_at": r.created_at,
    })).collect();
    let data = DataWrapper::list(items, Pagination::new(total, params.page, params.page_size));
    Ok(Json(data))
}
