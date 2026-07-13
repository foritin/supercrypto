use axum::{
    body::Body,
    extract::{Multipart, Path, Query, State},
    http::{StatusCode, header},
    response::Response,
    Json, Router,
};
use serde::Deserialize;

use crate::error::AppError;
use crate::repositories::media_repo;
use crate::schemas::common::{ApiResponse, DataWrapper, Pagination};
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
}

async fn get_me(
    State(_state): State<SharedState>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    // TODO: get user from request extension (JWT)
    let data = DataWrapper::object(serde_json::json!({
        "id": 1,
        "address": "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        "roles": [],
        "network": "hardhat"
    }));
    Ok(Json(ApiResponse::ok(data)))
}

async fn create_subscription(
    State(state): State<SharedState>,
    Json(req): Json<CreateSubscriptionRequest>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    // Get asset to calculate APY
    let asset = sqlx::query!(
        "SELECT apy_3m, apy_6m, apy_12m FROM asset WHERE id = $1",
        req.asset_id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("asset {} not found", req.asset_id)))?;

    let apy = match req.lock_period {
        3 => asset.apy_3m,
        6 => asset.apy_6m,
        12 => asset.apy_12m,
        _ => asset.apy_3m,
    };

    let wallet_address = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
    let environment = "hardhat";
    let status = "pending";
    let token_type = req.token_type.clone();

    let result = sqlx::query!(
        "INSERT INTO subscription (wallet_address, asset_id, amount, token_type, lock_period, apy, status, environment) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
        wallet_address,
        req.asset_id,
        req.amount,
        token_type,
        req.lock_period,
        apy,
        status,
        environment
    )
    .fetch_one(&state.db)
    .await?;

    let data = DataWrapper::object(serde_json::json!({
        "id": result.id,
        "status": "pending",
        "message": "Subscription created, awaiting confirmation"
    }));
    Ok(Json(ApiResponse::ok(data)))
}

