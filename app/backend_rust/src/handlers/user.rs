use axum::{
    body::Body,
    extract::{Multipart, Path, Query, Request, State},
    http::{StatusCode, header},
    response::Response,
    Json, Router,
};
use serde::Deserialize;
use sqlx::Row;

use crate::error::AppError;
use crate::middleware::auth::{self, UserAddress};
use crate::repositories::media_repo;
use crate::schemas::common::{DataWrapper, Pagination};
use crate::schemas::user::{
    CreateStakingRequest, CreateSubscriptionRequest, KycApplyRequest,
    StakingResponse, SubscriptionResponse,
};
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
        .route("/api/v1/user/auth/me", axum::routing::get(get_me))
        .route("/api/v1/user/subscriptions", axum::routing::post(create_subscription))
        .route("/api/v1/user/subscriptions", axum::routing::get(list_subscriptions))
        .route("/api/v1/user/subscriptions/{id}", axum::routing::get(get_subscription))
        .route("/api/v1/user/subscriptions/{id}/redeem", axum::routing::post(redeem_subscription))
        .route("/api/v1/user/subscriptions/pending", axum::routing::post(create_pending))
        .route("/api/v1/user/subscriptions/confirm", axum::routing::post(confirm_subscription))
        .route("/api/v1/user/subscriptions/receipt/{tx_hash}", axum::routing::get(get_receipt))
        .route("/api/v1/user/staking", axum::routing::post(create_staking))
        .route("/api/v1/user/staking", axum::routing::get(list_staking))
        .route("/api/v1/user/staking/{id}", axum::routing::get(get_staking))
        .route("/api/v1/user/staking/{id}/unstake", axum::routing::post(unstake))
        .route("/api/v1/user/staking/{id}/claim", axum::routing::post(claim_rewards))
        .route("/api/v1/user/kyc/upload-document", axum::routing::post(upload_document))
        .route("/api/v1/user/kyc/apply", axum::routing::post(apply_kyc))
        .route("/api/v1/user/media/{id}", axum::routing::get(download_media))
        // --- Missing user endpoints ---
        .route("/api/v1/user/kyc/upload-base64", axum::routing::post(upload_kyc_base64))
        .route("/api/v1/user/kyc/upload-video", axum::routing::post(upload_kyc_video))
        .route("/api/v1/user/kyc/document-url", axum::routing::get(get_kyc_document_url))
        .route("/api/v1/user/kyc/status", axum::routing::post(update_kyc_status))
        .route("/api/v1/user/staking/preview", axum::routing::post(preview_staking))
        .route("/api/v1/user/staking/stats", axum::routing::get(staking_stats))
        .route("/api/v1/user/subscriptions/stats", axum::routing::get(subscription_stats))
        .route("/api/v1/user/subscriptions/redemptions", axum::routing::get(list_redemptions))
        .route("/api/v1/user/subscriptions/redemptions/{id}", axum::routing::get(get_redemption))
        .route("/api/v1/user/subscriptions/{id}/redeem-legacy", axum::routing::post(redeem_subscription_legacy))
        .route("/api/v1/user/transactions/audit", axum::routing::post(record_user_tx_audit))
        .route("/api/v1/user/transactions/audit/my", axum::routing::get(my_tx_audit))
        .route("/api/v1/user/transactions/audit/{tx_hash}/status", axum::routing::post(update_user_tx_status))
}

async fn get_me(
    State(state): State<SharedState>,
    request: Request,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let user = auth::require_user(&request).ok_or(AppError::Unauthorized)?;

    let row = sqlx::query!(
        "SELECT id, roles, balance FROM account WHERE address = $1 AND network = 'hardhat'",
        user.address
    )
    .fetch_optional(&state.db).await?
    .ok_or_else(|| AppError::NotFound("account not found".to_string()))?;

    // roles 在 SQLite 中存储为 JSON 字符串，需要解析为数组
    let roles: serde_json::Value = serde_json::from_str(&row.roles)
        .unwrap_or(serde_json::json!(["user"]));
    let is_admin = roles.as_array()
        .map(|arr| arr.iter().any(|r| r == "admin" || r == "superadmin"))
        .unwrap_or(false);

    // 查询 KYC 状态
    let addr_lower = user.address.to_lowercase();
    let kyc_row = sqlx::query!(
        "SELECT status FROM account_kyc WHERE address = $1",
        addr_lower
    )
    .fetch_optional(&state.db)
    .await?;
    let kyc_status = kyc_row
        .and_then(|r| r.status)
        .unwrap_or_else(|| "not_started".to_string());

    let data = DataWrapper::object(serde_json::json!({
        "id": row.id,
        "address": user.address,
        "roles": roles,
        "is_admin": is_admin,
        "network": "hardhat",
        "net_type": "hardhat",
        "balance": row.balance,
        "kyc_status": kyc_status,
    }));
    Ok(Json(data))
}

// ============================================
// Missing user endpoints
// ============================================

