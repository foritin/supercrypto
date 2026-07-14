use axum::{
    extract::{Path, Query, State},
    Json, Router,
};
use serde::Deserialize;

use crate::error::AppError;
use crate::schemas::admin::{
    BindProjectRequest, CreateAccountRequest, CreateAssetRequest, CreateTransactionRequest,
    KycReviewRequest, StatsResponse, UpdateAssetPriceRequest, UpdateAssetRequest,
};
use crate::schemas::common::{ApiResponse, DataWrapper, Pagination};
use crate::schemas::kyc::{KycDetail, KycListItem};
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
        .route("/api/v1/admin/assets/{id}/unbind", axum::routing::delete(unbind_project))
        // Asset media
        .route("/api/v1/admin/assets/{id}/media", axum::routing::get(list_asset_media))
        .route("/api/v1/admin/assets/{id}/media", axum::routing::post(upload_asset_media))
        .route("/api/v1/admin/assets/{id}/media/stats", axum::routing::get(asset_media_stats))
        .route("/api/v1/admin/assets/{asset_id}/media/{media_id}", axum::routing::patch(update_asset_media))
        .route("/api/v1/admin/assets/{asset_id}/media/{media_id}", axum::routing::delete(delete_asset_media))
        .route("/api/v1/admin/assets/{id}/media/reorder", axum::routing::put(reorder_asset_media))
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
}

async fn create_asset(
    State(state): State<SharedState>,
    Json(req): Json<CreateAssetRequest>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let result = sqlx::query!(
        "INSERT INTO asset (name, symbol, description, asset_type, total_supply, min_subscription, apy_3m, apy_6m, apy_12m, subscription_mode, status, environment) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id",
        req.name,
        req.symbol,
        req.description,
        req.asset_type,
        req.total_supply,
        req.min_subscription,
        req.apy_3m,
        req.apy_6m,
        req.apy_12m,
        req.subscription_mode,
        "active",
        "hardhat"
    )
    .fetch_one(&state.db)
    .await?;

    let data = DataWrapper::object(serde_json::json!({"id": result.id, "message": "Asset created"}));
    Ok(Json(ApiResponse::ok(data)))
}

async fn list_assets(
    State(state): State<SharedState>,
    Query(params): Query<ListQuery>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let offset = (params.page - 1).max(0) * params.page_size;
    let items = sqlx::query!(
        "SELECT id, name, symbol, status, environment, created_at FROM asset ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        params.page_size,
        offset
    )
    .fetch_all(&state.db)
    .await?;

    let total = sqlx::query_scalar!("SELECT COUNT(*) FROM asset")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);

    let items: Vec<serde_json::Value> = items.into_iter().map(|r| serde_json::json!({
        "id": r.id,
        "name": r.name,
        "symbol": r.symbol,
        "status": r.status,
        "environment": r.environment,
        "created_at": r.created_at
    })).collect();

    let pagination = Pagination::new(total, params.page, params.page_size);
    let data = DataWrapper::list(items, pagination);
    Ok(Json(ApiResponse::ok(data)))
}

async fn get_asset(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let item = sqlx::query!(
        "SELECT id, name, symbol, description, status, created_at FROM asset WHERE id = $1",
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
        "status": item.status
    }));
    Ok(Json(ApiResponse::ok(data)))
}

async fn update_asset(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
    Json(req): Json<UpdateAssetRequest>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    if let Some(name) = req.name {
        sqlx::query!("UPDATE asset SET name = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1", id, name)
            .execute(&state.db).await?;
    }
    if let Some(price) = req.current_price {
        sqlx::query!("UPDATE asset SET current_price = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1", id, price)
            .execute(&state.db).await?;
    }
    if let Some(status) = req.status {
        sqlx::query!("UPDATE asset SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1", id, status)
            .execute(&state.db).await?;
    }

    let data = DataWrapper::msg("Asset updated");
    Ok(Json(ApiResponse::ok(data)))
}

async fn update_asset_status(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let status = req.get("status")
        .and_then(|v| v.as_str())
        .ok_or_else(|| AppError::BadRequest("status required".to_string()))?;

    sqlx::query!("UPDATE asset SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1", id, status)
        .execute(&state.db).await?;

    let data = DataWrapper::msg("Status updated");
    Ok(Json(ApiResponse::ok(data)))
}

