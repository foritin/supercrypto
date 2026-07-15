use axum::{
    extract::{Path, Query, State},
    Json, Router,
};
use serde::Deserialize;

use crate::error::AppError;
use crate::schemas::common::{DataWrapper, Pagination};
use crate::state::SharedState;

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
pub struct AuditQuery {
    #[serde(default = "default_page")]
    page: i64,
    #[serde(default = "default_page_size")]
    page_size: i64,
    operator_id: Option<i64>,
    target_type: Option<String>,
    target_id: Option<i64>,
    action: Option<String>,
}

fn default_page() -> i64 { 1 }
fn default_page_size() -> i64 { 20 }

pub fn routes() -> Router<SharedState> {
    Router::new()
        .route("/api/v1/admin/audit-logs", axum::routing::get(list_audit_logs))
        .route("/api/v1/admin/audit-logs/stats", axum::routing::get(audit_stats))
        .route("/api/v1/admin/audit-logs/export", axum::routing::get(export_audit_logs))
        .route("/api/v1/admin/audit-logs/operator/{operator_id}", axum::routing::get(audit_by_operator))
        .route("/api/v1/admin/audit-logs/target/{target_type}/{target_id}", axum::routing::get(audit_by_target))
        .route("/api/v1/admin/audit-logs/{id}", axum::routing::get(get_audit_log))
}

async fn list_audit_logs(
    State(state): State<SharedState>,
    Query(params): Query<AuditQuery>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let offset = (params.page - 1).max(0) * params.page_size;
    let items = sqlx::query!(
        "SELECT id, action, category, resource_type, resource_id, actor_address, actor_role, details, status, created_at
         FROM audit_log ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        params.page_size, offset
    )
    .fetch_all(&state.db).await?;

    let total = sqlx::query_scalar!("SELECT COUNT(*) FROM audit_log")
        .fetch_one(&state.db).await.unwrap_or(0);

    let items: Vec<serde_json::Value> = items.into_iter().map(|r| serde_json::json!({
        "id": r.id, "action": r.action, "category": r.category,
        "resource_type": r.resource_type, "resource_id": r.resource_id,
        "actor_address": r.actor_address, "actor_role": r.actor_role,
        "details": r.details, "status": r.status, "created_at": r.created_at,
    })).collect();

    let data = DataWrapper::list(items, Pagination::new(total, params.page, params.page_size));
    Ok(Json(data))
}

async fn get_audit_log(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let row = sqlx::query!(
        "SELECT id, action, category, resource_type, resource_id, actor_address, actor_role, details, status, created_at
         FROM audit_log WHERE id = $1", id
    )
    .fetch_optional(&state.db).await?
    .ok_or_else(|| AppError::NotFound(format!("audit log {} not found", id)))?;

    let data = DataWrapper::object(serde_json::json!({
        "id": row.id, "action": row.action, "category": row.category,
        "resource_type": row.resource_type, "resource_id": row.resource_id,
        "actor_address": row.actor_address, "actor_role": row.actor_role,
        "details": row.details, "status": row.status, "created_at": row.created_at,
    }));
    Ok(Json(data))
}

async fn audit_stats(
    State(state): State<SharedState>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let total = sqlx::query_scalar!("SELECT COUNT(*) FROM audit_log")
        .fetch_one(&state.db).await.unwrap_or(0);
    let today = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM audit_log WHERE date(created_at) = date('now')"
    ).fetch_one(&state.db).await.unwrap_or(0);

    let by_action = sqlx::query!(
        "SELECT action, COUNT(*) as cnt FROM audit_log GROUP BY action ORDER BY cnt DESC"
    ).fetch_all(&state.db).await?;

    let action_stats: Vec<serde_json::Value> = by_action.into_iter().map(|r| serde_json::json!({
        "action": r.action, "count": r.cnt
    })).collect();

    let data = DataWrapper::object(serde_json::json!({
        "total": total, "today": today, "by_action": action_stats,
    }));
    Ok(Json(data))
}

async fn export_audit_logs(
    State(state): State<SharedState>,
    Query(_params): Query<AuditQuery>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    // 返回全部审计日志（导出用）
    let items = sqlx::query!(
        "SELECT id, action, category, resource_type, resource_id, actor_address, actor_role, details, status, created_at
         FROM audit_log ORDER BY created_at DESC LIMIT 10000"
    )
    .fetch_all(&state.db).await?;

    let items: Vec<serde_json::Value> = items.into_iter().map(|r| serde_json::json!({
        "id": r.id, "action": r.action, "category": r.category,
        "resource_type": r.resource_type, "resource_id": r.resource_id,
        "actor_address": r.actor_address, "actor_role": r.actor_role,
        "details": r.details, "status": r.status, "created_at": r.created_at,
    })).collect();

    let data = DataWrapper::object(serde_json::json!({"logs": items, "count": items.len()}));
    Ok(Json(data))
}

async fn audit_by_operator(
    State(state): State<SharedState>,
    Path(operator_id): Path<i64>,
    Query(params): Query<AuditQuery>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let offset = (params.page - 1).max(0) * params.page_size;
    let items = sqlx::query!(
        "SELECT id, action, category, resource_type, resource_id, actor_address, actor_role, details, status, created_at
         FROM audit_log WHERE resource_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        operator_id, params.page_size, offset
    )
    .fetch_all(&state.db).await?;

    let total = sqlx::query_scalar!("SELECT COUNT(*) FROM audit_log WHERE resource_id = $1", operator_id)
        .fetch_one(&state.db).await.unwrap_or(0);

    let items: Vec<serde_json::Value> = items.into_iter().map(|r| serde_json::json!({
        "id": r.id, "action": r.action, "category": r.category,
        "resource_type": r.resource_type, "resource_id": r.resource_id,
        "actor_address": r.actor_address, "actor_role": r.actor_role,
        "details": r.details, "status": r.status, "created_at": r.created_at,
    })).collect();

    let data = DataWrapper::list(items, Pagination::new(total, params.page, params.page_size));
    Ok(Json(data))
}

async fn audit_by_target(
    State(state): State<SharedState>,
    Path((target_type, target_id)): Path<(String, i64)>,
    Query(params): Query<AuditQuery>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let offset = (params.page - 1).max(0) * params.page_size;
    let items = sqlx::query!(
        "SELECT id, action, category, resource_type, resource_id, actor_address, actor_role, details, status, created_at
         FROM audit_log WHERE resource_type = $1 AND resource_id = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        target_type, target_id, params.page_size, offset
    )
    .fetch_all(&state.db).await?;

    let total = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM audit_log WHERE resource_type = $1 AND resource_id = $2",
        target_type, target_id
    ).fetch_one(&state.db).await.unwrap_or(0);

    let items: Vec<serde_json::Value> = items.into_iter().map(|r| serde_json::json!({
        "id": r.id, "action": r.action, "category": r.category,
        "resource_type": r.resource_type, "resource_id": r.resource_id,
        "actor_address": r.actor_address, "actor_role": r.actor_role,
        "details": r.details, "status": r.status, "created_at": r.created_at,
    })).collect();

    let data = DataWrapper::list(items, Pagination::new(total, params.page, params.page_size));
    Ok(Json(data))
}
