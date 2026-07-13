use axum::{
    extract::{Request, State},
    http::header,
    middleware::Next,
    response::{IntoResponse, Response},
};
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
