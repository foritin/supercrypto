use alloy::primitives::{Address, utils::parse_ether};
use alloy::providers::{Provider, ProviderBuilder};
use alloy::signers::local::PrivateKeySigner;
use std::str::FromStr;

use axum::{
    extract::{Path, State},
    Json, Router,
};
use serde::Deserialize;

use crate::error::AppError;
use crate::schemas::common::{DataWrapper};
use crate::state::SharedState;

#[derive(Debug, Deserialize)]
pub struct FaucetRequest {
    pub address: String,
    pub amount_eth: Option<f64>,
}

pub fn routes() -> Router<SharedState> {
    Router::new()
        .route("/api/v1/dev/reset", axum::routing::post(reset_data))
        .route("/api/v1/dev/reset/info", axum::routing::get(reset_info))
        .route("/api/v1/dev/environment", axum::routing::get(get_environment))
        .route("/api/v1/dev/faucet", axum::routing::post(faucet))
        .route("/api/v1/dev/token-recipients", axum::routing::get(get_token_recipients))
        .route("/api/v1/dev/treasury/init", axum::routing::post(init_treasury))
        .route("/api/v1/dev/treasury/init/prepare", axum::routing::post(prepare_init_treasury))
        .route("/api/v1/dev/treasury/init/confirm", axum::routing::post(confirm_init_treasury))
        .route("/api/v1/dev/treasury/config", axum::routing::get(get_treasury_config))
        .route("/api/v1/dev/treasury/signers", axum::routing::post(update_treasury_signers))
        // KYC dev tools (frontend api-paths: /kyc/dev/*, base URL /api/v1 → /api/v1/kyc/dev/*)
        .route("/api/v1/kyc/dev/quick-approve/{address}", axum::routing::post(quick_approve))
        .route("/api/v1/kyc/dev/quick-approve/{address}/confirm", axum::routing::post(confirm_quick_approve))
        .route("/api/v1/kyc/dev/reset/{address}", axum::routing::delete(reset_kyc))
}

async fn reset_data(
    State(state): State<SharedState>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    // Reset test data: delete non-essential data, keep accounts and contracts
    sqlx::query!("DELETE FROM reward_claim").execute(&state.db).await?;
    sqlx::query!("DELETE FROM staking_record").execute(&state.db).await?;
    sqlx::query!("DELETE FROM subscription").execute(&state.db).await?;
    sqlx::query!("DELETE FROM asset_price_history").execute(&state.db).await?;
    sqlx::query!("DELETE FROM asset_contract_binding").execute(&state.db).await?;
    sqlx::query!("DELETE FROM asset_media").execute(&state.db).await?;
    sqlx::query!("DELETE FROM asset_features").execute(&state.db).await?;
    sqlx::query!("DELETE FROM asset").execute(&state.db).await?;
    sqlx::query!("DELETE FROM account_kyc_document").execute(&state.db).await?;
    sqlx::query!("DELETE FROM account_kyc").execute(&state.db).await?;
    sqlx::query!("DELETE FROM transaction_audit").execute(&state.db).await?;
    sqlx::query!("DELETE FROM audit_log").execute(&state.db).await?;

    let data = DataWrapper::msg("Test data reset");
    Ok(Json(data))
}

// ============================================
// Treasury signers update
// ============================================

#[derive(Debug, Deserialize)]
pub struct UpdateSignersRequest {
    pub signer_addresses: Vec<String>,
    pub required_signatures: i64,
}

async fn update_treasury_signers(
    State(state): State<SharedState>,
    Json(req): Json<UpdateSignersRequest>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    // Store treasury signers config in contract_config as JSON
    sqlx::query!("DELETE FROM contract_config WHERE contract_name = 'treasury_signers'")
        .execute(&state.db)
        .await?;

    let signers_json = serde_json::to_string(&req.signer_addresses).unwrap_or_default();
    let desc = format!("signers: {}", signers_json);
    let required = req.required_signatures.to_string();
    sqlx::query!(
        "INSERT INTO contract_config (contract_name, project_name, contract_type, scope, description, required_deps) VALUES ('treasury_signers', 'platform', 'config', 'global', $1, $2)",
        desc,
        required
    )
    .execute(&state.db)
    .await?;

    let data = DataWrapper::object(serde_json::json!({
        "signer_addresses": req.signer_addresses,
        "required_signatures": req.required_signatures,
    }));
    Ok(Json(data))
}

