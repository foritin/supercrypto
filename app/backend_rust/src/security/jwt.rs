use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::config::AppConfig;
use crate::error::AppError;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,    // user address
    pub exp: usize,     // expiration time
    pub iat: usize,     // issued at
    pub jti: String,    // token id
    pub roles: Vec<String>,
    pub session_version: u64,
    pub token_type: String, // access | refresh
}

pub fn create_access_token(
    address: &str,
    roles: &[String],
    session_version: u64,
    config: &AppConfig,
) -> Result<String, AppError> {
    let now = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs() as usize;
    let exp = now + (config.access_token_expire_minutes as usize * 60);

    let claims = Claims {
        sub: address.to_lowercase(),
        exp,
        iat: now,
        jti: uuid::Uuid::new_v4().to_string(),
        roles: roles.to_vec(),
        session_version,
        token_type: "access".to_string(),
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(config.jwt_secret.as_bytes()),
    )?;

    Ok(token)
}

pub fn create_refresh_token(
    address: &str,
    session_version: u64,
    config: &AppConfig,
) -> Result<String, AppError> {
    let now = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs() as usize;
    let exp = now + (config.refresh_token_expire_minutes as usize * 60);

    let claims = Claims {
        sub: address.to_lowercase(),
        exp,
        iat: now,
        jti: uuid::Uuid::new_v4().to_string(),
        roles: vec![],
        session_version,
        token_type: "refresh".to_string(),
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(config.jwt_secret.as_bytes()),
    )?;

    Ok(token)
}

pub fn verify_token(token: &str, config: &AppConfig) -> Result<Claims, AppError> {
    let mut validation = Validation::new(Algorithm::HS256);
    validation.validate_exp = true;

    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(config.jwt_secret.as_bytes()),
        &validation,
    )?;

    Ok(token_data.claims)
}

impl From<std::time::SystemTimeError> for AppError {
    fn from(err: std::time::SystemTimeError) -> Self {
        AppError::Internal(err.to_string())
    }
}
