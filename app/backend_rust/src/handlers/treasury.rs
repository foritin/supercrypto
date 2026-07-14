use axum::{
    extract::{Path, Query, State},
    Json, Router,
};
use serde::Deserialize;

use crate::error::AppError;
use crate::schemas::common::{ApiResponse, DataWrapper, Pagination};
use crate::state::SharedState;

#[derive(Debug, Deserialize)]
pub struct ListQuery {
    #[serde(default = "default_page")]
    page: i64,
    #[serde(default = "default_page_size")]
    page_size: i64,
    status: Option<String>,
}

fn default_page() -> i64 { 1 }
fn default_page_size() -> i64 { 10 }

pub fn routes() -> Router<SharedState> {
    Router::new()
        .route("/api/v1/admin/treasury/queue", axum::routing::get(list_queue))
        .route("/api/v1/admin/treasury/queue/{id}", axum::routing::get(get_queue_item))
        .route("/api/v1/admin/treasury/queue/{id}/sign", axum::routing::post(sign_queue))
        .route("/api/v1/admin/treasury/queue/{id}/execute", axum::routing::post(execute_queue))
        .route("/api/v1/admin/treasury/queue/{id}/reject", axum::routing::post(reject_queue))
        .route("/api/v1/admin/treasury/multisig/status", axum::routing::get(multisig_status))
        .route("/api/v1/admin/treasury/stats", axum::routing::get(treasury_stats))
}

async fn list_queue(
    State(state): State<SharedState>,
    Query(params): Query<ListQuery>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let offset = (params.page - 1).max(0) * params.page_size;
    let status_filter = params.status.as_deref().unwrap_or("%");
    let items = sqlx::query!(
        "SELECT id, subscription_id, wallet_address, amount, status, created_at, updated_at
         FROM redemption_request WHERE status LIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        status_filter, params.page_size, offset
    )
    .fetch_all(&state.db).await?;

    let total = sqlx::query_scalar!("SELECT COUNT(*) FROM redemption_request WHERE status LIKE $1", status_filter)
        .fetch_one(&state.db).await.unwrap_or(0);

    let items: Vec<serde_json::Value> = items.into_iter().map(|r| serde_json::json!({
        "id": r.id,
        "subscription_id": r.subscription_id,
        "investor_address": r.wallet_address,
        "amount": r.amount,
        "status": r.status,
        "created_at": r.created_at,
        "updated_at": r.updated_at,
    })).collect();

    let data = DataWrapper::list(items, Pagination::new(total, params.page, params.page_size));
    Ok(Json(ApiResponse::ok(data)))
}

async fn get_queue_item(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let row = sqlx::query!(
        "SELECT id, subscription_id, wallet_address, amount, status, created_at, updated_at
         FROM redemption_request WHERE id = $1", id
    )
    .fetch_optional(&state.db).await?
    .ok_or_else(|| AppError::NotFound(format!("redemption {} not found", id)))?;

    let data = DataWrapper::object(serde_json::json!({
        "id": row.id, "subscription_id": row.subscription_id,
        "investor_address": row.wallet_address,
        "amount": row.amount, "status": row.status,
        "created_at": row.created_at, "updated_at": row.updated_at,
    }));
    Ok(Json(ApiResponse::ok(data)))
}

async fn sign_queue(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let signer = req.get("signer").and_then(|v| v.as_str())
        .ok_or_else(|| AppError::BadRequest("signer required".to_string()))?;
    let signature = req.get("signature").and_then(|v| v.as_str())
        .ok_or_else(|| AppError::BadRequest("signature required".to_string()))?;

    tracing::info!(id = id, signer = signer, "Treasury queue sign");

    let data = DataWrapper::object(serde_json::json!({
        "id": id, "status": "signed", "signer": signer, "signature": signature
    }));
    Ok(Json(ApiResponse::ok(data)))
}

async fn execute_queue(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    sqlx::query!(
        "UPDATE redemption_request SET status = 'executed', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        id
    ).execute(&state.db).await?;

    let data = DataWrapper::object(serde_json::json!({"id": id, "status": "executed"}));
    Ok(Json(ApiResponse::ok(data)))
}

async fn reject_queue(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let reason = req.get("reason").and_then(|v| v.as_str()).unwrap_or("rejected");
    sqlx::query!(
        "UPDATE redemption_request SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        id
    ).execute(&state.db).await?;

    let data = DataWrapper::object(serde_json::json!({"id": id, "status": "rejected", "reason": reason}));
    Ok(Json(ApiResponse::ok(data)))
}

async fn multisig_status(
    State(state): State<SharedState>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    // 查询 TreasuryMultisig 合约地址
    let row = sqlx::query!(
        "SELECT address FROM contract_deployment WHERE name = 'TreasuryMultisig' AND network = 'hardhat' AND status = 'active'"
    ).fetch_optional(&state.db).await?;

    let address = row.map(|r| r.address).unwrap_or_default();
    let data = DataWrapper::object(serde_json::json!({
        "address": address,
        "threshold": 2,
        "signers": [],
        "pending_count": 0,
    }));
    Ok(Json(ApiResponse::ok(data)))
}

async fn treasury_stats(
    State(state): State<SharedState>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let pending = sqlx::query_scalar!("SELECT COUNT(*) FROM redemption_request WHERE status = 'pending'")
        .fetch_one(&state.db).await.unwrap_or(0);
    let executed = sqlx::query_scalar!("SELECT COUNT(*) FROM redemption_request WHERE status = 'executed'")
        .fetch_one(&state.db).await.unwrap_or(0);
    let rejected = sqlx::query_scalar!("SELECT COUNT(*) FROM redemption_request WHERE status = 'rejected'")
        .fetch_one(&state.db).await.unwrap_or(0);
    let total_amount = sqlx::query_scalar!("SELECT COALESCE(SUM(CAST(amount AS REAL)), 0.0) FROM redemption_request WHERE status = 'executed'")
        .fetch_one(&state.db).await.unwrap_or(0.0);

    let data = DataWrapper::object(serde_json::json!({
        "pending": pending, "executed": executed, "rejected": rejected,
        "total_amount": total_amount.to_string(),
    }));
    Ok(Json(ApiResponse::ok(data)))
}