async fn faucet(
    State(state): State<SharedState>,
    Json(req): Json<FaucetRequest>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let signer = PrivateKeySigner::from_str(&state.config.faucet.private_key)
        .map_err(|e| AppError::BadRequest(format!("invalid faucet key: {}", e)))?;
    let wallet = alloy::network::EthereumWallet::from(signer);
    let provider = ProviderBuilder::new()
        .wallet(wallet)
        .connect_http(state.config.chain.rpc_url.parse().map_err(|e| AppError::BadRequest(format!("invalid rpc url: {}", e)))?);

    let address = req.address.parse::<Address>()
        .map_err(|e| AppError::BadRequest(format!("invalid address: {}", e)))?;

    let old_balance = provider.get_balance(address).await
        .map_err(|e| AppError::Web3(format!("get_balance failed: {}", e)))?;

    let amount = parse_ether(&state.config.faucet.amount_eth)
        .map_err(|e| AppError::BadRequest(format!("invalid amount: {}", e)))?;

    let tx = provider.transaction_request()
        .to(address)
        .value(amount);

    let builder = provider.send_transaction(tx).await
        .map_err(|e| AppError::Web3(format!("send transaction failed: {}", e)))?;
    let _ = builder.get_receipt().await
        .map_err(|e| AppError::Web3(format!("wait receipt failed: {}", e)))?;

    let new_balance = provider.get_balance(address).await
        .map_err(|e| AppError::Web3(format!("get_balance failed: {}", e)))?;

    let data = DataWrapper::object(serde_json::json!({
        "address": req.address,
        "amount_eth": state.config.faucet.amount_eth.parse::<f64>().unwrap_or(1.0),
        "old_balance_eth": old_balance.to_string(),
        "new_balance_eth": new_balance.to_string(),
    }));
    Ok(Json(data))
}

async fn reset_info(
    State(state): State<SharedState>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let counts = sqlx::query!(
        "SELECT 
            (SELECT COUNT(*) FROM account) as account_count,
            (SELECT COUNT(*) FROM asset) as asset_count,
            (SELECT COUNT(*) FROM subscription) as subscription_count,
            (SELECT COUNT(*) FROM staking_record) as staking_count,
            (SELECT COUNT(*) FROM account_kyc) as kyc_count"
    )
    .fetch_one(&state.db).await?;

    let data = DataWrapper::object(serde_json::json!({
        "account_count": counts.account_count,
        "asset_count": counts.asset_count,
        "subscription_count": counts.subscription_count,
        "staking_count": counts.staking_count,
        "kyc_count": counts.kyc_count
    }));
    Ok(Json(data))
}

async fn get_environment(
    State(state): State<SharedState>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let data = DataWrapper::object(serde_json::json!({
        "environment": state.config.environment,
        "network": state.config.network,
        "debug": state.config.debug,
        "app_name": state.config.app_name,
        "chain": {
            "name": state.config.chain.name,
            "network": state.config.chain.network,
            "chain_id": state.config.chain.chain_id,
            "rpc_url": state.config.chain.rpc_url
        }
    }));
    Ok(Json(data))
}

async fn quick_approve(
    State(state): State<SharedState>,
    Path(address): Path<String>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let address = address.to_lowercase();
    let network = "hardhat";
    sqlx::query!(
        "INSERT INTO account_kyc (address, network, status, reviewed_at, on_chain_sync_status, updated_at) VALUES ($1, $2, 'approved', CURRENT_TIMESTAMP, 'synced', CURRENT_TIMESTAMP) ON CONFLICT (address, network) DO UPDATE SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP, on_chain_sync_status = 'synced', updated_at = CURRENT_TIMESTAMP",
        address, network
    )
    .execute(&state.db).await?;

    let row = sqlx::query!(
        "SELECT address, status, reviewed_at, reject_reason, on_chain_sync_status, on_chain_tx_hash FROM account_kyc WHERE address = $1 AND network = $2",
        address, network
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("KYC record not found after update".to_string()))?;

    let data = DataWrapper::object(serde_json::json!({
        "wallet_address": row.address,
        "status": row.status,
        "reviewed_at": row.reviewed_at,
        "reject_reason": row.reject_reason,
        "on_chain_sync_status": row.on_chain_sync_status,
        "on_chain_tx_hash": row.on_chain_tx_hash,
    }));
    Ok(Json(data))
}

async fn reset_kyc(
    State(state): State<SharedState>,
    Path(address): Path<String>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let address = address.to_lowercase();
    sqlx::query!(
        "DELETE FROM account_kyc_document WHERE kyc_id IN (SELECT id FROM account_kyc WHERE address = $1)",
        address
    )
    .execute(&state.db).await?;

    sqlx::query!(
        "DELETE FROM account_kyc WHERE address = $1",
        address
    )
    .execute(&state.db).await?;

    let data = DataWrapper::msg("KYC reset");
    Ok(Json(data))
}

// ============================================
// Token recipients
// ============================================

