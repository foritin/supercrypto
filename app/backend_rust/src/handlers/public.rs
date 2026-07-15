use axum::{
    extract::{Path, Query, State},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;

use crate::error::AppError;
use crate::repositories::asset_repo;
use crate::schemas::auth::{LoginRequest, LoginResponse, RefreshRequest};
use crate::schemas::common::{DataWrapper, Pagination};
use crate::schemas::public::{
    PlatformInfo,
    StakingLimitResponse,
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
        .route("/api/v1/public/contracts", axum::routing::get(list_public_contracts))
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
        // --- Missing public endpoints ---
        .route("/api/v1/public/chains", axum::routing::get(get_chains))
        .route("/api/v1/public/chains/{chain_id}", axum::routing::get(get_chain_by_id))
        .route("/api/v1/public/constants/{group}", axum::routing::get(get_constants_group))
        .route("/api/v1/public/staking/plt-token", axum::routing::get(get_plt_token_info))
        .route("/api/v1/public/assets/{id}/media", axum::routing::get(get_asset_media_public))
        .route("/api/v1/public/time", axum::routing::get(get_time))
}

async fn list_assets(
    State(state): State<SharedState>,
    Query(params): Query<ListAssetsQuery>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let (items, total) = asset_repo::list_assets(
        &state.db,
        params.status.as_deref(),
        Some("hardhat"),
        params.page,
        params.page_size,
    )
    .await?;

    let items: Vec<serde_json::Value> = {
        let mut json_items = Vec::new();
        for item in items {
            let ts = item.total_supply;
            let sa = item.subscribed_amount;
            let cover = sqlx::query_scalar!(
                "SELECT url FROM asset_media WHERE asset_id = $1 AND media_type = 'cover' ORDER BY sort_order LIMIT 1",
                item.id
            ).fetch_optional(&state.db).await.ok().flatten();
            let logo = sqlx::query_scalar!(
                "SELECT url FROM asset_media WHERE asset_id = $1 AND media_type = 'logo' ORDER BY sort_order LIMIT 1",
                item.id
            ).fetch_optional(&state.db).await.ok().flatten();
            json_items.push(serde_json::json!({
            "id": item.id,
            "name": item.name,
            "symbol": item.symbol,
            "description": item.description,
            "asset_type": item.asset_type,
            "image_url": item.image_url,
            "cover_image_url": cover,
            "logo_url": logo,
            "frame_style": null,
            "location": item.location,
            "current_price": item.current_price,
            "total_supply": ts,
            "subscribed_amount": sa,
            "min_subscription": item.min_subscription,
            "apy_3m": item.apy_3m,
            "apy_6m": item.apy_6m,
            "apy_12m": item.apy_12m,
            "subscription_mode": item.subscription_mode,
            "contract_address": item.contract_address,
            "subscription_progress": if ts > 0.0 { sa / ts * 100.0 } else { 0.0 },
            "is_available": item.status == "active",
            "status": item.status,
            "environment": item.environment,
            "created_at": item.created_at,
            "updated_at": item.updated_at,
            }));
        }
        json_items
    };

    let pagination = Pagination::new(total, params.page, params.page_size);
    let data = DataWrapper::list(items, pagination);
   Ok(Json(data))
}

async fn list_public_contracts(
    State(state): State<SharedState>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let (contracts, _total) = crate::repositories::contract_repo::list_deployments(
        &state.db,
        Some(&state.config.chain.network),
        None,
        None,
        1,
        1000,
    ).await?;
    let items: Vec<serde_json::Value> = contracts.into_iter().map(|c| serde_json::json!({
        "id": c.id,
        "name": c.name,
        "contract_type": c.contract_type,
        "address": c.address,
        "network": c.network,
        "project_name": c.project_name,
        "status": c.status,
        "scope": c.scope,
        "created_at": c.created_at,
    })).collect();
    let count = items.len() as i64;
    let data = DataWrapper::list(items, Pagination::new(count, 1, count));
    Ok(Json(data))
}

async fn get_asset(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let item = asset_repo::get_asset_by_id(&state.db, id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("asset {} not found", id)))?;

    let ts = item.total_supply;
    let sa = item.subscribed_amount;

    // Query cover/logo URLs and full media list from asset_media
    let cover_url = sqlx::query_scalar!(
        "SELECT url FROM asset_media WHERE asset_id = $1 AND media_type = 'cover' ORDER BY sort_order LIMIT 1",
        item.id
    ).fetch_optional(&state.db).await.ok().flatten();
    let logo_url = sqlx::query_scalar!(
        "SELECT url FROM asset_media WHERE asset_id = $1 AND media_type = 'logo' ORDER BY sort_order LIMIT 1",
        item.id
    ).fetch_optional(&state.db).await.ok().flatten();
    let media_rows = sqlx::query!(
        "SELECT am.id, am.media_type, am.url, am.title, am.description, am.sort_order, am.is_primary, am.created_at, mf.file_name, mf.file_size, mf.mime_type FROM asset_media am LEFT JOIN media_files mf ON am.media_id = mf.id WHERE am.asset_id = $1 ORDER BY am.sort_order ASC, am.created_at DESC",
        item.id
    ).fetch_all(&state.db).await?;
    let media: Vec<serde_json::Value> = media_rows.into_iter().map(|r| serde_json::json!({
        "id": r.id, "media_type": r.media_type, "url": r.url,
        "title": r.title, "description": r.description,
        "sort_order": r.sort_order, "is_primary": r.is_primary,
        "file_name": r.file_name, "file_size": r.file_size,
        "mime_type": r.mime_type, "created_at": r.created_at,
    })).collect();

    let data = DataWrapper::object(serde_json::json!({
        "id": item.id,
        "name": item.name,
        "symbol": item.symbol,
        "description": item.description,
        "asset_type": item.asset_type,
        "image_url": item.image_url,
        "cover_image_url": cover_url,
        "document_url": item.document_url,
        "location": item.location,
        "current_price": item.current_price,
        "price_updated_at": item.price_updated_at,
        "total_supply": ts,
        "subscribed_amount": sa,
        "min_subscription": item.min_subscription,
        "remaining_amount": ts - sa,
        "subscription_progress": if ts > 0.0 { sa / ts * 100.0 } else { 0.0 },
        "subscription_start_at": item.subscription_start_at,
        "subscription_end_at": item.subscription_end_at,
        "apy_3m": item.apy_3m,
        "apy_6m": item.apy_6m,
        "apy_12m": item.apy_12m,
        "subscription_mode": item.subscription_mode,
        "project": item.project,
        "contract_address": item.contract_address,
        "frame_style": item.frame_style,
        "logo_url": logo_url,
        "media": media,
        "status": item.status,
        "is_available": item.status == "active",
        "environment": item.environment,
        "chain_id": 31337,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
        "investor_count": 0,
        "recent_investors": null,
    }));
    Ok(Json(data))
}