// KYC base64 upload (simplified - stores receipt, no MinIO)
#[derive(Debug, Deserialize)]
pub struct Base64UploadRequest {
    pub image_base64: String,
    pub document_type: Option<String>,
    pub id_type: Option<String>,
    pub id_number: Option<String>,
}

async fn upload_kyc_base64(
    State(state): State<SharedState>,
    UserAddress(address): UserAddress,
    Json(req): Json<Base64UploadRequest>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let _network = "hardhat";
    let doc_type = req.document_type.unwrap_or_else(|| "selfie".to_string());

    let result = sqlx::query!(
        "INSERT INTO account_kyc_document (kyc_id, id_type, id_front_url) SELECT id, $2, $3 FROM account_kyc WHERE address = $1 ORDER BY id DESC LIMIT 1 RETURNING id",
        address, doc_type, "base64://stored"
    )
    .fetch_optional(&state.db)
    .await?;

    let data = DataWrapper::object(serde_json::json!({
        "id": result.as_ref().map(|r| r.id),
        "document_type": doc_type,
        "status": "uploaded",
    }));
    Ok(Json(data))
}

async fn upload_kyc_video(
    State(state): State<SharedState>,
    UserAddress(address): UserAddress,
    Json(_req): Json<serde_json::Value>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    // Simplified: stores a placeholder document record
    let _network = "hardhat";

    let result = sqlx::query!(
        "INSERT INTO account_kyc_document (kyc_id, id_type, id_front_url) SELECT id, 'liveness_video', 'video://stored' FROM account_kyc WHERE address = $1 ORDER BY id DESC LIMIT 1 RETURNING id",
        address
    )
    .fetch_optional(&state.db)
    .await?;

    let data = DataWrapper::object(serde_json::json!({
        "id": result.as_ref().map(|r| r.id),
        "document_type": "liveness_video",
        "status": "uploaded",
    }));
    Ok(Json(data))
}

async fn get_kyc_document_url(
    State(state): State<SharedState>,
    UserAddress(address): UserAddress,
    Query(_params): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let network = "hardhat";

    let docs = sqlx::query!(
        "SELECT d.id, d.id_type, d.id_front_url, d.id_back_url, k.status FROM account_kyc_document d JOIN account_kyc k ON d.kyc_id = k.id WHERE k.address = $1 AND k.network = $2 ORDER BY d.created_at DESC",
        address, network
    )
    .fetch_all(&state.db)
    .await?;

    let items: Vec<serde_json::Value> = docs.into_iter().map(|d| serde_json::json!({
        "id": d.id,
        "id_type": d.id_type,
        "front_url": d.id_front_url,
        "back_url": d.id_back_url,
        "kyc_status": d.status,
    })).collect();

    let data = DataWrapper::object(serde_json::json!({ "documents": items }));
    Ok(Json(data))
}

#[derive(Debug, Deserialize)]
pub struct KycStatusUpdate {
    pub target_status: String,
}

async fn update_kyc_status(
    State(state): State<SharedState>,
    UserAddress(address): UserAddress,
    Json(req): Json<KycStatusUpdate>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let network = "hardhat";

    if req.target_status != "not_started" {
        return Err(AppError::BadRequest("Users can only reset status to not_started when current status is rejected".to_string()));
    }

    sqlx::query!(
        "UPDATE account_kyc SET status = 'not_started', updated_at = CURRENT_TIMESTAMP WHERE address = $1 AND network = $2 AND status = 'rejected'",
        address, network
    )
    .execute(&state.db)
    .await?;

    let data = DataWrapper::object(serde_json::json!({ "status": req.target_status }));
    Ok(Json(data))
}

#[derive(Debug, Deserialize)]
pub struct StakingPreviewRequest {
    pub subscription_id: Option<i64>,
    pub amount: String,
    pub period: i64,
}

async fn preview_staking(
    State(_state): State<SharedState>,
    Json(req): Json<StakingPreviewRequest>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    // Calculate expected rewards based on period
    let multiplier = match req.period {
        15 => 1.0_f64,
        30 => 2.5_f64,
        45 => 4.5_f64,
        60 => 7.0_f64,
        _ => 1.0_f64,
    };

    let amount: f64 = req.amount.parse().unwrap_or(0.0);
    let daily_rate = 0.0005_f64; // 0.05% daily base rate
    let expected_rewards = amount * multiplier * daily_rate * req.period as f64;

    let data = DataWrapper::object(serde_json::json!({
        "amount": req.amount,
        "period": req.period,
        "multiplier": multiplier.to_string(),
        "daily_rate": daily_rate.to_string(),
        "expected_rewards": expected_rewards.to_string(),
        "end_date": chrono::Utc::now() + chrono::Duration::days(req.period),
    }));
    Ok(Json(data))
}

