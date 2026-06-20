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
        .route("/api/v1/admin/assets", axum::routing::post(create_asset))
        .route("/api/v1/admin/assets", axum::routing::get(list_assets))
        .route("/api/v1/admin/assets/{id}", axum::routing::get(get_asset))
        .route("/api/v1/admin/assets/{id}", axum::routing::put(update_asset))
        .route("/api/v1/admin/assets/{id}/status", axum::routing::patch(update_asset_status))
        .route("/api/v1/admin/assets/{id}/price", axum::routing::post(update_asset_price))
        .route("/api/v1/admin/assets/{id}/bind-project", axum::routing::post(bind_project))
        .route("/api/v1/admin/assets/{id}/unbind", axum::routing::delete(unbind_project))
        .route("/api/v1/admin/contracts/status", axum::routing::get(get_contract_status))
        .route("/api/v1/admin/stats", axum::routing::get(get_stats))
        .route("/api/v1/admin/kyc/", axum::routing::get(list_kyc))
        .route("/api/v1/admin/kyc/{id}", axum::routing::get(get_kyc))
        .route("/api/v1/admin/kyc/{id}/review", axum::routing::post(review_kyc))
        .route("/api/v1/admin/accounts", axum::routing::post(create_account))
        .route("/api/v1/admin/accounts", axum::routing::get(list_accounts))
        .route("/api/v1/admin/accounts/{id}", axum::routing::get(get_account))
        .route("/api/v1/admin/transactions", axum::routing::post(create_transaction))
        .route("/api/v1/admin/transactions", axum::routing::get(list_transactions))
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
    Path(id): Path<i32>,
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
    Path(id): Path<i32>,
    Json(req): Json<UpdateAssetRequest>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    if let Some(name) = req.name {
        sqlx::query!("UPDATE asset SET name = $2, updated_at = NOW() WHERE id = $1", id, name)
            .execute(&state.db).await?;
    }
    if let Some(price) = req.current_price {
        sqlx::query!("UPDATE asset SET current_price = $2, updated_at = NOW() WHERE id = $1", id, price)
            .execute(&state.db).await?;
    }
    if let Some(status) = req.status {
        sqlx::query!("UPDATE asset SET status = $2, updated_at = NOW() WHERE id = $1", id, status)
            .execute(&state.db).await?;
    }

    let data = DataWrapper::msg("Asset updated");
    Ok(Json(ApiResponse::ok(data)))
}

async fn update_asset_status(
    State(state): State<SharedState>,
    Path(id): Path<i32>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let status = req.get("status")
        .and_then(|v| v.as_str())
        .ok_or_else(|| AppError::BadRequest("status required".to_string()))?;

    sqlx::query!("UPDATE asset SET status = $2, updated_at = NOW() WHERE id = $1", id, status)
        .execute(&state.db).await?;

    let data = DataWrapper::msg("Status updated");
    Ok(Json(ApiResponse::ok(data)))
}

async fn update_asset_price(
    State(state): State<SharedState>,
    Path(id): Path<i32>,
    Json(req): Json<UpdateAssetPriceRequest>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    sqlx::query!(
        "UPDATE asset SET current_price = $2, price_updated_at = NOW(), updated_at = NOW() WHERE id = $1",
        id,
        req.price
    )
    .execute(&state.db).await?;

    let data = DataWrapper::msg("Price updated");
    Ok(Json(ApiResponse::ok(data)))
}

async fn bind_project(
    State(state): State<SharedState>,
    Path(id): Path<i32>,
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

    sqlx::query!("UPDATE asset SET contract_address = $2, updated_at = NOW() WHERE id = $1", id, req.contract_address)
        .execute(&state.db).await?;

    let data = DataWrapper::msg("Project bound");
    Ok(Json(ApiResponse::ok(data)))
}

async fn unbind_project(
    State(state): State<SharedState>,
    Path(id): Path<i32>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    sqlx::query!("DELETE FROM asset_contract_binding WHERE asset_id = $1", id)
        .execute(&state.db).await?;

    sqlx::query!("UPDATE asset SET contract_address = NULL, updated_at = NOW() WHERE id = $1", id)
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

    let data = DataWrapper::list(items, Pagination::new(items.len() as i64, 1, 100));
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
        total_tvl: total_tvl.map(|v: rust_decimal::Decimal| v).unwrap_or_default(),
        total_staking_rewards: total_rewards.map(|v: rust_decimal::Decimal| v).unwrap_or_default(),
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
    Path(id): Path<i32>,
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
            id_type: d.id_type,
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
    Path(id): Path<i32>,
    Json(req): Json<KycReviewRequest>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    sqlx::query!(
        "UPDATE account_kyc SET status = $2, reviewer_address = $3, reject_reason = $4, reviewed_at = NOW(), updated_at = NOW() WHERE id = $1",
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
    let result = sqlx::query!(
        "INSERT INTO account (address, private_key, roles, network, is_active, balance) VALUES ($1, $2, $3, $4, true, 0) RETURNING id",
        req.address.to_lowercase(),
        req.private_key,
        roles,
        req.network
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
    Path(id): Path<i32>,
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
    Path(id): Path<i32>,
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
