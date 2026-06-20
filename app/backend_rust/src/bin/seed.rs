use backend::AppConfig;
use sqlx::PgPool;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    let cfg = AppConfig::load()?;
    let db_url = cfg.postgresql.url();
    let pool = PgPool::connect(&db_url).await?;

    tracing::info!("Seeding test data...");

    // 插入测试账户
    sqlx::query(
        r#"
        INSERT INTO account (address, private_key, roles, network, last_login_dt, balance, is_active, is_blocked, is_deleted)
        VALUES
        ('0x70997970C51812dc3A010C7d01b50e0d17dc79C8', '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', '["admin", "contract_owner", "treasury", "multisig_signer"]', 'hardhat', NOW(), 100000000000000000000, true, false, false),
        ('0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a', '["treasury"]', 'hardhat', NOW(), 50000000000000000000, true, false, false),
        ('0x90F79bf6EB2c4f870365E785982E1f101E93b906', '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6', '[]', 'hardhat', NOW(), 10000000000000000000, true, false, false)
        ON CONFLICT DO NOTHING
        "#
    )
    .execute(&pool)
    .await?;

    // 插入测试资产
    sqlx::query(
        r#"
        INSERT INTO asset (name, symbol, description, asset_type, current_price, total_supply, subscribed_amount, min_subscription, apy_3m, apy_6m, apy_12m, subscription_mode, status, environment, created_by)
        VALUES
        ('Vanke Real Estate Token', 'VRE', '万科房地产资产代币化项目', 'real_estate', 100.00, 1000000, 250000, 100, 8.50, 10.00, 12.50, 'both', 'active', 'hardhat', 1),
        ('SuperCrypto Fund', 'SCF', '加密货币指数投资基金', 'fund', 50.00, 500000, 100000, 50, 6.00, 8.00, 10.00, 'current', 'active', 'hardhat', 1),
        ('Test Asset', 'TEST', '测试资产', 'other', 1.00, 10000, 0, 10, 0, 0, 0, 'both', 'draft', 'hardhat', 1)
        ON CONFLICT DO NOTHING
        "#
    )
    .execute(&pool)
    .await?;

    tracing::info!("✅ Test data seeded successfully!");
    Ok(())
}
