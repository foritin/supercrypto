use axum::{
    routing::get,
    Router,
};
use std::sync::Arc;
use tracing::info;

mod config;
mod contracts;
mod error;
mod handlers;
mod middleware;
mod models;
mod repositories;
mod router;
mod schemas;
mod security;
mod services;
mod state;
mod tasks;
mod utils;

use config::AppConfig;
use state::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 初始化日志
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,backend=debug".into()),
        )
        .init();

    info!("🚀 Starting SuperCrypto Rust API...");

    // 加载配置
    let cfg = AppConfig::load()?;
    info!("✅ Config loaded (environment: {})", cfg.environment);

    // 初始化数据库连接池
    let db_pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(cfg.postgresql.pool_size)
        .connect(&cfg.postgresql.url())
        .await?;
    info!("✅ Database connected");

    // 运行数据库迁移（开发环境）
    if cfg.environment == "dev" {
        sqlx::migrate!("./migrations")
            .run(&db_pool)
            .await?;
        info!("✅ Database migrations applied");
    }

    // 初始化 Redis 连接池
    let redis_cfg = deadpool_redis::Runtime::Tokio1;
    let redis_pool = deadpool_redis::Config::from_url(&cfg.redis.url())
        .create_pool(Some(redis_cfg))?;
    info!("✅ Redis connected");

    // 构建 AppState
    let state = Arc::new(AppState {
        db: db_pool,
        redis: redis_pool,
        config: cfg,
    });

    // 启动定时任务
    let scheduler_state = Arc::clone(&state);
    tokio::spawn(async move {
        tasks::start_scheduler(scheduler_state).await;
    });
    info!("✅ Scheduler started");

    // 构建路由
    let app = router::create_router(state);

    // 启动 HTTP 服务
    let addr = "0.0.0.0:8000";
    let listener = tokio::net::TcpListener::bind(addr).await?;
    info!("🎉 SuperCrypto API running at http://{}", addr);

    axum::serve(listener, app).await?;

    Ok(())
}