async fn staking_stats(
    State(state): State<SharedState>,
    UserAddress(address): UserAddress,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {

    let total_staked = sqlx::query_scalar!(
        "SELECT COALESCE(SUM(CAST(amount AS REAL)), 0.0) FROM staking_record WHERE wallet_address = $1",
        address
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0.0);

    let total_claimed = sqlx::query_scalar!(
        "SELECT COALESCE(SUM(CAST(claimed_rewards AS REAL)), 0.0) FROM staking_record WHERE wallet_address = $1",
        address
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0.0);

    let active_count = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM staking_record WHERE wallet_address = $1 AND status = 'active'",
        address
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let data = DataWrapper::object(serde_json::json!({
        "total_staked": total_staked.to_string(),
        "total_claimed": total_claimed.to_string(),
        "active_count": active_count,
    }));
    Ok(Json(data))
}

async fn subscription_stats(
    State(state): State<SharedState>,
    UserAddress(address): UserAddress,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {

    let total_subscriptions = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM subscription WHERE wallet_address = $1",
        address
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let active_subscriptions = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM subscription WHERE wallet_address = $1 AND status = 'active'",
        address
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let total_invested: f64 = sqlx::query_scalar!(
        "SELECT COALESCE(SUM(CAST(amount AS REAL)), 0.0) FROM subscription WHERE wallet_address = $1 AND status = 'active'",
        address
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0.0);

    let total_earnings: f64 = sqlx::query_scalar!(
        "SELECT COALESCE(SUM(CAST(expected_interest AS REAL)), 0.0) FROM subscription WHERE wallet_address = $1 AND status = 'active'",
        address
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0.0);

    let data = DataWrapper::object(serde_json::json!({
        "total_invested": total_invested,
        "total_value": total_invested + total_earnings,
        "total_earnings": total_earnings,
        "active_subscriptions": active_subscriptions,
        "total_subscriptions": total_subscriptions,
    }));
    Ok(Json(data))
}

async fn list_redemptions(
    State(state): State<SharedState>,
    UserAddress(address): UserAddress,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {

    let rows = sqlx::query!(
        "SELECT rr.id, rr.subscription_id, rr.wallet_address, rr.amount, rr.status, rr.created_at, rr.updated_at FROM redemption_request rr WHERE rr.wallet_address = $1 ORDER BY rr.created_at DESC",
        address
    )
    .fetch_all(&state.db)
    .await?;

    let items: Vec<serde_json::Value> = rows.into_iter().map(|r| serde_json::json!({
        "id": r.id,
        "subscription_id": r.subscription_id,
        "wallet_address": r.wallet_address,
        "amount": r.amount,
        "status": r.status,
        "created_at": r.created_at,
        "updated_at": r.updated_at,
    })).collect();

    let data = DataWrapper::object(serde_json::json!({ "redemptions": items, "count": items.len() }));
    Ok(Json(data))
}

async fn get_redemption(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let row = sqlx::query!(
        "SELECT id, subscription_id, wallet_address, amount, status, created_at, updated_at FROM redemption_request WHERE id = $1",
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("redemption {} not found", id)))?;

    let data = DataWrapper::object(serde_json::json!({
        "id": row.id,
        "subscription_id": row.subscription_id,
        "wallet_address": row.wallet_address,
        "amount": row.amount,
        "status": row.status,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }));
    Ok(Json(data))
}

async fn redeem_subscription_legacy(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let tx_hash = req.get("tx_hash").and_then(|v| v.as_str()).unwrap_or("legacy_redeem");

    sqlx::query!(
        "UPDATE subscription SET status = 'redeemed', redeem_tx_hash = $1, redeemed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND status = 'active'",
        tx_hash, id
    )
    .execute(&state.db)
    .await?;

    let data = DataWrapper::object(serde_json::json!({
        "subscription_id": id,
        "status": "redeemed",
        "tx_hash": tx_hash,
    }));
    Ok(Json(data))
}

// User transaction audit endpoints
#[derive(Debug, Deserialize)]
pub struct TxAuditRecord {
    pub tx_hash: String,
    pub tx_type: Option<String>,
    pub from_address: Option<String>,
    pub to_address: Option<String>,
    #[serde(alias = "value")]
    pub amount: Option<String>,
    pub status: Option<String>,
    pub network: Option<String>,
    pub chain_id: Option<i64>,
}

async fn record_user_tx_audit(
    State(state): State<SharedState>,
    UserAddress(from): UserAddress,
    Json(req): Json<TxAuditRecord>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let tx_type = req.tx_type.as_deref().unwrap_or("transfer");
    let to = req.to_address.as_deref().unwrap_or("");
    let amount = req.amount.as_deref().unwrap_or("0");
    let status = req.status.as_deref().unwrap_or("pending");
    let network = req.network.as_deref().unwrap_or("hardhat");

    let result = sqlx::query!(
        "INSERT INTO transaction_audit (tx_hash, tx_type, from_address, to_address, amount, status, network, environment) VALUES ($1, $2, $3, $4, $5, $6, $7, $7) RETURNING id",
        req.tx_hash, tx_type, from, to, amount, status, network
    )
    .fetch_one(&state.db)
    .await?;

    let row = sqlx::query!(
        "SELECT id, tx_hash, tx_type, from_address, to_address, amount, status, network, created_at FROM transaction_audit WHERE id = $1",
        result.id
    )
    .fetch_one(&state.db)
    .await?;

    let data = DataWrapper::object(serde_json::json!({
        "id": row.id,
        "tx_hash": row.tx_hash,
        "tx_type": row.tx_type,
        "from_address": row.from_address,
        "to_address": row.to_address,
        "amount": row.amount,
        "status": row.status,
        "network": row.network,
        "created_at": row.created_at,
    }));
    Ok(Json(data))
}

async fn my_tx_audit(
    State(state): State<SharedState>,
    UserAddress(address): UserAddress,
    Query(params): Query<ListQuery>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let offset = (params.page - 1).max(0) * params.page_size;

    let rows = sqlx::query!(
        "SELECT id, tx_hash, tx_type, from_address, to_address, amount, status, created_at FROM transaction_audit WHERE from_address = $1 OR to_address = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        address, params.page_size, offset
    )
    .fetch_all(&state.db)
    .await?;

    let total = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM transaction_audit WHERE from_address = $1 OR to_address = $1",
        address
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let items: Vec<serde_json::Value> = rows.into_iter().map(|r| serde_json::json!({
        "id": r.id,
        "tx_hash": r.tx_hash,
        "tx_type": r.tx_type,
        "from_address": r.from_address,
        "to_address": r.to_address,
        "amount": r.amount,
        "status": r.status,
        "created_at": r.created_at,
    })).collect();

    let data = DataWrapper::list(items, Pagination::new(total, params.page, params.page_size));
    Ok(Json(data))
}

#[derive(Debug, Deserialize)]
pub struct TxStatusUpdate {
    pub status: String,
    pub block_number: Option<i64>,
    pub gas_used: Option<i64>,
    pub effective_gas_price: Option<String>,
    pub error_message: Option<String>,
}

async fn update_user_tx_status(
    State(state): State<SharedState>,
    Path(tx_hash): Path<String>,
    Json(req): Json<TxStatusUpdate>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    // Convert gas_used (i64 from frontend) to String for TEXT column
    let gas_used_str = req.gas_used.map(|g| g.to_string());

    // Use runtime query (not macro) to avoid compile-time DB schema dependency
    sqlx::query(
        "UPDATE transaction_audit SET status = $1, block_number = $2, gas_used = $3, gas_price = $4, error_message = $5, updated_at = CURRENT_TIMESTAMP WHERE tx_hash = $6",
    )
    .bind(&req.status)
    .bind(req.block_number)
    .bind(&gas_used_str)
    .bind(&req.effective_gas_price)
    .bind(&req.error_message)
    .bind(&tx_hash)
    .execute(&state.db)
    .await?;

    // Return updated record
    let row = sqlx::query(
        "SELECT id, tx_hash, tx_type, from_address, to_address, amount, status, network, block_number, gas_used, gas_price, error_message, created_at, updated_at FROM transaction_audit WHERE tx_hash = $1",
    )
    .bind(&tx_hash)
    .fetch_optional(&state.db)
    .await?;

    if let Some(r) = row {
        let id: i64 = r.get("id");
        let r_tx_hash: String = r.get("tx_hash");
        let r_tx_type: Option<String> = r.get("tx_type");
        let r_from: Option<String> = r.get("from_address");
        let r_to: Option<String> = r.get("to_address");
        let r_amount: Option<String> = r.get("amount");
        let r_status: String = r.get("status");
        let r_network: Option<String> = r.get("network");
        let r_block_number: Option<i64> = r.get("block_number");
        let r_gas_used: Option<String> = r.get("gas_used");
        let r_gas_price: Option<String> = r.get("gas_price");
        let r_error_message: Option<String> = r.get("error_message");
        let r_created_at: chrono::NaiveDateTime = r.get("created_at");
        let r_updated_at: chrono::NaiveDateTime = r.get("updated_at");

        let data = DataWrapper::object(serde_json::json!({
            "id": id,
            "tx_hash": r_tx_hash,
            "tx_type": r_tx_type,
            "from_address": r_from,
            "to_address": r_to,
            "amount": r_amount,
            "status": r_status,
            "network": r_network,
            "block_number": r_block_number,
            "gas_used": r_gas_used,
            "gas_price": r_gas_price,
            "error_message": r_error_message,
            "created_at": r_created_at,
            "updated_at": r_updated_at,
        }));
        return Ok(Json(data));
    }

    let data = DataWrapper::object(serde_json::json!({
        "tx_hash": tx_hash,
        "status": req.status,
    }));
    Ok(Json(data))
}

async fn create_subscription(
    State(state): State<SharedState>,
    UserAddress(wallet_address): UserAddress,
    Json(req): Json<CreateSubscriptionRequest>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let now = chrono::Utc::now().naive_utc();
    let asset = sqlx::query!(
        "SELECT id, current_price, total_supply, subscribed_amount, min_subscription, subscription_start_at, subscription_end_at, status, apy_3m, apy_6m, apy_12m FROM asset WHERE id = $1",
        req.asset_id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("asset {} not found", req.asset_id)))?;

    if asset.status != "active" {
        return Err(AppError::BadRequest("Asset is not available for subscription".to_string()));
    }

    // time window
    if let Some(start) = asset.subscription_start_at {
        if now < start {
            return Err(AppError::BadRequest("Subscription has not started yet".to_string()));
        }
    }
    if let Some(end) = asset.subscription_end_at {
        if now >= end {
            return Err(AppError::BadRequest("Subscription period has ended".to_string()));
        }
    }

    let amount_f: f64 = req.amount;
    if amount_f <= 0.0 {
        return Err(AppError::BadRequest("Invalid subscription amount".to_string()));
    }

    let min_sub: f64 = asset.min_subscription.parse().unwrap_or(0.0);
    if amount_f < min_sub {
        return Err(AppError::BadRequest(format!("Minimum subscription amount is {}", asset.min_subscription)));
    }

    let total_supply: f64 = asset.total_supply.parse().unwrap_or(0.0);
    let subscribed: f64 = asset.subscribed_amount.parse().unwrap_or(0.0);
    let remaining = total_supply - subscribed;
    if amount_f > remaining {
        return Err(AppError::BadRequest(format!("Subscription amount exceeds remaining supply ({remaining})", remaining = remaining)));
    }

    // KYC check
    let kyc_row = sqlx::query!(
        "SELECT status FROM account_kyc WHERE address = $1 AND network = 'hardhat' ORDER BY id DESC LIMIT 1",
        wallet_address
    )
    .fetch_optional(&state.db)
    .await?;
    let kyc_status = kyc_row.and_then(|r| r.status).unwrap_or_else(|| "not_started".to_string());
    if kyc_status != "approved" {
        return Err(AppError::BadRequest("KYC approval required".to_string()));
    }

    // Note: Balance check is handled on-chain via MetaMask.
    // The smart contract will revert if the user has insufficient token balance.

    let apy = match req.lock_period {
        3 => asset.apy_3m,
        6 => asset.apy_6m,
        12 => asset.apy_12m,
        _ => asset.apy_3m,
    };

    let apy_f: f64 = apy.parse().unwrap_or(0.0);
    let months = req.lock_period.max(0);
    let expected_interest = if months == 0 {
        amount_f * (apy_f / 100.0) * (1.0 / 12.0)
    } else {
        amount_f * (apy_f / 100.0) * (months as f64 / 12.0)
    };

    let current_price: f64 = asset.current_price.parse().unwrap_or(0.0);
    let rwa_token_amount = if current_price > 0.0 {
        amount_f / current_price
    } else {
        amount_f
    };

    let start_date = now;
    let end_date = if months == 0 {
        start_date
    } else {
        start_date + chrono::Duration::days(months as i64 * 30)
    };

    let status = if req.tx_hash.is_some() { "active" } else { "pending" };
    let tx_hash: Option<String> = req.tx_hash.clone();
    let rwa_token_amount_str = rwa_token_amount.to_string();
    let expected_interest_str = expected_interest.to_string();
    let amount_str = req.amount.to_string();

    let result = sqlx::query!(
        "INSERT INTO subscription (wallet_address, asset_id, amount, token_type, lock_period, apy, rwa_token_amount, start_date, end_date, original_end_date, expected_interest, tx_hash, status, environment) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10, $11, $12, $13) RETURNING id",
        wallet_address,
        req.asset_id,
        amount_str,
        req.token_type,
        req.lock_period,
        apy,
        rwa_token_amount_str,
        start_date,
        end_date,
        expected_interest_str,
        tx_hash,
        status,
        "hardhat"
    )
    .fetch_one(&state.db)
    .await?;

    if status == "active" {
        // Update subscribed amount
        let new_subscribed = (subscribed + amount_f).to_string();
        sqlx::query!(
            "UPDATE asset SET subscribed_amount = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            new_subscribed,
            req.asset_id
        )
        .execute(&state.db)
        .await?;
    }

    let data = DataWrapper::object(serde_json::json!({
        "id": result.id,
        "order_id": result.id.to_string(),
        "status": status,
        "expires_at": (now + chrono::Duration::minutes(30)).format("%Y-%m-%dT%H:%M:%SZ").to_string(),
        "message": if status == "active" { "Subscription created" } else { "Subscription created, awaiting confirmation" }
    }));
    Ok(Json(data))
}

async fn list_subscriptions(
    State(state): State<SharedState>,
    UserAddress(wallet_address): UserAddress,
    Query(params): Query<ListQuery>,
) -> Result<Json<DataWrapper<SubscriptionResponse>>, AppError> {
    let offset = (params.page - 1).max(0) * params.page_size;

    let items = sqlx::query_as!(
        SubscriptionResponse,
        r#"
        SELECT s.id, s.wallet_address, s.asset_id,
        a.name as "asset_name?", a.symbol as "asset_symbol?",
        CAST(s.amount AS REAL) as "amount?: f64",
        s.token_type, s.lock_period,
        CAST(s.apy AS REAL) as "apy?: f64",
        CAST(s.rwa_token_amount AS REAL) as "rwa_token_amount?: f64",
        s.start_date, s.end_date,
        CAST(s.expected_interest AS REAL) as "expected_interest?: f64",
        CAST(s.actual_interest AS REAL) as "actual_interest?: f64",
        CAST(CAST(s.expected_interest AS REAL) + CAST(s.amount AS REAL) AS REAL) as "total_return?: f64",
        CAST(
            CASE
                WHEN s.lock_period = 0 THEN 0
                WHEN s.end_date IS NULL THEN 0
                ELSE CAST(julianday(s.end_date) - julianday('now') AS INTEGER)
            END AS INTEGER
        ) as "days_remaining?: i64",
        CAST(
            CASE WHEN s.lock_period > 0 AND s.end_date IS NOT NULL AND s.end_date < datetime('now') THEN 1 ELSE 0 END
            AS INTEGER
        ) as "is_matured?: i64",
        s.tx_hash, s.redeem_tx_hash, s.status, s.environment,
        s.created_at, s.updated_at
        FROM subscription s
        LEFT JOIN asset a ON s.asset_id = a.id
        WHERE s.wallet_address = $1 AND s.environment = 'hardhat'
        ORDER BY s.created_at DESC
        LIMIT $2 OFFSET $3
        "#,
        wallet_address,
        params.page_size,
        offset
    )
    .fetch_all(&state.db)
    .await?;

    let total = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM subscription WHERE wallet_address = $1 AND environment = 'hardhat'",
        wallet_address
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let pagination = Pagination::new(total, params.page, params.page_size);
    let data = DataWrapper::list(items, pagination);
    Ok(Json(data))
}

async fn get_subscription(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Json<DataWrapper<SubscriptionResponse>>, AppError> {
    let item = sqlx::query_as!(
        SubscriptionResponse,
        r#"
        SELECT s.id, s.wallet_address, s.asset_id,
        a.name as "asset_name?", a.symbol as "asset_symbol?",
        CAST(s.amount AS REAL) as "amount?: f64",
        s.token_type, s.lock_period,
        CAST(s.apy AS REAL) as "apy?: f64",
        CAST(s.rwa_token_amount AS REAL) as "rwa_token_amount?: f64",
        s.start_date, s.end_date,
        CAST(s.expected_interest AS REAL) as "expected_interest?: f64",
        CAST(s.actual_interest AS REAL) as "actual_interest?: f64",
        CAST(CAST(s.expected_interest AS REAL) + CAST(s.amount AS REAL) AS REAL) as "total_return?: f64",
        CAST(
            CASE
                WHEN s.lock_period = 0 THEN 0
                WHEN s.end_date IS NULL THEN 0
                ELSE CAST(julianday(s.end_date) - julianday('now') AS INTEGER)
            END AS INTEGER
        ) as "days_remaining?: i64",
        CAST(
            CASE WHEN s.lock_period > 0 AND s.end_date IS NOT NULL AND s.end_date < datetime('now') THEN 1 ELSE 0 END
            AS INTEGER
        ) as "is_matured?: i64",
        s.tx_hash, s.redeem_tx_hash, s.status, s.environment,
        s.created_at, s.updated_at
        FROM subscription s
        LEFT JOIN asset a ON s.asset_id = a.id
        WHERE s.id = $1
        "#,
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("subscription {} not found", id)))?;

    let data = DataWrapper::object(item);
    Ok(Json(data))
}

async fn redeem_subscription(
    State(state): State<SharedState>,
    UserAddress(wallet_address): UserAddress,
    Path(id): Path<i64>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let sub = sqlx::query!(
        "SELECT id, wallet_address, amount, status, end_date FROM subscription WHERE id = $1",
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("subscription {} not found", id)))?;

    if sub.wallet_address != wallet_address {
        return Err(AppError::Forbidden);
    }

    if sub.status == "redeemed" {
        return Err(AppError::BadRequest("Subscription already redeemed".to_string()));
    }

    if sub.status != "active" && sub.status != "matured" {
        return Err(AppError::BadRequest("Subscription cannot be redeemed in current status".to_string()));
    }

    let now = chrono::Utc::now().naive_utc();
    if let Some(end) = sub.end_date {
        if now < end {
            return Err(AppError::BadRequest("Subscription has not matured yet".to_string()));
        }
    }

    // Create redemption request
    sqlx::query!(
        "INSERT INTO redemption_request (subscription_id, wallet_address, amount) VALUES ($1, $2, $3)",
        id,
        wallet_address,
        sub.amount
    )
    .execute(&state.db)
    .await?;

    sqlx::query!(
        "UPDATE subscription SET status = 'redeemed', redeemed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        id
    )
    .execute(&state.db)
    .await?;

    let data = DataWrapper::msg("Redemption initiated");
    Ok(Json(data))
}