async fn get_token_recipients(
    State(state): State<SharedState>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let items = sqlx::query!(
        "SELECT a.address, a.network, k.status as kyc_status
         FROM account a
         LEFT JOIN account_kyc k ON a.address = k.address
         ORDER BY a.created_at DESC"
    )
    .fetch_all(&state.db).await?;

    let items: Vec<serde_json::Value> = items.into_iter().map(|r| serde_json::json!({
        "address": r.address,
        "network": r.network,
        "kyc_status": r.kyc_status,
    })).collect();

    let total = items.len() as i64;
    let data = DataWrapper::list(items, crate::schemas::common::Pagination::new(total, 1, 100));
    Ok(Json(data))
}

// ============================================
// Treasury dev tools
// ============================================

#[derive(Debug, Deserialize)]
pub struct TreasuryInitRequest {
    pub signer_addresses: Vec<String>,
    pub required_signatures: Option<u64>,
}

#[derive(Debug, Deserialize)]
pub struct TreasuryInitConfirmRequest {
    pub signer_addresses: Vec<String>,
    pub required_signatures: Option<u64>,
    pub tx_hash: String,
}

async fn init_treasury(
    State(_state): State<SharedState>,
    Json(req): Json<TreasuryInitRequest>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    if req.signer_addresses.len() < 3 {
        return Err(AppError::BadRequest("at least 3 signer addresses required".to_string()));
    }
    let threshold = req.required_signatures.unwrap_or(2);

    tracing::info!(
        signers = req.signer_addresses.len(),
        threshold = threshold,
        "Treasury multisig init (dev)"
    );

    let data = DataWrapper::object(serde_json::json!({
        "status": "initialized",
        "signer_count": req.signer_addresses.len(),
        "required_signatures": threshold,
    }));
    Ok(Json(data))
}

async fn prepare_init_treasury(
    State(state): State<SharedState>,
    Json(req): Json<TreasuryInitRequest>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    if req.signer_addresses.len() < 3 {
        return Err(AppError::BadRequest("at least 3 signer addresses required".to_string()));
    }
    let threshold = req.required_signatures.unwrap_or(2);

    // Look up TreasuryMultisig contract address
    let contract = sqlx::query!(
        "SELECT address FROM contract_deployment WHERE name = 'TreasuryMultisig' AND status = 'active' LIMIT 1"
    ).fetch_optional(&state.db).await?;

    let contract_address = contract.map(|r| r.address).unwrap_or_default();

    let data = DataWrapper::object(serde_json::json!({
        "contract_address": contract_address,
        "function_name": "initSigners",
        "signer_addresses": req.signer_addresses,
        "required_signatures": threshold,
    }));
    Ok(Json(data))
}

async fn confirm_init_treasury(
    State(_state): State<SharedState>,
    Json(req): Json<TreasuryInitConfirmRequest>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let threshold = req.required_signatures.unwrap_or(2);

    tracing::info!(
        tx_hash = %req.tx_hash,
        signers = req.signer_addresses.len(),
        "Treasury multisig init confirmed (dev)"
    );

    let data = DataWrapper::object(serde_json::json!({
        "status": "initialized",
        "signer_count": req.signer_addresses.len(),
        "required_signatures": threshold,
        "tx_hash": req.tx_hash,
    }));
    Ok(Json(data))
}

async fn get_treasury_config(
    State(state): State<SharedState>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let contract = sqlx::query!(
        "SELECT address FROM contract_deployment WHERE name = 'TreasuryMultisig' AND status = 'active' LIMIT 1"
    ).fetch_optional(&state.db).await?;

    let contract_address = contract.map(|r| r.address).unwrap_or_default();

    let data = DataWrapper::object(serde_json::json!({
        "contract_address": contract_address,
        "signers": [],
        "required_signatures": 2,
    }));
    Ok(Json(data))
}

// ============================================
// KYC quick approve confirm
// ============================================

#[derive(Debug, Deserialize)]
pub struct QuickApproveConfirmRequest {
    pub tx_hash: String,
}

async fn confirm_quick_approve(
    State(state): State<SharedState>,
    Path(address): Path<String>,
    Json(req): Json<QuickApproveConfirmRequest>,
) -> Result<Json<DataWrapper<serde_json::Value>>, AppError> {
    let address = address.to_lowercase();

    // Update KYC status to approved + on_chain_synced
    sqlx::query!(
        "UPDATE account_kyc SET status = 'approved', on_chain_sync_status = 'synced', \
         on_chain_synced_at = CURRENT_TIMESTAMP, reviewed_at = CURRENT_TIMESTAMP, \
         updated_at = CURRENT_TIMESTAMP WHERE address = $1",
        address
    )
    .execute(&state.db).await?;

    tracing::info!(address = %address, tx_hash = %req.tx_hash, "Quick approve confirmed (dev)");

    let data = DataWrapper::object(serde_json::json!({
        "wallet_address": address,
        "status": "approved",
        "on_chain_sync_status": "synced",
        "tx_hash": req.tx_hash,
        "on_chain_tx_hash": req.tx_hash,
    }));
    Ok(Json(data))
}
