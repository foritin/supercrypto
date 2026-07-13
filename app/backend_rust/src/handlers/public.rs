use axum::{
    extract::{Path, Query, State},
    Json, Router,
};
use serde::Deserialize;

use crate::error::AppError;
use crate::repositories::asset_repo;
use crate::schemas::common::{ApiResponse, DataWrapper, Pagination};
use crate::schemas::public::{
    AssetDetail, AssetListItem, KycStatusResponse, PlatformInfo,
    StakingConfig, StakingLimitResponse, StakingPeriodConfig,
    SubscriptionPreviewResponse, PltTokenInfo,
};
use crate::state::SharedState;

#[derive(Debug, Deserialize)]
pub struct ListAssetsQuery {
    #[serde(default = "default_page")]
    page: i64,
    #[serde(default = "default_page_size")]
    page_size: i64,
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct PreviewQuery {
    asset_id: i64,
    amount: String, // parse as Decimal
    token_type: Option<String>,
    lock_period: Option<i64>,
}

fn default_page() -> i64 { 1 }
fn default_page_size() -> i64 { 10 }

pub fn routes() -> Router<SharedState> {
    Router::new()
        .route("/api/v1/public/assets", axum::routing::get(list_assets))
        .route("/api/v1/public/assets/{id}", axum::routing::get(get_asset))
        .route("/api/v1/public/assets/symbol/{symbol}", axum::routing::get(get_asset_by_symbol))
        .route("/api/v1/public/assets/{id}/price-history", axum::routing::get(get_price_history))
        .route("/api/v1/public/contracts/addresses", axum::routing::get(get_contract_addresses))
        .route("/api/v1/public/contracts/{name}", axum::routing::get(get_contract_by_name))
        .route("/api/v1/public/subscriptions/preview", axum::routing::get(preview_subscription))
        .route("/api/v1/public/staking/config", axum::routing::get(get_staking_config))
        .route("/api/v1/public/staking/limit", axum::routing::get(get_staking_limit))
        .route("/api/v1/public/kyc/status/{address}", axum::routing::get(get_kyc_status))
        .route("/api/v1/public/auth/token", axum::routing::post(login))
        .route("/api/v1/public/auth/refresh", axum::routing::post(refresh_token))
        .route("/api/v1/public/auth/logout", axum::routing::post(logout))
        .route("/api/v1/public/info", axum::routing::get(get_info))
        .route("/api/v1/public/constants", axum::routing::get(get_constants))
}

async fn list_assets(
    State(state): State<SharedState>,
    Query(params): Query<ListAssetsQuery>,
) -> Result<Json<ApiResponse<DataWrapper<AssetListItem>>>, AppError> {
    let (items, total) = asset_repo::list_assets(
        &state.db,
        params.status.as_deref(),
        Some("hardhat"),
        params.page,
        params.page_size,
    )
    .await?;

    let pagination = Pagination::new(total, params.page, params.page_size);
    let data = DataWrapper::list(items, pagination);
    Ok(Json(ApiResponse::ok(data)))
}

async fn get_asset(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<DataWrapper<AssetDetail>>>, AppError> {
    let item = asset_repo::get_asset_by_id(&state.db, id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("asset {} not found", id)))?;

    let data = DataWrapper::object(item);
    Ok(Json(ApiResponse::ok(data)))
}

async fn get_asset_by_symbol(
    State(state): State<SharedState>,
    Path(symbol): Path<String>,
) -> Result<Json<ApiResponse<DataWrapper<AssetDetail>>>, AppError> {
    let item = asset_repo::get_asset_by_symbol(&state.db, &symbol)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("asset symbol {} not found", symbol)))?;

    let data = DataWrapper::object(item);
    Ok(Json(ApiResponse::ok(data)))
}

async fn get_price_history(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
    Query(params): Query<PriceHistoryQuery>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let limit = params.limit.unwrap_or(50);
    let history = asset_repo::get_price_history(&state.db, id, limit).await?;
    let data = DataWrapper::object(serde_json::to_value(history).unwrap_or_default());
    Ok(Json(ApiResponse::ok(data)))
}

#[derive(Debug, Deserialize)]
pub struct PriceHistoryQuery {
    limit: Option<i64>,
}

async fn get_contract_addresses(
    State(state): State<SharedState>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let bindings = asset_repo::get_contract_addresses(&state.db, Some("hardhat")).await?;
    let items: Vec<serde_json::Value> = bindings.into_iter().map(|b| serde_json::json!({
        "name": b.contract_name,
        "address": b.contract_address,
        "project_name": b.contract_type,
        "network": "hardhat",
        "chain_id": 31337
    })).collect();

    let total = items.len() as i64;
    let data = DataWrapper::list(items, Pagination::new(total, 1, 100));
    Ok(Json(ApiResponse::ok(data)))
}

async fn get_contract_by_name(
    Path(_name): Path<String>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    // TODO: implement
    let data = DataWrapper::object(serde_json::json!({}));
    Ok(Json(ApiResponse::ok(data)))
}

async fn preview_subscription(
    Query(_params): Query<PreviewQuery>,
) -> Result<Json<ApiResponse<DataWrapper<SubscriptionPreviewResponse>>>, AppError> {
    // TODO: implement preview calculation
    let preview = SubscriptionPreviewResponse {
        asset_id: 0,
        amount: "0".to_string(),
        token_type: "USDT".to_string(),
        lock_period: 0,
        apy: "0".to_string(),
        expected_interest: "0".to_string(),
        total_return: "0".to_string(),
        start_date: chrono::Utc::now().naive_utc(),
        end_date: None,
    };
    let data = DataWrapper::object(preview);
    Ok(Json(ApiResponse::ok(data)))
}

