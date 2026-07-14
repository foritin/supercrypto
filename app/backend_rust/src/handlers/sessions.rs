use axum::{
    extract::{Path, Query, State},
    Json, Router,
};
use serde::Deserialize;

use crate::error::AppError;
use crate::schemas::common::{ApiResponse, DataWrapper, Pagination};
use crate::state::SharedState;

#[derive(Debug, Deserialize)]
pub struct SessionQuery {
    #[serde(default = "default_page")]
    page: i64,
    #[serde(default = "default_page_size")]
    page_size: i64,
}

fn default_page() -> i64 { 1 }
fn default_page_size() -> i64 { 20 }

pub fn routes() -> Router<SharedState> {
    Router::new()
        .route("/api/v1/admin/auth/sessions", axum::routing::get(list_sessions))
        .route("/api/v1/admin/auth/sessions/{address}", axum::routing::get(get_user_sessions))
        .route("/api/v1/admin/auth/sessions/{address}/revoke", axum::routing::post(revoke_session))
        // Transaction audit (also under admin)
        .route("/api/v1/admin/transactions/audit", axum::routing::get(list_tx_audit))
        .route("/api/v1/admin/transactions/audit/stats", axum::routing::get(tx_audit_stats))
        .route("/api/v1/admin/transactions/audit/pending", axum::routing::get(tx_audit_pending))
        .route("/api/v1/admin/transactions/audit/{tx_hash}", axum::routing::get(get_tx_audit))
}

/// 列出所有活跃会话（基于 account 表的 last_login_dt）
async fn list_sessions(
    State(state): State<SharedState>,
    Query(params): Query<SessionQuery>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let offset = (params.page - 1).max(0) * params.page_size;
    let items = sqlx::query!(
        "SELECT id, address, roles, network, last_login_dt, is_active, is_blocked, created_at
         FROM account ORDER BY last_login_dt DESC NULLS LAST LIMIT $1 OFFSET $2",
        params.page_size, offset
    )
    .fetch_all(&state.db).await?;

    let total = sqlx::query_scalar!("SELECT COUNT(*) FROM account")
        .fetch_one(&state.db).await.unwrap_or(0);

    let items: Vec<serde_json::Value> = items.into_iter().map(|r| {
        let roles: serde_json::Value = serde_json::from_str(&r.roles).unwrap_or(serde_json::json!([]));
        serde_json::json!({
            "id": r.id, "address": r.address, "roles": roles, "network": r.network,
            "last_login_dt": r.last_login_dt, "is_active": r.is_active, "is_blocked": r.is_blocked,
            "created_at": r.created_at,
        })
    }).collect();

    let data = DataWrapper::list(items, Pagination::new(total, params.page, params.page_size));
    Ok(Json(ApiResponse::ok(data)))
}

/// 获取指定用户的会话信息
async fn get_user_sessions(
    State(state): State<SharedState>,
    Path(address): Path<String>,
    Query(params): Query<SessionQuery>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let addr = address.to_lowercase();
    let row = sqlx::query!(
        "SELECT id, address, roles, network, last_login_dt, is_active, is_blocked, created_at
         FROM account WHERE address = $1", addr
    )
    .fetch_optional(&state.db).await?
    .ok_or_else(|| AppError::NotFound(format!("account {} not found", addr)))?;

    let roles: serde_json::Value = serde_json::from_str(&row.roles).unwrap_or(serde_json::json!([]));
    let data = DataWrapper::object(serde_json::json!({
        "id": row.id, "address": row.address, "roles": roles, "network": row.network,
        "last_login_dt": row.last_login_dt, "is_active": row.is_active, "is_blocked": row.is_blocked,
        "created_at": row.created_at,
    }));
    Ok(Json(ApiResponse::ok(data)))
}

/// 撤销用户会话（标记为需要重新登录）
async fn revoke_session(
    State(state): State<SharedState>,
    Path(address): Path<String>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let addr = address.to_lowercase();
    tracing::info!(address = %addr, "Session revoked by admin");

    // 更新 last_login_dt 为 NULL，强制重新登录
    sqlx::query!(
        "UPDATE account SET last_login_dt = NULL, updated_at = CURRENT_TIMESTAMP WHERE address = $1",
        addr
    ).execute(&state.db).await?;

    let data = DataWrapper::msg("Session revoked");
    Ok(Json(ApiResponse::ok(data)))
}