async fn create_pending(
    State(state): State<SharedState>,
    UserAddress(wallet_address): UserAddress,
    Json(mut req): Json<CreateSubscriptionRequest>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    // Ensure no tx_hash so it remains pending; same validation as create_subscription
    req.tx_hash = None;
    create_subscription(State(state), UserAddress(wallet_address), Json(req)).await
}

async fn confirm_subscription(
    State(state): State<SharedState>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let tx_hash = req.get("tx_hash")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| AppError::BadRequest("tx_hash required".to_string()))?;

    // Accept both "subscription_id" (i64) and "order_id" (string or i64) for compatibility
    let subscription_id = req.get("subscription_id")
        .and_then(|v| v.as_i64())
        .or_else(|| {
            req.get("order_id")
                .and_then(|v| {
                    v.as_i64()
                        .or_else(|| v.as_str().and_then(|s| s.parse::<i64>().ok()))
                })
        })
        .ok_or_else(|| AppError::BadRequest("subscription_id required".to_string()))?;

    // Load the pending subscription
    let sub = sqlx::query!(
        "SELECT id, wallet_address, asset_id, amount, lock_period, status FROM subscription WHERE id = $1 AND status = 'pending'",
        subscription_id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Subscription not found or not in pending status".to_string()))?;

    let amount_f: f64 = sub.amount.parse().unwrap_or(0.0);
    let asset = sqlx::query!(
        "SELECT current_price, total_supply, subscribed_amount, apy_3m, apy_6m, apy_12m FROM asset WHERE id = $1",
        sub.asset_id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("asset {} not found", sub.asset_id)))?;

    let apy = match sub.lock_period {
        3 => asset.apy_3m,
        6 => asset.apy_6m,
        12 => asset.apy_12m,
        _ => asset.apy_3m,
    };
    let apy_f: f64 = apy.parse().unwrap_or(0.0);
    let months = sub.lock_period.max(0);
    let expected_interest = if months == 0 {
        amount_f * (apy_f / 100.0) * (1.0 / 12.0)
    } else {
        amount_f * (apy_f / 100.0) * (months as f64 / 12.0)
    };

    let current_price: f64 = asset.current_price.parse().unwrap_or(0.0);
    let rwa_token_amount = if current_price > 0.0 {
        amount_f / current_price
    } else {
        amount_f
    };

    let start_date = chrono::Utc::now().naive_utc();
    let end_date = if months == 0 {
        start_date
    } else {
        start_date + chrono::Duration::days(months as i64 * 30)
    };
    let rwa_token_amount_str = rwa_token_amount.to_string();
    let expected_interest_str = expected_interest.to_string();

    let result = sqlx::query!(
        "UPDATE subscription SET status = 'active', start_date = $1, end_date = $2, original_end_date = $2, apy = $3, rwa_token_amount = $4, expected_interest = $5, tx_hash = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 AND status = 'pending'",
        start_date,
        end_date,
        apy,
        rwa_token_amount_str,
        expected_interest_str,
        tx_hash,
        subscription_id
    )
    .execute(&state.db)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Subscription not found or not in pending status".to_string()));
    }

    // Update asset subscribed amount
    let subscribed: f64 = asset.subscribed_amount.parse().unwrap_or(0.0);
    let new_subscribed = (subscribed + amount_f).to_string();
    sqlx::query!(
        "UPDATE asset SET subscribed_amount = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        new_subscribed,
        sub.asset_id
    )
    .execute(&state.db)
    .await?;

    let data = DataWrapper::msg("Subscription confirmed");
    Ok(Json(data))
}