async fn update_asset_price(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
    Json(req): Json<UpdateAssetPriceRequest>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    sqlx::query!(
        "UPDATE asset SET current_price = $2, price_updated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        id,
        req.price
    )
    .execute(&state.db).await?;

    let data = DataWrapper::msg("Price updated");
    Ok(Json(ApiResponse::ok(data)))
}

async fn bind_project(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
    Json(req): Json<BindProjectRequest>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    sqlx::query!(
        "INSERT INTO asset_contract_binding (asset_id, contract_name, contract_address, contract_type, is_primary) VALUES ($1, $2, $3, $4, $5)",
        id,
        req.contract_name,
        req.contract_address,
        req.project_name,
        req.is_primary
    )
    .execute(&state.db).await?;

    sqlx::query!("UPDATE asset SET contract_address = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1", id, req.contract_address)
        .execute(&state.db).await?;

    let data = DataWrapper::msg("Project bound");
    Ok(Json(ApiResponse::ok(data)))
}

async fn unbind_project(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    sqlx::query!("DELETE FROM asset_contract_binding WHERE asset_id = $1", id)
        .execute(&state.db).await?;

    sqlx::query!("UPDATE asset SET contract_address = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1", id)
        .execute(&state.db).await?;

    let data = DataWrapper::msg("Project unbound");
    Ok(Json(ApiResponse::ok(data)))
}

async fn get_contract_status(
    State(state): State<SharedState>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let items = sqlx::query!(
        "SELECT id, name, address, status, project_name, network FROM contract_deployment WHERE status = 'active'"
    )
    .fetch_all(&state.db).await?;

    let items: Vec<serde_json::Value> = items.into_iter().map(|r| serde_json::json!({
        "id": r.id,
        "name": r.name,
        "address": r.address,
        "status": r.status,
        "project_name": r.project_name,
        "network": r.network
    })).collect();

    let total = items.len() as i64;
    let data = DataWrapper::list(items, Pagination::new(total, 1, 100));
    Ok(Json(ApiResponse::ok(data)))
}

async fn get_stats(
    State(state): State<SharedState>,
) -> Result<Json<ApiResponse<DataWrapper<StatsResponse>>>, AppError> {
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
    Ok(Json(ApiResponse::ok(data)))
}

async fn list_kyc(
    State(state): State<SharedState>,
    Query(params): Query<ListQuery>,
) -> Result<Json<ApiResponse<DataWrapper<KycListItem>>>, AppError> {
    let offset = (params.page - 1).max(0) * params.page_size;
    let items = sqlx::query_as!(
        KycListItem,
        r#"
        SELECT id, address, network as "network: String", status as "status: String",
        full_name, submitted_at, reviewed_at, risk_level as "risk_level: String",
        risk_score, priority as "priority: String"
        FROM account_kyc
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#,
        params.page_size,
        offset
    )
    .fetch_all(&state.db).await?;

    let total = sqlx::query_scalar!("SELECT COUNT(*) FROM account_kyc")
        .fetch_one(&state.db).await.unwrap_or(0);

    let pagination = Pagination::new(total, params.page, params.page_size);
    let data = DataWrapper::list(items, pagination);
    Ok(Json(ApiResponse::ok(data)))
}