async fn list_subscriptions(
    State(state): State<SharedState>,
    Query(params): Query<ListQuery>,
) -> Result<Json<ApiResponse<DataWrapper<SubscriptionResponse>>>, AppError> {
    let offset = (params.page - 1).max(0) * params.page_size;
    let wallet_address = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";

    let items = sqlx::query_as!(
        SubscriptionResponse,
        r#"
        SELECT id, wallet_address, asset_id, amount, token_type,
        lock_period, apy, rwa_token_amount, start_date, end_date,
        expected_interest, actual_interest, tx_hash, status, created_at
        FROM subscription
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
        "SELECT COUNT(*) FROM subscription WHERE wallet_address = $1 AND environment = 'hardhat'",
        wallet_address
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let pagination = Pagination::new(total, params.page, params.page_size);
    let data = DataWrapper::list(items, pagination);
    Ok(Json(ApiResponse::ok(data)))
}

async fn get_subscription(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<DataWrapper<SubscriptionResponse>>>, AppError> {
    let item = sqlx::query_as!(
        SubscriptionResponse,
        r#"
        SELECT id, wallet_address, asset_id, amount, token_type,
        lock_period, apy, rwa_token_amount, start_date, end_date,
        expected_interest, actual_interest, tx_hash, status, created_at
        FROM subscription
        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("subscription {} not found", id)))?;

    let data = DataWrapper::object(item);
    Ok(Json(ApiResponse::ok(data)))
}

async fn redeem_subscription(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    sqlx::query!(
        "UPDATE subscription SET status = 'redeemed', redeemed_at = CURRENT_TIMESTAMP WHERE id = $1",
        id
    )
    .execute(&state.db)
    .await?;

    let data = DataWrapper::msg("Redemption initiated");
    Ok(Json(ApiResponse::ok(data)))
}

async fn create_pending(
    State(state): State<SharedState>,
    Json(req): Json<CreateSubscriptionRequest>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    // Same as create_subscription but returns tx to sign
    let result = sqlx::query!(
        "INSERT INTO subscription (wallet_address, asset_id, amount, token_type, lock_period, apy, status, environment) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
        "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        req.asset_id,
        req.amount,
        req.token_type,
        req.lock_period,
        "0",
        "pending",
        "hardhat"
    )
    .fetch_one(&state.db)
    .await?;

    let data = DataWrapper::object(serde_json::json!({
        "id": result.id,
        "status": "pending",
        "message": "Please sign and send the transaction"
    }));
    Ok(Json(ApiResponse::ok(data)))
}

async fn confirm_subscription(
    State(state): State<SharedState>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let tx_hash = req.get("tx_hash")
        .and_then(|v| v.as_str())
        .ok_or_else(|| AppError::BadRequest("tx_hash required".to_string()))?;

    sqlx::query!(
        "UPDATE subscription SET status = 'active', start_date = CURRENT_TIMESTAMP, tx_hash = $1 WHERE tx_hash IS NULL AND status = 'pending'",
        tx_hash
    )
    .execute(&state.db)
    .await?;

    let data = DataWrapper::msg("Subscription confirmed");
    Ok(Json(ApiResponse::ok(data)))
}

async fn get_receipt(
    State(state): State<SharedState>,
    Path(tx_hash): Path<String>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
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
    Ok(Json(ApiResponse::ok(data)))
}

async fn create_staking(
    State(state): State<SharedState>,
    Json(req): Json<CreateStakingRequest>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let wallet_address = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
    let now = chrono::Utc::now().naive_utc();
    let end_date = now + chrono::Duration::days(req.period as i64);
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
        req.amount,
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
    Ok(Json(ApiResponse::ok(data)))
}

async fn list_staking(
    State(state): State<SharedState>,
    Query(params): Query<ListQuery>,
) -> Result<Json<ApiResponse<DataWrapper<StakingResponse>>>, AppError> {
    let offset = (params.page - 1).max(0) * params.page_size;
    let wallet_address = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";

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
    Ok(Json(ApiResponse::ok(data)))
}

async fn get_staking(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<DataWrapper<StakingResponse>>>, AppError> {
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
    Ok(Json(ApiResponse::ok(data)))
}

async fn unstake(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    sqlx::query!(
        "UPDATE staking_record SET status = 'completed', unstake_tx_hash = $2 WHERE id = $1",
        id,
        "0xplaceholder"
    )
    .execute(&state.db)
    .await?;

    let data = DataWrapper::msg("Unstaked successfully");
    Ok(Json(ApiResponse::ok(data)))
}

async fn claim_rewards(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let wallet_address = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";

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
    Ok(Json(ApiResponse::ok(data)))
}

async fn upload_document(
    State(state): State<SharedState>,
    mut multipart: Multipart,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    // 占位：从 JWT 获取 address，当前使用硬编码
    let owner_address = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
    let storage_dir = "data/files";

    let mut saved = None;
    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        let name = field.name().unwrap_or("file").to_string();
        if name == "file" || name == "document" {
            let file_name = field.file_name().unwrap_or("upload.bin").to_string();
            let mime_type = field.content_type().map(|s| s.to_string());
            let data = field.bytes().await.map_err(|e| AppError::BadRequest(e.to_string()))?;
            let media = media_repo::save_file(&state.db, owner_address, &file_name, mime_type.as_deref(), &data, storage_dir).await?;
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
            Ok(Json(ApiResponse::ok(data)))
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
            if let Some(mime) = &media.mime_type {
                builder = builder.header(header::CONTENT_TYPE, mime);
            }
            builder = builder.header(
                header::CONTENT_DISPOSITION,
                format!(r#"attachment; filename="{}""#, media.file_name),
            );
            Ok(builder.body(Body::from(bytes)).unwrap())
        }
        None => Err(AppError::NotFound(format!("media {} not found", id))),
    }
}

async fn apply_kyc(
    State(state): State<SharedState>,
    Json(req): Json<KycApplyRequest>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let address = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
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
    Ok(Json(ApiResponse::ok(data)))
}