async fn get_receipt(
    State(state): State<SharedState>,
    Path(tx_hash): Path<String>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let item = sqlx::query!(
        "SELECT id, status, tx_hash FROM subscription WHERE tx_hash = $1",
        tx_hash
    )
    .fetch_optional(&state.db)
    .await?;

    let data = match item {
        Some(row) => DataWrapper::object(serde_json::json!({
            "id": row.id,
            "status": row.status,
            "tx_hash": row.tx_hash
        })),
        None => DataWrapper::object(serde_json::json!({"status": "pending"})),
    };
    Ok(Json(data))
}

async fn create_staking(
    State(state): State<SharedState>,
    UserAddress(wallet_address): UserAddress,
    Json(req): Json<CreateStakingRequest>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let now = chrono::Utc::now().naive_utc();
    let end_date = now + chrono::Duration::days(req.period as i64);
    let amount_str = req.amount.to_string();
    let multiplier = match req.period {
        15 => "1.0",
        30 => "2.5",
        45 => "4.5",
        60 => "7.0",
        _ => "1.0",
    }.to_string();

    let result = sqlx::query!(
        "INSERT INTO staking_record (wallet_address, subscription_id, amount, period, multiplier, start_date, end_date, status, environment) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id",
        wallet_address,
        req.subscription_id,
        amount_str,
        req.period,
        multiplier,
        now,
        end_date,
        "active",
        "hardhat"
    )
    .fetch_one(&state.db)
    .await?;

    let data = DataWrapper::object(serde_json::json!({
        "id": result.id,
        "status": "active",
        "message": "Staking created successfully"
    }));
    Ok(Json(data))
}