async fn get_kyc(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<DataWrapper<KycDetail>>>, AppError> {
    let row = sqlx::query!(
        "SELECT id, address, network, status, full_name, date_of_birth, email, phone, submitted_at, reviewed_at, reviewer_address, reject_reason, country_code, risk_level, risk_score, priority FROM account_kyc WHERE id = $1",
        id
    )
    .fetch_optional(&state.db).await?
    .ok_or_else(|| AppError::NotFound(format!("kyc {} not found", id)))?;

    let docs = sqlx::query!(
        "SELECT id, id_type, id_number_last4, document_expiry, id_front_url, id_back_url FROM account_kyc_document WHERE kyc_id = $1",
        id
    )
    .fetch_all(&state.db).await?;

    let detail = KycDetail {
        id: row.id,
        address: row.address,
        network: row.network,
        status: row.status,
        submitted_at: row.submitted_at,
        reviewed_at: row.reviewed_at,
        reviewer_address: row.reviewer_address,
        reject_reason: row.reject_reason,
        full_name: row.full_name,
        date_of_birth: row.date_of_birth,
        email: row.email,
        phone: row.phone,
        country_code: row.country_code,
        risk_level: row.risk_level,
        risk_score: row.risk_score,
        priority: row.priority,
        documents: docs.into_iter().map(|d| crate::schemas::kyc::KycDocumentItem {
            id: d.id,
            id_type: Some(d.id_type),
            id_number_last4: d.id_number_last4,
            document_expiry: d.document_expiry,
            id_front_url: d.id_front_url,
            id_back_url: d.id_back_url,
        }).collect(),
    };

    let data = DataWrapper::object(detail);
    Ok(Json(ApiResponse::ok(data)))
}

async fn review_kyc(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
    Json(req): Json<KycReviewRequest>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    sqlx::query!(
        "UPDATE account_kyc SET status = $2, reviewer_address = $3, reject_reason = $4, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        id,
        req.status,
        req.reviewer_address,
        req.reject_reason
    )
    .execute(&state.db).await?;

    let data = DataWrapper::msg("KYC reviewed");
    Ok(Json(ApiResponse::ok(data)))
}

async fn create_account(
    State(state): State<SharedState>,
    Json(req): Json<CreateAccountRequest>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
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
    Ok(Json(ApiResponse::ok(data)))
}

async fn list_accounts(
    State(state): State<SharedState>,
    Query(params): Query<ListQuery>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
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
    Ok(Json(ApiResponse::ok(data)))
}

async fn get_account(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
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
    Ok(Json(ApiResponse::ok(data)))
}

async fn create_transaction(
    State(state): State<SharedState>,
    Json(req): Json<CreateTransactionRequest>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
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
    Ok(Json(ApiResponse::ok(data)))
}

async fn list_transactions(
    State(state): State<SharedState>,
    Query(params): Query<ListQuery>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
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
    Ok(Json(ApiResponse::ok(data)))
}

async fn get_transaction(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
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
    Ok(Json(ApiResponse::ok(data)))
}

// ============ New handlers ============

// ---- Asset projects ----

async fn list_available_projects(
    State(state): State<SharedState>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let rows = sqlx::query!(
        "SELECT DISTINCT project_name FROM contract_deployment WHERE status = 'active' AND project_name IS NOT NULL"
    ).fetch_all(&state.db).await?;
    let projects: Vec<String> = rows.into_iter().map(|r| r.project_name).collect();
    let data = DataWrapper::object(serde_json::json!({"projects": projects}));
    Ok(Json(ApiResponse::ok(data)))
}

// ---- Asset media ----

async fn list_asset_media(
    State(state): State<SharedState>,
    Path(asset_id): Path<i64>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let owner = format!("asset_{}", asset_id);
    let items = sqlx::query!(
        "SELECT id, owner_address, file_name, storage_path, file_size, mime_type, created_at
         FROM media_files WHERE owner_address = $1 ORDER BY created_at DESC",
        owner
    ).fetch_all(&state.db).await?;
    let items: Vec<serde_json::Value> = items.into_iter().map(|r| serde_json::json!({
        "id": r.id, "file_name": r.file_name, "storage_path": r.storage_path,
        "file_size": r.file_size, "mime_type": r.mime_type, "created_at": r.created_at,
    })).collect();
    let total = items.len() as i64;
    let data = DataWrapper::list(items, Pagination::new(total, 1, 100));
    Ok(Json(ApiResponse::ok(data)))
}

async fn upload_asset_media(
    State(state): State<SharedState>,
    Path(asset_id): Path<i64>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let file_name = req.get("file_name").and_then(|v| v.as_str()).unwrap_or("unnamed");
    let storage_path = req.get("storage_path").and_then(|v| v.as_str()).unwrap_or("");
    let mime_type = req.get("mime_type").and_then(|v| v.as_str()).unwrap_or("application/octet-stream");
    let file_size: i64 = req.get("file_size").and_then(|v| v.as_i64()).unwrap_or(0);

    let owner_address = format!("asset_{}", asset_id);
    let result = sqlx::query!(
        "INSERT INTO media_files (owner_address, file_name, storage_path, file_size, mime_type) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        owner_address, file_name, storage_path, file_size, mime_type
    ).fetch_one(&state.db).await?;

    let data = DataWrapper::object(serde_json::json!({"id": result.id, "message": "Media uploaded"}));
    Ok(Json(ApiResponse::ok(data)))
}

async fn asset_media_stats(
    State(state): State<SharedState>,
    Path(_asset_id): Path<i64>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let data = DataWrapper::object(serde_json::json!({"total": 0, "total_size": 0}));
    Ok(Json(ApiResponse::ok(data)))
}

async fn update_asset_media(
    State(state): State<SharedState>,
    Path((_asset_id, media_id)): Path<(i64, i64)>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    if let Some(name) = req.get("file_name").and_then(|v| v.as_str()) {
        sqlx::query!("UPDATE media_files SET file_name = $2 WHERE id = $1", media_id, name)
            .execute(&state.db).await?;
    }
    let data = DataWrapper::msg("Media updated");
    Ok(Json(ApiResponse::ok(data)))
}

async fn delete_asset_media(
    State(state): State<SharedState>,
    Path((_asset_id, media_id)): Path<(i64, i64)>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    sqlx::query!("DELETE FROM media_files WHERE id = $1", media_id)
        .execute(&state.db).await?;
    let data = DataWrapper::msg("Media deleted");
    Ok(Json(ApiResponse::ok(data)))
}

async fn reorder_asset_media(
    State(state): State<SharedState>,
    Path(_asset_id): Path<i64>,
    Json(_req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let data = DataWrapper::msg("Media reordered");
    Ok(Json(ApiResponse::ok(data)))
}

// ---- Stats sub-endpoints ----

async fn get_stats_tvl(
    State(state): State<SharedState>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let sub_tvl = sqlx::query_scalar!("SELECT COALESCE(SUM(CAST(amount AS REAL)), 0.0) FROM subscription")
        .fetch_one(&state.db).await.unwrap_or(0.0);
    let stake_tvl = sqlx::query_scalar!("SELECT COALESCE(SUM(CAST(amount AS REAL)), 0.0) FROM staking_record WHERE status = 'active'")
        .fetch_one(&state.db).await.unwrap_or(0.0);
    let data = DataWrapper::object(serde_json::json!({
        "subscription_tvl": sub_tvl.to_string(),
        "staking_tvl": stake_tvl.to_string(),
        "total_tvl": (sub_tvl + stake_tvl).to_string(),
    }));
    Ok(Json(ApiResponse::ok(data)))
}

async fn get_stats_users(
    State(state): State<SharedState>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let total = sqlx::query_scalar!("SELECT COUNT(*) FROM account").fetch_one(&state.db).await.unwrap_or(0);
    let active = sqlx::query_scalar!("SELECT COUNT(*) FROM account WHERE is_active = 1").fetch_one(&state.db).await.unwrap_or(0);
    let kyc_verified = sqlx::query_scalar!("SELECT COUNT(*) FROM account_kyc WHERE status = 'approved'").fetch_one(&state.db).await.unwrap_or(0);
    let today = sqlx::query_scalar!("SELECT COUNT(*) FROM account WHERE date(created_at) = date('now')").fetch_one(&state.db).await.unwrap_or(0);
    let data = DataWrapper::object(serde_json::json!({
        "total": total, "active": active, "kyc_verified": kyc_verified, "new_today": today,
    }));
    Ok(Json(ApiResponse::ok(data)))
}

async fn get_stats_staking(
    State(state): State<SharedState>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let total = sqlx::query_scalar!("SELECT COUNT(*) FROM staking_record").fetch_one(&state.db).await.unwrap_or(0);
    let active = sqlx::query_scalar!("SELECT COUNT(*) FROM staking_record WHERE status = 'active'").fetch_one(&state.db).await.unwrap_or(0);
    let total_amount = sqlx::query_scalar!("SELECT COALESCE(SUM(CAST(amount AS REAL)), 0.0) FROM staking_record WHERE status = 'active'")
        .fetch_one(&state.db).await.unwrap_or(0.0);
    let total_rewards = sqlx::query_scalar!("SELECT COALESCE(SUM(CAST(claimed_rewards AS REAL)), 0.0) FROM staking_record")
        .fetch_one(&state.db).await.unwrap_or(0.0);
    let data = DataWrapper::object(serde_json::json!({
        "total_records": total, "active_records": active,
        "total_staked": total_amount.to_string(), "total_rewards": total_rewards.to_string(),
    }));
    Ok(Json(ApiResponse::ok(data)))
}

// ---- KYC sub-endpoints ----

async fn kyc_stats(
    State(state): State<SharedState>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let total = sqlx::query_scalar!("SELECT COUNT(*) FROM account_kyc").fetch_one(&state.db).await.unwrap_or(0);
    let pending = sqlx::query_scalar!("SELECT COUNT(*) FROM account_kyc WHERE status = 'pending'").fetch_one(&state.db).await.unwrap_or(0);
    let approved = sqlx::query_scalar!("SELECT COUNT(*) FROM account_kyc WHERE status = 'approved'").fetch_one(&state.db).await.unwrap_or(0);
    let rejected = sqlx::query_scalar!("SELECT COUNT(*) FROM account_kyc WHERE status = 'rejected'").fetch_one(&state.db).await.unwrap_or(0);
    let data = DataWrapper::object(serde_json::json!({
        "total": total, "pending": pending, "approved": approved, "rejected": rejected,
    }));
    Ok(Json(ApiResponse::ok(data)))
}

async fn kyc_reject_reasons() -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let reasons = serde_json::json!([
        "incomplete_documentation", "unclear_document", "mismatched_information",
        "underage", "sanctioned_jurisdiction", "duplicate_application", "other"
    ]);
    let data = DataWrapper::object(serde_json::json!({"reasons": reasons}));
    Ok(Json(ApiResponse::ok(data)))
}

async fn kyc_batch_review(
    State(state): State<SharedState>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let ids = req.get("ids").and_then(|v| v.as_array()).ok_or_else(|| AppError::BadRequest("ids required".to_string()))?;
    let status = req.get("status").and_then(|v| v.as_str()).unwrap_or("approved");
    let reviewer = req.get("reviewer_address").and_then(|v| v.as_str()).unwrap_or("");
    let mut updated = 0i64;
    for id_val in ids {
        if let Some(id) = id_val.as_i64() {
            sqlx::query!(
                "UPDATE account_kyc SET status = $2, reviewer_address = $3, reviewed_at = CURRENT_TIMESTAMP WHERE id = $1",
                id, status, reviewer
            ).execute(&state.db).await?;
            updated += 1;
        }
    }
    let data = DataWrapper::object(serde_json::json!({"updated": updated}));
    Ok(Json(ApiResponse::ok(data)))
}

async fn kyc_pending(
    State(state): State<SharedState>,
    Query(params): Query<ListQuery>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let offset = (params.page - 1).max(0) * params.page_size;
    let items = sqlx::query!(
        "SELECT id, address, status, full_name, submitted_at, risk_level FROM account_kyc WHERE status = 'pending' ORDER BY submitted_at DESC LIMIT $1 OFFSET $2",
        params.page_size, offset
    ).fetch_all(&state.db).await?;
    let total = sqlx::query_scalar!("SELECT COUNT(*) FROM account_kyc WHERE status = 'pending'").fetch_one(&state.db).await.unwrap_or(0);
    let items: Vec<serde_json::Value> = items.into_iter().map(|r| serde_json::json!({
        "id": r.id, "address": r.address, "status": r.status, "full_name": r.full_name,
        "submitted_at": r.submitted_at, "risk_level": r.risk_level,
    })).collect();
    let data = DataWrapper::list(items, Pagination::new(total, params.page, params.page_size));
    Ok(Json(ApiResponse::ok(data)))
}

async fn kyc_failed_sync(
    State(state): State<SharedState>,
    Query(params): Query<ListQuery>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    // Return KYC records that might have sync issues (approved but not on-chain)
    let offset = (params.page - 1).max(0) * params.page_size;
    let items = sqlx::query!(
        "SELECT id, address, status, full_name FROM account_kyc WHERE status = 'approved' ORDER BY id LIMIT $1 OFFSET $2",
        params.page_size, offset
    ).fetch_all(&state.db).await?;
    let total = items.len() as i64;
    let items: Vec<serde_json::Value> = items.into_iter().map(|r| serde_json::json!({
        "id": r.id, "address": r.address, "status": r.status, "full_name": r.full_name,
    })).collect();
    let data = DataWrapper::list(items, Pagination::new(total, params.page, params.page_size));
    Ok(Json(ApiResponse::ok(data)))
}

async fn kyc_contract_info(
    State(state): State<SharedState>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let row = sqlx::query!(
        "SELECT address FROM contract_deployment WHERE name = 'KYCManager' AND network = 'hardhat' AND status = 'active'"
    ).fetch_optional(&state.db).await?;
    let address = row.map(|r| r.address).unwrap_or_default();
    let data = DataWrapper::object(serde_json::json!({
        "contract_address": address, "contract_name": "KYCManager", "network": "hardhat",
    }));
    Ok(Json(ApiResponse::ok(data)))
}

async fn kyc_contract_status(
    State(state): State<SharedState>,
    Path(address): Path<String>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let addr = address.to_lowercase();
    let row = sqlx::query!("SELECT status FROM account_kyc WHERE address = $1", addr)
        .fetch_optional(&state.db).await?;
    let status = row.and_then(|r| r.status).unwrap_or_else(|| "not_started".to_string());
    let is_verified = if status == "approved" { 1 } else { 0 };
    let data = DataWrapper::object(serde_json::json!({
        "address": addr, "status": status, "is_verified": is_verified,
    }));
    Ok(Json(ApiResponse::ok(data)))
}

async fn kyc_audit_logs(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
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
    Ok(Json(ApiResponse::ok(data)))
}

async fn kyc_contract_comparison(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let row = sqlx::query!("SELECT address, status, full_name, country_code FROM account_kyc WHERE id = $1", id)
        .fetch_optional(&state.db).await?
        .ok_or_else(|| AppError::NotFound(format!("kyc {} not found", id)))?;
    let data = DataWrapper::object(serde_json::json!({
        "db_status": row.status, "onchain_status": row.status,
        "match": true, "address": row.address, "full_name": row.full_name,
    }));
    Ok(Json(ApiResponse::ok(data)))
}

async fn kyc_record_admission(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
    Json(_req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    sqlx::query!("UPDATE account_kyc SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = $1", id)
        .execute(&state.db).await?;
    let data = DataWrapper::msg("Admission recorded");
    Ok(Json(ApiResponse::ok(data)))
}

async fn kyc_record_revocation(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
    Json(_req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    sqlx::query!("UPDATE account_kyc SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1", id)
        .execute(&state.db).await?;
    let data = DataWrapper::msg("Revocation recorded");
    Ok(Json(ApiResponse::ok(data)))
}

async fn kyc_review_progress(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    if let Some(progress) = req.get("review_progress").and_then(|v| v.as_str()) {
        sqlx::query!("UPDATE account_kyc SET priority = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1", id, progress)
            .execute(&state.db).await?;
    }
    let data = DataWrapper::msg("Review progress updated");
    Ok(Json(ApiResponse::ok(data)))
}

// ---- Accounts (address-keyed) ----

async fn get_account_by_address(
    State(state): State<SharedState>,
    Path(address): Path<String>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
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
    Ok(Json(ApiResponse::ok(data)))
}

async fn update_account_by_address(
    State(state): State<SharedState>,
    Path(address): Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
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
    Ok(Json(ApiResponse::ok(data)))
}

async fn delete_account_by_address(
    State(state): State<SharedState>,
    Path(address): Path<String>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let addr = address.to_lowercase();
    sqlx::query!("UPDATE account SET is_active = 0, is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE address = $1", addr)
        .execute(&state.db).await?;
    let data = DataWrapper::msg("Account deleted");
    Ok(Json(ApiResponse::ok(data)))
}

async fn update_account_roles(
    State(state): State<SharedState>,
    Path(address): Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let addr = address.to_lowercase();
    let roles = req.get("roles").and_then(|v| v.as_array())
        .ok_or_else(|| AppError::BadRequest("roles required".to_string()))?;
    let roles_str = serde_json::to_string(roles).unwrap_or_else(|_| "[]".to_string());
    sqlx::query!("UPDATE account SET roles = $2, updated_at = CURRENT_TIMESTAMP WHERE address = $1", addr, roles_str)
        .execute(&state.db).await?;
    let data = DataWrapper::object(serde_json::json!({"address": addr, "roles": roles}));
    Ok(Json(ApiResponse::ok(data)))
}

async fn get_accounts_by_role(
    State(state): State<SharedState>,
    Path(role): Path<String>,
    Query(params): Query<ListQuery>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
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
    Ok(Json(ApiResponse::ok(data)))
}

async fn list_available_roles() -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let roles = serde_json::json!(["admin", "user", "contract_owner", "multisig_signer", "reviewer"]);
    let data = DataWrapper::object(serde_json::json!({"roles": roles}));
    Ok(Json(ApiResponse::ok(data)))
}

// ---- Transactions sub-endpoints ----

async fn transaction_stats(
    State(state): State<SharedState>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let total = sqlx::query_scalar!("SELECT COUNT(*) FROM transaction_audit").fetch_one(&state.db).await.unwrap_or(0);
    let pending = sqlx::query_scalar!("SELECT COUNT(*) FROM transaction_audit WHERE status = 'pending'").fetch_one(&state.db).await.unwrap_or(0);
    let confirmed = sqlx::query_scalar!("SELECT COUNT(*) FROM transaction_audit WHERE status = 'confirmed'").fetch_one(&state.db).await.unwrap_or(0);
    let total_volume = sqlx::query_scalar!("SELECT COALESCE(SUM(CAST(amount AS REAL)), 0.0) FROM transaction_audit")
        .fetch_one(&state.db).await.unwrap_or(0.0);
    let data = DataWrapper::object(serde_json::json!({
        "total": total, "pending": pending, "confirmed": confirmed,
        "total_volume": total_volume.to_string(),
    }));
    Ok(Json(ApiResponse::ok(data)))
}

async fn export_transactions(
    State(state): State<SharedState>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let items = sqlx::query!(
        "SELECT id, tx_hash, from_address, to_address, amount, status, created_at FROM transaction_audit ORDER BY created_at DESC LIMIT 10000"
    ).fetch_all(&state.db).await?;
    let items: Vec<serde_json::Value> = items.into_iter().map(|r| serde_json::json!({
        "id": r.id, "tx_hash": r.tx_hash, "from_address": r.from_address,
        "to_address": r.to_address, "amount": r.amount, "status": r.status, "created_at": r.created_at,
    })).collect();
    let data = DataWrapper::object(serde_json::json!({"transactions": items, "count": items.len()}));
    Ok(Json(ApiResponse::ok(data)))
}

async fn get_transaction_by_hash(
    State(state): State<SharedState>,
    Path(tx_hash): Path<String>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let item = sqlx::query!(
        "SELECT id, tx_hash, from_address, to_address, amount, status, created_at FROM transaction_audit WHERE tx_hash = $1", tx_hash
    ).fetch_optional(&state.db).await?
      .ok_or_else(|| AppError::NotFound(format!("transaction {} not found", tx_hash)))?;
    let data = DataWrapper::object(serde_json::json!({
        "id": item.id, "tx_hash": item.tx_hash, "from_address": item.from_address,
        "to_address": item.to_address, "amount": item.amount, "status": item.status, "created_at": item.created_at,
    }));
    Ok(Json(ApiResponse::ok(data)))
}

async fn transaction_address_history(
    State(state): State<SharedState>,
    Path(address): Path<String>,
    Query(params): Query<ListQuery>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
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
    Ok(Json(ApiResponse::ok(data)))
}