async fn get_asset_by_symbol(
    State(state): State<SharedState>,
    Path(symbol): Path<String>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let item = asset_repo::get_asset_by_symbol(&state.db, &symbol)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("asset symbol {} not found", symbol)))?;

    let ts = item.total_supply;
    let sa = item.subscribed_amount;

    // Query cover/logo URLs and full media list from asset_media
    let cover_url = sqlx::query_scalar!(
        "SELECT url FROM asset_media WHERE asset_id = $1 AND media_type = 'cover' ORDER BY sort_order LIMIT 1",
        item.id
    ).fetch_optional(&state.db).await.ok().flatten();
    let logo_url = sqlx::query_scalar!(
        "SELECT url FROM asset_media WHERE asset_id = $1 AND media_type = 'logo' ORDER BY sort_order LIMIT 1",
        item.id
    ).fetch_optional(&state.db).await.ok().flatten();
    let media_rows = sqlx::query!(
        "SELECT am.id, am.media_type, am.url, am.title, am.description, am.sort_order, am.is_primary, am.created_at, mf.file_name, mf.file_size, mf.mime_type FROM asset_media am LEFT JOIN media_files mf ON am.media_id = mf.id WHERE am.asset_id = $1 ORDER BY am.sort_order ASC, am.created_at DESC",
        item.id
    ).fetch_all(&state.db).await?;
    let media: Vec<serde_json::Value> = media_rows.into_iter().map(|r| serde_json::json!({
        "id": r.id, "media_type": r.media_type, "url": r.url,
        "title": r.title, "description": r.description,
        "sort_order": r.sort_order, "is_primary": r.is_primary,
        "file_name": r.file_name, "file_size": r.file_size,
        "mime_type": r.mime_type, "created_at": r.created_at,
    })).collect();

    let data = DataWrapper::object(serde_json::json!({
        "id": item.id,
        "name": item.name,
        "symbol": item.symbol,
        "description": item.description,
        "asset_type": item.asset_type,
        "image_url": item.image_url,
        "cover_image_url": cover_url,
        "document_url": item.document_url,
        "location": item.location,
        "current_price": item.current_price,
        "price_updated_at": item.price_updated_at,
        "total_supply": ts,
        "subscribed_amount": sa,
        "min_subscription": item.min_subscription,
        "remaining_amount": ts - sa,
        "subscription_progress": if ts > 0.0 { sa / ts * 100.0 } else { 0.0 },
        "subscription_start_at": item.subscription_start_at,
        "subscription_end_at": item.subscription_end_at,
        "apy_3m": item.apy_3m,
        "apy_6m": item.apy_6m,
        "apy_12m": item.apy_12m,
        "subscription_mode": item.subscription_mode,
        "project": item.project,
        "contract_address": item.contract_address,
        "frame_style": item.frame_style,
        "logo_url": logo_url,
        "media": media,
        "status": item.status,
        "is_available": item.status == "active",
        "environment": item.environment,
        "chain_id": 31337,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
        "investor_count": 0,
        "recent_investors": null,
    }));
    Ok(Json(data))
}

