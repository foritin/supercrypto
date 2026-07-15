use chrono::Utc;
use serde_json::Value;
use sqlx::SqlitePool;

use crate::config::AppConfig;
use crate::error::AppError;
use crate::security::{jwt, wallet};

pub struct AuthService;

impl AuthService {
    /// Login: verify wallet signature and issue tokens
    pub async fn login(
        db: &SqlitePool,
        config: &AppConfig,
        address: &str,
        signature: &str,
    ) -> Result<Value, AppError> {
        // Verify wallet signature
        let login_message = wallet::build_login_message(address);
        wallet::verify_eip191_signature(&login_message, signature, address)?;

        let roles: Vec<String> = vec!["user".to_string()];
        let access_token = jwt::create_access_token(address, &roles, 0, config)?;
        let refresh_token = jwt::create_refresh_token(address, 0, config)?;

        // Upsert account
        let addr_lower = address.to_lowercase();
        let now = Utc::now();
        sqlx::query(
            "INSERT INTO account (address, roles, network, last_login_dt) VALUES (?, '[\"user\"]', 'hardhat', ?) ON CONFLICT(address) DO UPDATE SET last_login_dt = ?"
        )
        .bind(&addr_lower)
        .bind(&now)
        .bind(&now)
        .execute(db).await?;

        Ok(serde_json::json!({
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in_mins": config.access_token_expire_minutes,
        }))
    }

    /// Refresh access token
    pub fn refresh_token(
        config: &AppConfig,
        refresh_token: &str,
    ) -> Result<Value, AppError> {
        let claims = jwt::verify_token(refresh_token, config)?;
        let new_access = jwt::create_access_token(&claims.sub, &claims.roles, claims.session_version, config)?;
        let new_refresh = jwt::create_refresh_token(&claims.sub, claims.session_version, config)?;

        Ok(serde_json::json!({
            "access_token": new_access,
            "refresh_token": new_refresh,
            "token_type": "bearer",
            "expires_in_mins": config.access_token_expire_minutes,
        }))
    }

    /// Logout (token invalidation is client-side; server does nothing)
    pub fn logout() -> Value {
        serde_json::json!({"success": true, "message": "logged out"})
    }
}
