use axum::{
    extract::{Path, Query, State},
    Json, Router,
};
use serde::Deserialize;

use crate::error::AppError;
use crate::repositories::asset_repo;
use crate::schemas::auth::{LoginRequest, LoginResponse, RefreshRequest};
use crate::schemas::common::{ApiResponse, DataWrapper, Pagination};
use crate::schemas::public::{
    AssetDetail, AssetListItem, KycStatusResponse, PlatformInfo,
    StakingConfig, StakingLimitResponse, StakingPeriodConfig,
    SubscriptionPreviewResponse, PltTokenInfo,
};
use crate::security::{jwt, wallet};
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
        .route("/api/v1/public/contracts/subscription", axum::routing::get(get_subscription_contract))
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
    let rows = sqlx::query!(
        "SELECT name, address, scope, contract_type, project_name FROM contract_deployment WHERE network = 'hardhat' AND status = 'active'"
    )
    .fetch_all(&state.db).await?;

    let mut groups: std::collections::HashMap<String, Vec<serde_json::Value>> = std::collections::HashMap::new();
    for r in rows {
        let group_key = match r.contract_type.as_str() {
            "stablecoin" => "stablecoin",
            "kyc" => "kyc",
            "rwa_token" | "platform_token" | "subscription" | "staking" | "liquidity_mining" => "defi",
            _ => "other",
        };
        let symbol = if r.name.starts_with("Mock") {
            r.name.strip_prefix("Mock").unwrap_or(&r.name).to_string()
        } else {
            r.name.clone()
        };
        let item = serde_json::json!({
            "name": r.name,
            "address": r.address,
            "symbol": symbol,
            "scope": r.scope,
            "project_name": r.project_name,
            "network": "hardhat",
            "chain_id": 31337
        });
        groups.entry(group_key.to_string()).or_default().push(item);
    }

    let data = DataWrapper::object(serde_json::json!({
        "network": "hardhat",
        "contracts": groups
    }));
    Ok(Json(ApiResponse::ok(data)))
}

async fn get_subscription_contract(
    State(state): State<SharedState>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let sub = sqlx::query!("SELECT address FROM contract_deployment WHERE name = 'Subscription' AND network = 'hardhat' AND status = 'active'")
        .fetch_optional(&state.db).await?
        .map(|r| r.address)
        .unwrap_or_default();
    let usdt = sqlx::query!("SELECT address FROM contract_deployment WHERE name = 'MockUSDT' AND network = 'hardhat' AND status = 'active'")
        .fetch_optional(&state.db).await?
        .map(|r| r.address)
        .unwrap_or_default();
    let rwa = sqlx::query!("SELECT address FROM contract_deployment WHERE name = 'RWATokenSTO' AND network = 'hardhat' AND status = 'active'")
        .fetch_optional(&state.db).await?
        .map(|r| r.address)
        .unwrap_or_default();
    let kyc = sqlx::query!("SELECT address FROM contract_deployment WHERE name = 'KYCManager' AND network = 'hardhat' AND status = 'active'")
        .fetch_optional(&state.db).await?
        .map(|r| r.address)
        .unwrap_or_default();

    let data = DataWrapper::object(serde_json::json!({
        "address": sub,
        "params": {
            "min_investment": 100,
            "max_investment": 1000000,
            "require_accredited": false,
            "paused": false,
            "apy_1m": 0.0,
            "apy_3m": 0.05,
            "apy_6m": 0.07,
            "apy_12m": 0.10
        },
        "usdt_address": usdt,
        "rwa_token_address": rwa,
        "kyc_manager_address": kyc,
    }));
    Ok(Json(ApiResponse::ok(data)))
}