async fn get_price_history(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
    Query(params): Query<PriceHistoryQuery>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let limit = params.limit.unwrap_or(50);
    let history = asset_repo::get_price_history(&state.db, id, limit).await?;
    let items: Vec<serde_json::Value> = history.into_iter().map(|h| serde_json::to_value(h).unwrap_or_default()).collect();
    let total = items.len() as i64;
    let data = DataWrapper::list(items, Pagination::new(total, 1, limit));
    Ok(Json(data))
}

#[derive(Debug, Deserialize)]
pub struct PriceHistoryQuery {
    limit: Option<i64>,
}

async fn get_contract_addresses(
    State(state): State<SharedState>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let rows = sqlx::query!(
        "SELECT name, address, scope, contract_type, project_name FROM contract_deployment WHERE network = 'hardhat' AND status = 'active'"
    )
    .fetch_all(&state.db).await?;

    let mut groups: std::collections::HashMap<String, Vec<serde_json::Value>> = std::collections::HashMap::new();
    for r in rows {
        let group_key = match r.contract_type.as_str() {
            "stablecoin" => "stablecoin",
            "kyc" => "kyc",
            "defi" | "subscription" | "staking" | "liquidity_mining" => "defi",
            "rwa_token" | "platform_token" | "token" => "defi",
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
    Ok(Json(data))
}

async fn get_subscription_contract(
    State(state): State<SharedState>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let sub = sqlx::query!("SELECT address FROM contract_deployment WHERE name = 'Subscription' AND network = 'hardhat' AND status = 'active'")
        .fetch_optional(&state.db).await?
        .map(|r| r.address)
        .unwrap_or_default();
    let usdt = sqlx::query!("SELECT address FROM contract_deployment WHERE name = 'MockUSDT' AND network = 'hardhat' AND status = 'active'")
        .fetch_optional(&state.db).await?
        .map(|r| r.address)
        .unwrap_or_default();
    let usdc = sqlx::query!("SELECT address FROM contract_deployment WHERE name = 'MockUSDC' AND network = 'hardhat' AND status = 'active'")
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
        "usdc_address": usdc,
        "rwa_token_address": rwa,
        "kyc_manager_address": kyc,
    }));
    Ok(Json(data))
}

async fn get_contract_by_name(
    State(state): State<SharedState>,
    Path(name): Path<String>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
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
    Ok(Json(data))
}

