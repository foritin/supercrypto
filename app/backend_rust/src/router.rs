use axum::{
    Router,
    extract::State,
    middleware::from_fn_with_state,
};
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;

use crate::handlers::{admin, audit, contract, dev, public, sessions, treasury, user};
use crate::middleware::{auth, logging};
use crate::state::SharedState;

pub fn create_router(state: SharedState) -> Router {
    let state_clone = state.clone();
    Router::new()
        .merge(public::routes())
        .merge(user::routes())
        .merge(admin::routes())
        .merge(dev::routes())
        .merge(contract::routes())
        .merge(audit::routes())
        .merge(sessions::routes())
        .merge(treasury::routes())
        .route("/health", axum::routing::get(health_check))
        .route("/metrics/chain", axum::routing::get(chain_metrics))
        .layer(from_fn_with_state(state_clone, auth::auth_state_middleware))
        .layer(from_fn_with_state(state.clone(), logging::request_logging_middleware))
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

async fn health_check(State(state): State<SharedState>) -> axum::Json<serde_json::Value> {
    let db_status = match sqlx::query("SELECT 1").fetch_one(&state.db).await {
        Ok(_) => "ok",
        Err(e) => {
            tracing::error!("Health check DB error: {}", e);
            "error"
        }
    };

    axum::Json(serde_json::json!({
        "status": "ok",
        "version": "1.0.0",
        "database": db_status,
        "environment": state.config.environment
    }))
}

async fn chain_metrics() -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({
        "operations": [],
        "total_count": 0
    }))
}
