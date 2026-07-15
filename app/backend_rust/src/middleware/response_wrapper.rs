use axum::{
    body::{to_bytes, Body},
    extract::Request,
    http::header,
    middleware::Next,
    response::Response,
};

/// Maximum body size to read for wrapping (10 MB)
const MAX_BODY_SIZE: usize = 10 * 1024 * 1024;

/// 响应包装中间件
///
/// 后端 handler 返回 `Json<DataWrapper<T>>`，序列化后为：
/// ```json
/// { "object_data": {...}, "msg": "success" }
/// ```
///
/// 前端期望的标准格式 (`ApiResponse<DataWrapper<T>>`)：
/// ```json
/// { "code": 200, "message": "success", "data": { "object_data": {...}, "msg": "success" } }
/// ```
///
/// 此中间件自动将所有 2xx JSON 响应包装为 `ApiResponse` 格式，
/// 无需修改任何 handler 代码。
pub async fn response_wrapper_middleware(request: Request, next: Next) -> Response {
    let response = next.run(request).await;

    // Only wrap 2xx success responses
    if !response.status().is_success() {
        return response;
    }

    // Only wrap JSON responses
    let content_type = response
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    if !content_type.contains("application/json") {
        return response;
    }

    // Read the response body
    let (mut parts, body) = response.into_parts();
    let body_bytes = match to_bytes(body, MAX_BODY_SIZE).await {
        Ok(bytes) => bytes,
        Err(e) => {
            tracing::warn!(error = %e, "Failed to read response body for wrapping");
            return Response::from_parts(parts, Body::empty());
        }
    };

    // Parse as JSON
    let json: serde_json::Value = match serde_json::from_slice(&body_bytes) {
        Ok(v) => v,
        Err(_) => {
            // Not valid JSON, return as-is
            return Response::from_parts(parts, Body::from(body_bytes));
        }
    };

    // If already wrapped (has 'code' field at top level), return as-is
    if json.get("code").is_some() {
        return Response::from_parts(parts, Body::from(body_bytes));
    }

    // Wrap in ApiResponse format: { code: 200, message: "success", data: <original> }
    let wrapped = serde_json::json!({
        "code": 200,
        "message": "success",
        "data": json,
    });

    let new_body = serde_json::to_vec(&wrapped).unwrap_or_else(|_| body_bytes.to_vec());

    // Update Content-Length to match the new body size
    parts.headers.remove(header::CONTENT_LENGTH);
    parts.headers.insert(
        header::CONTENT_LENGTH,
        new_body.len().to_string().parse().unwrap(),
    );

    Response::from_parts(parts, Body::from(new_body))
}
