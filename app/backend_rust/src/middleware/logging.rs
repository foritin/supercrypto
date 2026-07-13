use axum::{
    extract::{Request, State},
    middleware::Next,
    response::Response,
};
use crate::state::SharedState;

/// 请求日志中间件
pub async fn request_logging_middleware(
    State(_state): State<SharedState>,
    request: Request,
    next: Next,
) -> Response {
    let method = request.method().clone();
    let uri = request.uri().clone();
    let start = std::time::Instant::now();

    let response = next.run(request).await;

    let duration = start.elapsed();
    let status = response.status();

    tracing::info!(
        method = %method,
        uri = %uri,
        status = %status,
        duration_ms = %duration.as_millis(),
        "request completed"
    );

    response
}
