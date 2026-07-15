use std::sync::Arc;
use tracing::info;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;
use tracing_subscriber::EnvFilter;

use backend::config::AppConfig;
use backend::router;
use backend::state::AppState;
use backend::tasks;

/// 初始化日志系统：stdout + 按天轮转文件日志
fn init_logging(cfg: &AppConfig) -> anyhow::Result<tracing_appender::non_blocking::WorkerGuard> {
    let log_cfg = &cfg.log;
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new(&log_cfg.level));

    // 文件日志 appender
    let file_appender = match log_cfg.rotation.as_str() {
        "hourly" => tracing_appender::rolling::hourly(&log_cfg.dir, "backend.log"),
        "never" => tracing_appender::rolling::never(&log_cfg.dir, "backend.log"),
        _ => tracing_appender::rolling::daily(&log_cfg.dir, "backend.log"),
    };
    let (file_writer, guard) = tracing_appender::non_blocking(file_appender);

    let file_layer = tracing_subscriber::fmt::layer()
        .with_writer(file_writer)
        .with_ansi(false) // 文件中不要 ANSI 颜色码
        .with_target(true)
        .with_file(true)
        .with_line_number(true);

    let registry = tracing_subscriber::registry().with(filter).with(file_layer);

    if log_cfg.stdout {
        let stdout_layer = tracing_subscriber::fmt::layer()
            .with_target(true)
            .with_file(true)
            .with_line_number(true);
        registry.with(stdout_layer).init();
    } else {
        registry.init();
    }

    Ok(guard)
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 先加载配置（日志配置在配置文件中）
    let cfg = AppConfig::load()?;

    // 初始化日志系统，guard 必须存活到程序结束
    let _log_guard = init_logging(&cfg)?;

    info!("🚀 Starting SuperCrypto Rust API...");
    info!("✅ Config loaded (environment: {})", cfg.environment);
    info!("📁 Log dir: {}, rotation: {}", cfg.log.dir, cfg.log.rotation);

    // 解析 SQLite 连接字符串：接受裸路径或 sqlite: URL 两种格式。
    // Windows 盘符（如 E:）在 sqlx 中必须写成 "sqlite:E:/..." 才能被正确
    // 识别为绝对路径；裸路径则默认按相对路径处理。
    let raw_url = &cfg.sqlite.database_url;
    let connect_url = if raw_url.starts_with("sqlite:") {
        raw_url.clone()
    } else if raw_url.chars().next().map_or(false, |c| c.is_ascii_alphabetic())
        && raw_url.get(1..2) == Some(":")
    {
        format!("sqlite:{}", raw_url)
    } else if raw_url.starts_with("./") {
        format!("sqlite:{}", raw_url)
    } else if raw_url == ":memory:" {
        "sqlite::memory:".to_string()
    } else {
        // 兼容仅含文件名或老格式 "data/app.sqlite"：仍当相对路径
        format!("sqlite:{}", raw_url)
    };

    // 当连接目标不是 :memory: 时，确保所在目录存在
    if connect_url != "sqlite::memory:" {
        let fs_path = connect_url
            .strip_prefix("sqlite:")
            .unwrap_or(&connect_url);
        if let Some(parent) = std::path::Path::new(fs_path).parent() {
            if !parent.as_os_str().is_empty() {
                std::fs::create_dir_all(parent)?;
            }
        }
    }

    // 初始化 SQLite 数据库连接池
    let db_pool = sqlx::sqlite::SqlitePoolOptions::new()
        .max_connections(cfg.sqlite.max_connections)
        .connect(&connect_url)
        .await?;
    info!("✅ SQLite database connected: {}", connect_url);

    // 运行数据库迁移
    sqlx::migrate!("./migrations")
        .run(&db_pool)
        .await?;
    info!("✅ Database migrations applied");

    // 启动时自动部署/导入合约（去重）
    let deploy_cfg = cfg.clone();
    let deploy_db = db_pool.clone();
    match tasks::deploy_on_startup::deploy_on_startup(&deploy_db, &deploy_cfg).await {
        Ok(()) => {}
        Err(e) => {
            tracing::error!("❌ Startup deploy failed: {}. Continuing without auto-deploy...", e);
        }
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