async fn list_staking(
    State(state): State<SharedState>,
    UserAddress(wallet_address): UserAddress,
    Query(params): Query<ListQuery>,
) -> Result<Json<DataWrapper<StakingResponse>>, AppError> {
    let offset = (params.page - 1).max(0) * params.page_size;

    let items = sqlx::query_as!(
        StakingResponse,
        r#"
        SELECT id, wallet_address, subscription_id, amount, period, multiplier,
        start_date, end_date, expected_rewards, claimed_rewards, status, created_at
        FROM staking_record
        WHERE wallet_address = $1 AND environment = 'hardhat'
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
        wallet_address,
        params.page_size,
        offset
    )
    .fetch_all(&state.db)
    .await?;

    let total = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM staking_record WHERE wallet_address = $1 AND environment = 'hardhat'",
        wallet_address
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let pagination = Pagination::new(total, params.page, params.page_size);
    let data = DataWrapper::list(items, pagination);
    Ok(Json(data))
}

async fn get_staking(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Json<DataWrapper<StakingResponse>>, AppError> {
    let item = sqlx::query_as!(
        StakingResponse,
        r#"
        SELECT id, wallet_address, subscription_id, amount, period, multiplier,
        start_date, end_date, expected_rewards, claimed_rewards, status, created_at
        FROM staking_record
        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("staking {} not found", id)))?;

    let data = DataWrapper::object(item);
    Ok(Json(data))
}