async fn get_staking_config() -> Result<Json<ApiResponse<DataWrapper<StakingConfig>>>, AppError> {
    let config = StakingConfig {
        periods: vec![
            StakingPeriodConfig { days: 15, multiplier: "1.0".to_string(), label: "15 Days".to_string() },
            StakingPeriodConfig { days: 30, multiplier: "2.5".parse().unwrap(), label: "30 Days".to_string() },
            StakingPeriodConfig { days: 45, multiplier: "4.5".parse().unwrap(), label: "45 Days".to_string() },
            StakingPeriodConfig { days: 60, multiplier: "7.0".parse().unwrap(), label: "60 Days".to_string() },
        ],
        plt_token: PltTokenInfo {
            symbol: "PLT".to_string(),
            name: "Platform Token".to_string(),
            decimals: 18,
        },
    };
    let data = DataWrapper::object(config);
    Ok(Json(ApiResponse::ok(data)))
}

async fn get_staking_limit(
    State(state): State<SharedState>,
) -> Result<Json<ApiResponse<DataWrapper<StakingLimitResponse>>>, AppError> {
    let today = chrono::Utc::now().naive_utc().date().to_string();
    let row = sqlx::query_as!(
        crate::models::staking::StakingLimit,
        r#"SELECT id, date, base_limit, carried_limit, used_limit, environment, created_at, updated_at
           FROM staking_limit WHERE date = $1 AND environment = 'hardhat'"#,
        today
    )
    .fetch_optional(&state.db)
    .await?;

    let resp = match row {
        Some(r) => {
            let base = r.base_limit.parse::<f64>().unwrap_or(0.0);
        let carried = r.carried_limit.parse::<f64>().unwrap_or(0.0);
        let used = r.used_limit.parse::<f64>().unwrap_or(0.0);
        let total = (base + carried).to_string();
        let remaining = (base + carried - used).to_string();
            
            
            StakingLimitResponse {
                date: r.date.to_string(),
                base_limit: r.base_limit,
                carried_limit: r.carried_limit,
                used_limit: r.used_limit,
                remaining_limit: remaining,
                total_limit: total,
                is_exhausted: if base + carried - used <= 0.0 { 1 } else { 0 },
            }
        }
        None => StakingLimitResponse {
            date: today.to_string(),
            base_limit: "100000".to_string(),
            carried_limit: "0".to_string(),
            used_limit: "0".to_string(),
            remaining_limit: "100000".to_string(),
            total_limit: "100000".to_string(),
            is_exhausted: 0i64,
        },
    };

    let data = DataWrapper::object(resp);
    Ok(Json(ApiResponse::ok(data)))
}

async fn get_kyc_status(
    State(state): State<SharedState>,
    Path(address): Path<String>,
) -> Result<Json<ApiResponse<DataWrapper<KycStatusResponse>>>, AppError> {
    let address = address.to_lowercase();
    let row = sqlx::query!(
        "SELECT status FROM account_kyc WHERE address = $1",
        address
    )
    .fetch_optional(&state.db)
    .await?;

    let status = row.map(|r| r.status.unwrap_or_else(|| "not_started".to_string())).unwrap_or_else(|| "not_started".to_string());
    let is_verified: i64 = if status == "approved" { 1 } else { 0 };

    let resp = KycStatusResponse {
        address: address.to_lowercase(),
        status,
        is_verified,
    };

    let data = DataWrapper::object(resp);
    Ok(Json(ApiResponse::ok(data)))
}

async fn login(
    State(_state): State<SharedState>,
    Json(_req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    // TODO: implement wallet signature verification and JWT generation
    let data = DataWrapper::object(serde_json::json!({
        "access_token": "placeholder",
        "refresh_token": "placeholder",
        "token_type": "Bearer",
        "expires_in_mins": 120
    }));
    Ok(Json(ApiResponse::ok(data)))
}

async fn refresh_token(
    State(_state): State<SharedState>,
    Json(_req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    // TODO: implement refresh
    let data = DataWrapper::object(serde_json::json!({
        "access_token": "placeholder",
        "refresh_token": "placeholder",
        "token_type": "Bearer",
        "expires_in_mins": 120
    }));
    Ok(Json(ApiResponse::ok(data)))
}

async fn logout(
    State(_state): State<SharedState>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let data = DataWrapper::msg("Logged out");
    Ok(Json(ApiResponse::ok(data)))
}

async fn get_info(
    State(state): State<SharedState>,
) -> Result<Json<ApiResponse<DataWrapper<PlatformInfo>>>, AppError> {
    let info = PlatformInfo {
        app_name: state.config.app_name.clone(),
        version: "1.0.0".to_string(),
        environment: state.config.environment.clone(),
        chain: crate::schemas::public::ChainInfo {
            name: state.config.chain.name.clone(),
            network: state.config.chain.network.clone(),
            chain_id: state.config.chain.chain_id,
            rpc_url: state.config.chain.rpc_url.clone(),
        },
        contracts: vec![],
    };
    let data = DataWrapper::object(info);
    Ok(Json(ApiResponse::ok(data)))
}

async fn get_constants() -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let data = DataWrapper::object(serde_json::json!({
        "networks": ["hardhat", "sepolia", "mainnet"],
        "token_types": ["USDT", "USDC"],
        "asset_types": ["real_estate", "fund", "commodity", "other"],
        "kyc_statuses": ["not_started", "pending", "approved", "rejected"],
        "subscription_statuses": ["pending", "active", "redeemed", "cancelled"],
        "staking_statuses": ["active", "completed", "cancelled"],
    }));
    Ok(Json(ApiResponse::ok(data)))
}