async fn preview_subscription(
    State(state): State<SharedState>,
    Query(params): Query<PreviewQuery>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let lock_period = params.lock_period.unwrap_or(3);
    let amount = params.amount.clone();
    let token_type = params.token_type.clone().unwrap_or_else(|| "USDT".to_string());

    // Look up asset for name/symbol/apy
    let asset = sqlx::query!(
        "SELECT id, name, symbol, apy_3m, apy_6m, apy_12m, current_price FROM asset WHERE id = $1",
        params.asset_id
    )
    .fetch_optional(&state.db)
    .await?;

    let (asset_name, asset_symbol, apy_str, price_str) = match asset {
        Some(a) => {
            let apy = match lock_period {
                6 => a.apy_6m,
                12 => a.apy_12m,
                _ => a.apy_3m,
            };
            (a.name, a.symbol, apy, a.current_price)
        }
        None => ("Unknown".to_string(), "UNK".to_string(), "0".to_string(), "1".to_string()),
    };

    let amount_f = amount.parse::<f64>().unwrap_or(0.0);
    let apy_f = apy_str.parse::<f64>().unwrap_or(0.0);
    let expected_interest = amount_f * apy_f * (lock_period as f64) / 12.0;
    let total_return = amount_f + expected_interest;
    let price_f = price_str.parse::<f64>().unwrap_or(1.0);
    let rwa_token_amount = if price_f > 0.0 { amount_f / price_f } else { 0.0 };
    let end_date = chrono::Utc::now().naive_utc() + chrono::Duration::days(lock_period * 30);

    let data = DataWrapper::object(serde_json::json!({
        "asset_id": params.asset_id,
        "asset_name": asset_name,
        "asset_symbol": asset_symbol,
        "amount": amount,
        "token_type": token_type,
        "lock_period": lock_period,
        "apy": apy_str,
        "expected_interest": expected_interest.to_string(),
        "total_return": total_return.to_string(),
        "end_date": end_date.to_string(),
        "rwa_token_amount": rwa_token_amount.to_string(),
    }));
    Ok(Json(data))
}

async fn get_staking_config() -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let data = DataWrapper::object(serde_json::json!({
        "periods": [
            {"period": 15, "multiplier": 1.0, "description": "15 Days (1.0x)"},
            {"period": 30, "multiplier": 2.5, "description": "30 Days (2.5x)"},
            {"period": 45, "multiplier": 4.5, "description": "45 Days (4.5x)"},
            {"period": 60, "multiplier": 7.0, "description": "60 Days (7.0x)"},
        ],
        "base_daily_rate": 0.0001,
        "min_stake_amount": 100,
    }));
    Ok(Json(data))
}

async fn get_staking_limit(
    State(state): State<SharedState>,
) -> Result<Json<DataWrapper<StakingLimitResponse>>, AppError> {
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
                is_exhausted: base + carried - used <= 0.0,
            }
        }
        None => StakingLimitResponse {
            date: today.to_string(),
            base_limit: "100000".to_string(),
            carried_limit: "0".to_string(),
            used_limit: "0".to_string(),
            remaining_limit: "100000".to_string(),
            total_limit: "100000".to_string(),
            is_exhausted: false,
        },
    };

    let data = DataWrapper::object(resp);
    Ok(Json(data))
}

async fn get_kyc_status(
    State(state): State<SharedState>,
    Path(address): Path<String>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let address = address.to_lowercase();
    let row = sqlx::query!(
        "SELECT status, submitted_at, reviewed_at, reject_reason, country_code, is_accredited, on_chain_sync_status FROM account_kyc WHERE address = $1",
        address
    )
    .fetch_optional(&state.db)
    .await?;

    let resp = match row {
        Some(r) => serde_json::json!({
            "wallet_address": address,
            "status": r.status.unwrap_or_else(|| "not_started".to_string()),
            "submitted_at": r.submitted_at,
            "reviewed_at": r.reviewed_at,
            "reject_reason": r.reject_reason,
            "country_code": r.country_code,
            "is_accredited": r.is_accredited.unwrap_or(0) != 0,
            "on_chain_sync_status": r.on_chain_sync_status,
        }),
        None => serde_json::json!({
            "wallet_address": address,
            "status": "not_started",
            "submitted_at": null,
            "reviewed_at": null,
            "reject_reason": null,
            "country_code": null,
            "is_accredited": false,
            "on_chain_sync_status": null,
        }),
    };

    let data = DataWrapper::object(resp);
    Ok(Json(data))
}