async fn unstake(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    sqlx::query!(
        "UPDATE staking_record SET status = 'completed', unstake_tx_hash = $2 WHERE id = $1",
        id,
        "0xplaceholder"
    )
    .execute(&state.db)
    .await?;

    let data = DataWrapper::msg("Unstaked successfully");
    Ok(Json(data))
}

async fn claim_rewards(
    State(state): State<SharedState>,
    UserAddress(wallet_address): UserAddress,
    Path(id): Path<i64>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {

    sqlx::query!(
        "INSERT INTO reward_claim (wallet_address, staking_record_id, amount, environment) VALUES ($1, $2, $3, $4)",
        wallet_address,
        id,
        "0",
        "hardhat"
    )
    .execute(&state.db)
    .await?;

    let data = DataWrapper::msg("Rewards claimed");
    Ok(Json(data))
}

async fn upload_document(
    State(state): State<SharedState>,
    UserAddress(owner_address): UserAddress,
    mut multipart: Multipart,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let storage_dir = "data/files";

    let mut saved = None;
    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        let name = field.name().unwrap_or("file").to_string();
        if name == "file" || name == "document" {
            let file_name = field.file_name().unwrap_or("upload.bin").to_string();
            let mime_type = field.content_type().map(|s| s.to_string());
            let data = field.bytes().await.map_err(|e| AppError::BadRequest(e.to_string()))?;
            let media = media_repo::save_file(&state.db, &owner_address, &file_name, mime_type.as_deref(), &data, storage_dir).await?;
            saved = Some(media);
            break;
        }
    }

    match saved {
        Some(media) => {
            let data = DataWrapper::object(serde_json::json!({
                "id": media.id,
                "url": format!("/api/v1/user/media/{}", media.id),
                "file_name": media.file_name,
                "file_size": media.file_size
            }));
            Ok(Json(data))
        }
        None => Err(AppError::BadRequest("no file uploaded".to_string())),
    }
}