async fn get_contract_by_name(
    State(state): State<SharedState>,
    Path(name): Path<String>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let row = sqlx::query!(
        "SELECT name, address, deployer_address, network, chain_id, scope, contract_type, project_name, tx_hash, status FROM contract_deployment WHERE name = $1 AND network = 'hardhat' AND status = 'active'",
        name
    )
    .fetch_optional(&state.db).await?;

    let data = match row {
        Some(r) => DataWrapper::object(serde_json::json!({
            "name": r.name,
            "address": r.address,
            "deployer_address": r.deployer_address,
            "network": r.network,
            "chain_id": r.chain_id,
            "scope": r.scope,
            "contract_type": r.contract_type,
            "project_name": r.project_name,
            "tx_hash": r.tx_hash,
            "status": r.status,
        })),
        None => DataWrapper::object(serde_json::json!({
            "name": name,
            "address": null,
        })),
    };
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
    State(state): State<SharedState>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<ApiResponse<DataWrapper<LoginResponse>>>, AppError> {
    let address = req.address.to_lowercase();
    let message = "SlimCryptoAccess";

    tracing::info!(address = %address, "Login attempt");

    match wallet::verify_eip191_signature(message, &req.signature, &address) {
        Ok(true) => {
            tracing::info!(address = %address, "Signature verified");
        }
        Ok(false) => {
            tracing::warn!(address = %address, "Signature mismatch - verification returned false");
            return Err(AppError::Unauthorized);
        }
        Err(e) => {
            tracing::error!(address = %address, error = %e, "Signature verification error");
            return Err(e);
        }
    }

    let roles_json = serde_json::json!(["user"]);
    let account = sqlx::query!(
        "INSERT INTO account (address, private_key, roles, network, last_login_dt, balance) 
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, '0') 
         ON CONFLICT(address, network) DO UPDATE SET last_login_dt = CURRENT_TIMESTAMP 
         RETURNING id, address, roles, network, balance, is_active, is_blocked",
        address,
        "",
        roles_json,
        "hardhat"
    )
    .fetch_one(&state.db).await?;

    tracing::info!(
        address = %address,
        account_id = account.id,
        is_active = account.is_active,
        is_blocked = account.is_blocked,
        "Account loaded"
    );

    if account.is_active == 0 || account.is_blocked == 1 {
        tracing::warn!(address = %address, "Account blocked or inactive");
        return Err(AppError::Forbidden);
    }

    let roles: Vec<String> = serde_json::from_str(&account.roles)
        .unwrap_or_else(|_| vec!["user".to_string()]);

    let session_version = 1u64;
    let access_token = jwt::create_access_token(&account.address, &roles, session_version, &state.config)?;
    let refresh_token = jwt::create_refresh_token(&account.address, session_version, &state.config)?;

    tracing::info!(address = %address, roles = ?roles, "Login successful, tokens issued");

    let resp = LoginResponse {
        access_token,
        refresh_token,
        token_type: "Bearer".to_string(),
        expires_in_mins: state.config.access_token_expire_minutes,
    };

    Ok(Json(ApiResponse::ok(DataWrapper::object(resp))))
}

async fn refresh_token(
    State(state): State<SharedState>,
    Json(req): Json<RefreshRequest>,
) -> Result<Json<ApiResponse<DataWrapper<LoginResponse>>>, AppError> {
    let claims = jwt::verify_token(&req.refresh_token, &state.config)?;
    if claims.token_type != "refresh" {
        return Err(AppError::Unauthorized);
    }

    let session_version = claims.session_version;
    let access_token = jwt::create_access_token(&claims.sub, &claims.roles, session_version, &state.config)?;
    let refresh_token = jwt::create_refresh_token(&claims.sub, session_version, &state.config)?;

    let resp = LoginResponse {
        access_token,
        refresh_token,
        token_type: "Bearer".to_string(),
        expires_in_mins: state.config.access_token_expire_minutes,
    };

    Ok(Json(ApiResponse::ok(DataWrapper::object(resp))))
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
    use crate::schemas::public::{AddressInfoEntry, ChainInfo as ChainInfoSchema};

    // 从数据库查询活跃合约
    let rows = sqlx::query!(
        "SELECT id, name, address, deployer_address, scope, contract_type, status, abi_path
         FROM contract_deployment
         WHERE network = 'hardhat' AND status = 'active'"
    )
    .fetch_all(&state.db)
    .await?;

    let contracts: Vec<AddressInfoEntry> = rows
        .into_iter()
        .map(|r| {
            let abi_info = r
                .abi_path
                .as_deref()
                .and_then(|path| {
                    // 尝试从文件读取 ABI JSON
                    std::fs::read_to_string(path).ok()
                })
                .and_then(|content| serde_json::from_str::<Vec<serde_json::Value>>(&content).ok())
                .unwrap_or_default();

            AddressInfoEntry {
                id: r.id,
                scope: r.scope,
                contract_type: r.contract_type,
                status: r.status,
                address: r.address,
                deployer_address: r.deployer_address,
                name: r.name,
                abi_info,
            }
        })
        .collect();

    let info = PlatformInfo {
        app_name: state.config.app_name.clone(),
        version: "1.0.0".to_string(),
        environment: state.config.environment.clone(),
        chain: ChainInfoSchema {
            name: state.config.chain.name.clone(),
            network: state.config.chain.network.clone(),
            chain_id: state.config.chain.chain_id,
            rpc_url: state.config.chain.rpc_url.clone(),
        },
        contracts,
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