// ============ Transaction Audit ============

async fn list_tx_audit(
    State(state): State<SharedState>,
    Query(params): Query<SessionQuery>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let offset = (params.page - 1).max(0) * params.page_size;
    let items = sqlx::query!(
        "SELECT id, tx_hash, tx_type, from_address, to_address, amount, status, created_at
         FROM transaction_audit ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        params.page_size, offset
    )
    .fetch_all(&state.db).await?;

    let total = sqlx::query_scalar!("SELECT COUNT(*) FROM transaction_audit")
        .fetch_one(&state.db).await.unwrap_or(0);

    let items: Vec<serde_json::Value> = items.into_iter().map(|r| serde_json::json!({
        "id": r.id, "tx_hash": r.tx_hash, "tx_type": r.tx_type,
        "from_address": r.from_address, "to_address": r.to_address,
        "value": r.amount, "status": r.status, "created_at": r.created_at,
    })).collect();

    let data = DataWrapper::list(items, Pagination::new(total, params.page, params.page_size));
    Ok(Json(ApiResponse::ok(data)))
}

async fn get_tx_audit(
    State(state): State<SharedState>,
    Path(tx_hash): Path<String>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let row = sqlx::query!(
        "SELECT id, tx_hash, tx_type, from_address, to_address, amount, status, created_at
         FROM transaction_audit WHERE tx_hash = $1", tx_hash
    )
    .fetch_optional(&state.db).await?
    .ok_or_else(|| AppError::NotFound(format!("tx audit {} not found", tx_hash)))?;

    let data = DataWrapper::object(serde_json::json!({
        "id": row.id, "tx_hash": row.tx_hash, "tx_type": row.tx_type,
        "from_address": row.from_address, "to_address": row.to_address,
        "value": row.amount, "status": row.status, "created_at": row.created_at,
    }));
    Ok(Json(ApiResponse::ok(data)))
}

async fn tx_audit_stats(
    State(state): State<SharedState>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let total = sqlx::query_scalar!("SELECT COUNT(*) FROM transaction_audit")
        .fetch_one(&state.db).await.unwrap_or(0);
    let pending = sqlx::query_scalar!("SELECT COUNT(*) FROM transaction_audit WHERE status = 'pending'")
        .fetch_one(&state.db).await.unwrap_or(0);
    let confirmed = sqlx::query_scalar!("SELECT COUNT(*) FROM transaction_audit WHERE status = 'confirmed'")
        .fetch_one(&state.db).await.unwrap_or(0);
    let failed = sqlx::query_scalar!("SELECT COUNT(*) FROM transaction_audit WHERE status = 'failed'")
        .fetch_one(&state.db).await.unwrap_or(0);

    let data = DataWrapper::object(serde_json::json!({
        "total": total, "pending": pending, "confirmed": confirmed, "failed": failed,
    }));
    Ok(Json(ApiResponse::ok(data)))
}

async fn tx_audit_pending(
    State(state): State<SharedState>,
    Query(params): Query<SessionQuery>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let offset = (params.page - 1).max(0) * params.page_size;
    let items = sqlx::query!(
        "SELECT id, tx_hash, tx_type, from_address, to_address, amount, status, created_at
         FROM transaction_audit WHERE status = 'pending' ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        params.page_size, offset
    )
    .fetch_all(&state.db).await?;

    let total = sqlx::query_scalar!("SELECT COUNT(*) FROM transaction_audit WHERE status = 'pending'")
        .fetch_one(&state.db).await.unwrap_or(0);

    let items: Vec<serde_json::Value> = items.into_iter().map(|r| serde_json::json!({
        "id": r.id, "tx_hash": r.tx_hash, "tx_type": r.tx_type,
        "from_address": r.from_address, "to_address": r.to_address,
        "value": r.amount, "status": r.status, "created_at": r.created_at,
    })).collect();

    let data = DataWrapper::list(items, Pagination::new(total, params.page, params.page_size));
    Ok(Json(ApiResponse::ok(data)))
}