async fn download_media(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Response, AppError> {
    match media_repo::get_file_by_id(&state.db, id).await? {
        Some(media) => {
            let bytes = std::fs::read(&media.storage_path)?;
            let mut builder = Response::builder().status(StatusCode::OK);
            let mime = media.mime_type.as_deref().unwrap_or("application/octet-stream");
            builder = builder.header(header::CONTENT_TYPE, mime);
            // Use "inline" for images so browsers display them in <img> tags;
            // use "attachment" for other file types to trigger download.
            let disposition = if mime.starts_with("image/") {
                "inline"
            } else {
                "attachment"
            };
            builder = builder.header(
                header::CONTENT_DISPOSITION,
                format!(r#"{}; filename="{}""#, disposition, media.file_name),
            );
            Ok(builder.body(Body::from(bytes)).unwrap())
        }
        None => Err(AppError::NotFound(format!("media {} not found", id))),
    }
}

async fn apply_kyc(
    State(state): State<SharedState>,
    UserAddress(address): UserAddress,
    Json(req): Json<KycApplyRequest>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let network = "hardhat";

    let result = sqlx::query!(
        "INSERT INTO account_kyc (address, network, status, full_name, date_of_birth, email, phone, address_line1, city, state, postal_code, residence_country) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT (address, network) DO UPDATE SET status = 'pending', full_name = EXCLUDED.full_name RETURNING id",
        address,
        network,
        "pending",
        req.full_name,
        req.date_of_birth,
        req.email,
        req.phone,
        req.address_line1,
        req.city,
        req.state,
        req.postal_code,
        req.residence_country
    )
    .fetch_one(&state.db)
    .await?;

    let data = DataWrapper::object(serde_json::json!({
        "id": result.id,
        "status": "pending",
        "message": "KYC application submitted"
    }));
    Ok(Json(data))
}
