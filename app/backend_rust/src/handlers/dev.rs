use axum::{
    extract::{Path, State},
    Json, Router,
};

use crate::error::AppError;
use crate::schemas::common::{ApiResponse, DataWrapper};
use crate::state::SharedState;

pub fn routes() -> Router<SharedState> {
    Router::new()
        .route("/api/v1/dev/reset", axum::routing::post(reset_data))
        .route("/api/v1/dev/reset/info", axum::routing::get(reset_info))
        .route("/api/v1/dev/environment", axum::routing::get(get_environment))
        .route("/kyc/dev/quick-approve/{address}", axum::routing::post(quick_approve))
        .route("/kyc/dev/reset/{address}", axum::routing::delete(reset_kyc))
}

async fn reset_data(
    State(state): State<SharedState>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
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
    Ok(Json(ApiResponse::ok(data)))
}

async fn reset_info(
    State(state): State<SharedState>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
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
    Ok(Json(ApiResponse::ok(data)))
}

async fn get_environment(
    State(state): State<SharedState>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
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
    Ok(Json(ApiResponse::ok(data)))
}

async fn quick_approve(
    State(state): State<SharedState>,
    Path(address): Path<String>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    sqlx::query!(
        "UPDATE account_kyc SET status = 'approved', reviewed_at = NOW(), updated_at = NOW() WHERE address = $1",
        address.to_lowercase()
    )
    .execute(&state.db).await?;

    let data = DataWrapper::msg("KYC approved");
    Ok(Json(ApiResponse::ok(data)))
}

async fn reset_kyc(
    State(state): State<SharedState>,
    Path(address): Path<String>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    sqlx::query!(
        "DELETE FROM account_kyc_document WHERE kyc_id IN (SELECT id FROM account_kyc WHERE address = $1)",
        address.to_lowercase()
    )
    .execute(&state.db).await?;

    sqlx::query!(
        "DELETE FROM account_kyc WHERE address = $1",
        address.to_lowercase()
    )
    .execute(&state.db).await?;

    let data = DataWrapper::msg("KYC reset");
    Ok(Json(ApiResponse::ok(data)))
}
