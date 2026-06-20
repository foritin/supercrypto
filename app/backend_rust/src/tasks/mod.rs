pub mod subscription_reconcile;

use std::sync::Arc;
use crate::state::AppState;

pub async fn start_scheduler(_state: Arc<AppState>) {
    tracing::info!("Scheduler started");
    // TODO: 注册定时任务
    // 认购对账: 每 5 分钟
    loop {
        tokio::time::sleep(tokio::time::Duration::from_secs(300)).await;
        tracing::info!("Running scheduled tasks...");
    }
}
