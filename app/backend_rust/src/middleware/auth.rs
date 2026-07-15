use axum::{
    extract::{FromRequestParts, Request, State},
    http::{header, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
use http::request::Parts;
use crate::state::SharedState;
use crate::security::jwt;
use serde::{Deserialize, Serialize};

/// 认证用户信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthUser {
    pub address: String,
    pub roles: Vec<String>,
    pub session_version: u64,
}

/// 认证状态中间件 - 解析 JWT 并注入到 request extensions
pub async fn auth_state_middleware(
    State(state): State<SharedState>,
    mut request: Request,
    next: Next,
) -> Response {
    // 尝试解析 Authorization header
    if let Some(auth_header) = request.headers().get(header::AUTHORIZATION) {
        if let Ok(auth_str) = auth_header.to_str() {
            if let Some(token) = auth_str.strip_prefix("Bearer ") {
                // 验证 JWT
                if let Ok(claims) = jwt::verify_token(token, &state.config) {
                    let user = AuthUser {
                        address: claims.sub,
                        roles: claims.roles,
                        session_version: claims.session_version,
                    };
                    request.extensions_mut().insert(user);
                }
            }
        }
    }

    next.run(request).await
}

/// 检查用户是否已认证
pub fn require_user(request: &Request) -> Option<AuthUser> {
    request.extensions().get::<AuthUser>().cloned()
}

/// 检查用户是否为管理员
pub fn require_admin(request: &Request) -> Result<AuthUser, Response> {
    match request.extensions().get::<AuthUser>() {
        Some(user) if user.roles.contains(&"admin".to_string()) => Ok(user.clone()),
        _ => {
            let response = axum::Json(crate::error::ErrorResponse {
                code: 403,
                message: "Forbidden".to_string(),
                error_code: Some("E403".to_string()),
                detail: Some("Admin permission required".to_string()),
                path: "/".to_string(),
            }).into_response();
            Err(response)
        }
    }
}

// ── Axum extractor: 从 request extensions 提取管理员地址 ──

/// 从请求中提取管理员钱包地址（需先通过 auth_state_middleware 注入）
pub struct AdminAddress(pub String);

impl<S> FromRequestParts<S> for AdminAddress
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, axum::Json<crate::error::ErrorResponse>);

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let user = parts
            .extensions
            .get::<AuthUser>()
            .ok_or_else(|| {
                (
                    StatusCode::UNAUTHORIZED,
                    axum::Json(crate::error::ErrorResponse {
                        code: 401,
                        message: "Unauthorized".to_string(),
                        error_code: Some("E401".to_string()),
                        detail: Some("Authentication required".to_string()),
                        path: "/".to_string(),
                    }),
                )
            })?;

        if !user.roles.contains(&"admin".to_string()) {
            return Err((
                StatusCode::FORBIDDEN,
                axum::Json(crate::error::ErrorResponse {
                    code: 403,
                    message: "Forbidden".to_string(),
                    error_code: Some("E403".to_string()),
                    detail: Some("Admin permission required".to_string()),
                    path: "/".to_string(),
                }),
            ));
        }

        Ok(AdminAddress(user.address.clone()))
    }
}

/// 从请求中提取已登录用户的钱包地址（需先通过 auth_state_middleware 注入）
pub struct UserAddress(pub String);

impl<S> FromRequestParts<S> for UserAddress
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, axum::Json<crate::error::ErrorResponse>);

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let user = parts
            .extensions
            .get::<AuthUser>()
            .ok_or_else(|| {
                (
                    StatusCode::UNAUTHORIZED,
                    axum::Json(crate::error::ErrorResponse {
                        code: 401,
                        message: "Unauthorized".to_string(),
                        error_code: Some("E401".to_string()),
                        detail: Some("Authentication required".to_string()),
                        path: "/".to_string(),
                    }),
                )
            })?;

        Ok(UserAddress(user.address.clone()))
    }
}