async fn login(
    State(state): State<SharedState>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<DataWrapper<LoginResponse>>, AppError> {
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

    Ok(Json(DataWrapper::object(resp)))
}

async fn refresh_token(
    State(state): State<SharedState>,
    Json(req): Json<RefreshRequest>,
) -> Result<Json<DataWrapper<LoginResponse>>, AppError> {
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

    Ok(Json(DataWrapper::object(resp)))
}

async fn logout(
    State(_state): State<SharedState>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let data = DataWrapper::msg("Logged out");
    Ok(Json(data))
}

async fn get_info(
    State(state): State<SharedState>,
) -> Result<Json<DataWrapper<PlatformInfo>>, AppError> {
    use crate::schemas::public::{AddressInfoEntry, ChainInfo as ChainInfoSchema};

    // 从数据库查询活跃合约（包含 abi 列）
    let rows = sqlx::query!(
        "SELECT id, name, address, deployer_address, scope, contract_type, status, abi_path, abi
         FROM contract_deployment
         WHERE network = 'hardhat' AND status = 'active'"
    )
    .fetch_all(&state.db)
    .await?;

    let contracts: Vec<AddressInfoEntry> = rows
        .into_iter()
        .map(|r| {
            // 优先从 abi 列（JSON 文本）解析，回退到 abi_path 文件
            let abi_info = r
                .abi
                .as_deref()
                .and_then(|json_str| serde_json::from_str::<Vec<serde_json::Value>>(json_str).ok())
                .or_else(|| {
                    r.abi_path
                        .as_deref()
                        .and_then(|path| std::fs::read_to_string(path).ok())
                        .and_then(|content| serde_json::from_str::<Vec<serde_json::Value>>(content.as_str()).ok())
                })
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
    Ok(Json(data))
}

async fn get_constants() -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let data = DataWrapper::object(serde_json::json!({
        "networks": ["hardhat", "sepolia", "mainnet"],
        "token_types": ["USDT", "USDC"],
        "asset_types": ["real_estate", "fund", "commodity", "other"],
        "kyc_statuses": ["not_started", "pending", "approved", "rejected"],
        "subscription_statuses": ["pending", "active", "redeemed", "cancelled"],
        "staking_statuses": ["active", "completed", "cancelled"],
    }));
    Ok(Json(data))
}

// ============================================
// Missing public endpoints
// ============================================

#[derive(Debug, Deserialize)]
pub struct ChainQuery {
    environment: Option<String>,
}

async fn get_chains(
    State(state): State<SharedState>,
    Query(params): Query<ChainQuery>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let env = params.environment.as_deref().unwrap_or("development");
    let rows = sqlx::query!(
        "SELECT chain_id, name, network, rpc_url, display_name, symbol, decimals, block_explorer, environment, is_testnet, is_enabled, sort_order FROM chain WHERE is_enabled = 1 AND environment = $1 ORDER BY sort_order, chain_id",
        env
    )
    .fetch_all(&state.db)
    .await?;

    let chains: Vec<serde_json::Value> = rows.into_iter().map(|r| serde_json::json!({
        "chain_id": r.chain_id,
        "name": r.name,
        "network": r.network,
        "rpc_url": r.rpc_url,
        "display_name": r.display_name,
        "symbol": r.symbol,
        "decimals": r.decimals,
        "block_explorer": r.block_explorer,
        "environment": r.environment,
        "is_testnet": r.is_testnet != 0,
        "is_enabled": r.is_enabled != 0,
        "sort_order": r.sort_order,
    })).collect();

    let data = DataWrapper::object(serde_json::json!({
        "chains": chains,
        "count": chains.len(),
    }));
    Ok(Json(data))
}

async fn get_chain_by_id(
    State(state): State<SharedState>,
    Path(chain_id): Path<i64>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let row = sqlx::query!(
        "SELECT chain_id, name, network, rpc_url, display_name, symbol, decimals, block_explorer, environment, is_testnet, is_enabled, sort_order FROM chain WHERE chain_id = $1",
        chain_id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("chain {} not found", chain_id)))?;

    let data = DataWrapper::object(serde_json::json!({
        "chain_id": row.chain_id,
        "name": row.name,
        "network": row.network,
        "rpc_url": row.rpc_url,
        "display_name": row.display_name,
        "symbol": row.symbol,
        "decimals": row.decimals,
        "block_explorer": row.block_explorer,
        "environment": row.environment,
        "is_testnet": row.is_testnet != 0,
        "is_enabled": row.is_enabled != 0,
        "sort_order": row.sort_order,
    }));
    Ok(Json(data))
}

async fn get_constants_group(
    State(_state): State<SharedState>,
    Path(group): Path<String>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    // Return hardcoded constants by group (same as Python registry)
    let constants = match group.as_str() {
        "networks" | "network" => serde_json::json!([
            {"value": "hardhat", "label": "Hardhat Local", "chain_id": 31337},
            {"value": "sepolia", "label": "Sepolia Testnet", "chain_id": 11155111},
            {"value": "mainnet", "label": "Ethereum Mainnet", "chain_id": 1},
        ]),
        "token_types" | "token_type" => serde_json::json!([
            {"value": "USDT", "label": "USDT"},
            {"value": "USDC", "label": "USDC"},
        ]),
        "asset_types" | "asset_type" => serde_json::json!([
            {"value": "real_estate", "label": "Real Estate"},
            {"value": "fund", "label": "Fund"},
            {"value": "commodity", "label": "Commodity"},
            {"value": "other", "label": "Other"},
        ]),
        "kyc_statuses" | "kyc_status" => serde_json::json!([
            {"value": "not_started", "label": "Not Started"},
            {"value": "pending", "label": "Pending"},
            {"value": "approved", "label": "Approved"},
            {"value": "rejected", "label": "Rejected"},
        ]),
        "subscription_statuses" | "subscription_status" => serde_json::json!([
            {"value": "pending", "label": "Pending"},
            {"value": "active", "label": "Active"},
            {"value": "redeemed", "label": "Redeemed"},
            {"value": "cancelled", "label": "Cancelled"},
        ]),
        "staking_statuses" | "staking_status" => serde_json::json!([
            {"value": "active", "label": "Active"},
            {"value": "completed", "label": "Completed"},
            {"value": "cancelled", "label": "Cancelled"},
        ]),
        "media_types" | "media_type" => serde_json::json!([
            {"value": "image", "label": "Image"},
            {"value": "document", "label": "Document"},
            {"value": "video", "label": "Video"},
            {"value": "other", "label": "Other"},
        ]),
        _ => return Err(AppError::NotFound(format!("constant group '{}' not found", group))),
    };
    let data = DataWrapper::object(constants);
    Ok(Json(data))
}

async fn get_plt_token_info(
    State(state): State<SharedState>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let total_staked = sqlx::query_scalar!(
        "SELECT COALESCE(SUM(CAST(amount AS REAL)), 0.0) FROM staking_record WHERE status = 'active'"
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0.0);

    let total_claimed = sqlx::query_scalar!(
        "SELECT COALESCE(SUM(CAST(claimed_rewards AS REAL)), 0.0) FROM staking_record"
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0.0);

    let data = DataWrapper::object(serde_json::json!({
        "name": "Platform Token",
        "symbol": "PLT",
        "total_supply": "1000000000",
        "circulating_supply": "100000000",
        "staking_pool_total": total_staked.to_string(),
        "total_claimed": total_claimed.to_string(),
        "price_usd": "1.00",
        "market_cap_usd": "100000000",
    }));
    Ok(Json(data))
}

async fn get_asset_media_public(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let rows = sqlx::query!(
        "SELECT id, asset_id, media_type, url, title, description, sort_order, is_primary, thumbnail_url, file_name, file_size, mime_type FROM asset_media WHERE asset_id = $1 ORDER BY sort_order",
        id
    )
    .fetch_all(&state.db)
    .await?;

    let media: Vec<serde_json::Value> = rows.into_iter().map(|r| serde_json::json!({
        "id": r.id,
        "asset_id": r.asset_id,
        "media_type": r.media_type,
        "url": r.url,
        "title": r.title,
        "description": r.description,
        "sort_order": r.sort_order,
        "is_primary": r.is_primary.unwrap_or(0) != 0,
        "thumbnail_url": r.thumbnail_url,
        "file_name": r.file_name,
        "file_size": r.file_size,
        "mime_type": r.mime_type,
    })).collect();

    let data = DataWrapper::object(serde_json::json!({ "media": media, "count": media.len() }));
    Ok(Json(data))
}

async fn get_time() -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let now = Utc::now();
    let data = DataWrapper::object(serde_json::json!({
        "timestamp": now.timestamp(),
        "iso": now.to_rfc3339(),
        "formatted": now.format("%Y-%m-%d %H:%M UTC").to_string(),
    }));
    Ok(Json(data))
}
