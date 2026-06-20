use axum::{
    http::StatusCode,
    response::{IntoResponse, Json},
};
use serde::Serialize;
use thiserror::Error;

/// 业务错误码
#[derive(Debug, Clone, Serialize)]
pub struct ErrorResponse {
    pub code: u16,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
    pub path: String,
}

/// 应用错误类型
#[derive(Error, Debug)]
pub enum AppError {
    #[error("Unauthorized")]
    Unauthorized,

    #[error("Forbidden")]
    Forbidden,

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Validation error: {0}")]
    ValidationError(String),

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("JWT error: {0}")]
    Jwt(#[from] jsonwebtoken::errors::Error),

    #[error("Redis error: {0}")]
    Redis(#[from] deadpool_redis::PoolError),

    #[error("Redis command error: {0}")]
    RedisCmd(#[from] redis::RedisError),

    #[error("Web3 error: {0}")]
    Web3(String),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("Config error: {0}")]
    Config(String),
}

impl AppError {
    pub fn status_code(&self) -> StatusCode {
        match self {
            AppError::Unauthorized => StatusCode::UNAUTHORIZED,
            AppError::Forbidden => StatusCode::FORBIDDEN,
            AppError::NotFound(_) => StatusCode::NOT_FOUND,
            AppError::BadRequest(_) => StatusCode::BAD_REQUEST,
            AppError::ValidationError(_) => StatusCode::UNPROCESSABLE_ENTITY,
            AppError::Database(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::Jwt(_) => StatusCode::UNAUTHORIZED,
            AppError::Redis(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::RedisCmd(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::Web3(_) => StatusCode::BAD_REQUEST,
            AppError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::Config(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    pub fn error_code(&self) -> Option<String> {
        match self {
            AppError::Unauthorized => Some("E401".to_string()),
            AppError::Forbidden => Some("E403".to_string()),
            AppError::NotFound(_) => Some("E404".to_string()),
            AppError::BadRequest(_) => Some("E400".to_string()),
            AppError::ValidationError(_) => Some("E422".to_string()),
            AppError::Database(_) => Some("E500_DB".to_string()),
            AppError::Jwt(_) => Some("E401_JWT".to_string()),
            AppError::Redis(_) => Some("E500_REDIS".to_string()),
            AppError::RedisCmd(_) => Some("E500_REDIS".to_string()),
            AppError::Web3(_) => Some("E400_WEB3".to_string()),
            AppError::Internal(_) => Some("E500".to_string()),
            AppError::Config(_) => Some("E500_CFG".to_string()),
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let status = self.status_code();
        let error_code = self.error_code();
        let message = self.to_string();
        let detail = match &self {
            AppError::BadRequest(d) => Some(d.clone()),
            AppError::ValidationError(d) => Some(d.clone()),
            AppError::NotFound(d) => Some(d.clone()),
            AppError::Internal(d) => Some(d.clone()),
            AppError::Web3(d) => Some(d.clone()),
            AppError::Config(d) => Some(d.clone()),
            _ => None,
        };

        let body = ErrorResponse {
            code: status.as_u16(),
            message,
            error_code,
            detail,
            path: "/".to_string(), // 由中间件填充实际路径
        };

        (status, Json(body)).into_response()
    }
}

/// 统一成功响应
#[derive(Debug, Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub code: i32,
    pub message: String,
    pub data: T,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn ok(data: T) -> Self {
        Self {
            code: 0,
            message: "success".to_string(),
            data,
        }
    }
}

/// 分页数据包装
#[derive(Debug, Serialize)]
pub struct PaginatedData<T: Serialize> {
    #[serde(flatten)]
    pub inner: T,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub list: Option<Vec<T>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub object: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pagination: Option<Pagination>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct Pagination {
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
}

impl Pagination {
    pub fn new(total: i64, page: i64, page_size: i64) -> Self {
        let total_pages = if total == 0 {
            0
        } else {
            (total + page_size - 1) / page_size
        };
        Self {
            total,
            page,
            page_size,
            total_pages,
        }
    }
}
