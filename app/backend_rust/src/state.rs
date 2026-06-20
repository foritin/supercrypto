use sqlx::PgPool;
use deadpool_redis::Pool as RedisPool;
use std::sync::Arc;

use crate::config::AppConfig;

/// 应用状态
#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub redis: RedisPool,
    pub config: AppConfig,
}

pub type SharedState = Arc<AppState>;
