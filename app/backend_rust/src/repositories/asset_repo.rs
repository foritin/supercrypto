use crate::error::AppError;
use crate::models::asset::{Asset, AssetContractBinding, AssetPriceHistory};
use crate::schemas::public::{AssetDetail, AssetListItem};
use sqlx::SqlitePool;

/// 获取资产列表（分页）
pub async fn list_assets(
    pool: &SqlitePool,
    status: Option<&str>,
    environment: Option<&str>,
    page: i64,
    page_size: i64,
) -> Result<(Vec<AssetListItem>, i64), AppError> {
    let offset = (page - 1).max(0) * page_size;
    let env = environment.unwrap_or("hardhat");
    let status_filter = status.unwrap_or("active");

    let items = sqlx::query_as!(
        AssetListItem,
        r#"
        SELECT id, name, symbol, description, asset_type,
        image_url, location,
        CAST(current_price AS REAL) as "current_price!: f64",
        CAST(total_supply AS REAL) as "total_supply!: f64",
        CAST(subscribed_amount AS REAL) as "subscribed_amount!: f64",
        CAST(min_subscription AS REAL) as "min_subscription!: f64",
        CAST(apy_3m AS REAL) as "apy_3m!: f64",
        CAST(apy_6m AS REAL) as "apy_6m!: f64",
        CAST(apy_12m AS REAL) as "apy_12m!: f64",
        subscription_mode,
        contract_address,
        status, environment,
        created_at, updated_at
        FROM asset
        WHERE status = $1 AND environment = $2
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
        status_filter,
        env,
        page_size,
        offset
    )
    .fetch_all(pool)
    .await?;

    let total = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM asset WHERE status = $1 AND environment = $2",
        status_filter,
        env
    )
    .fetch_one(pool)
    .await
    .unwrap_or(0);

    Ok((items, total))
}

/// 获取资产详情
pub async fn get_asset_by_id(pool: &SqlitePool, id: i64) -> Result<Option<AssetDetail>, AppError> {
    let item = sqlx::query_as!(
        AssetDetail,
        r#"
        SELECT id, name, symbol, description, asset_type,
        image_url, document_url, location,
        CAST(current_price AS REAL) as "current_price!: f64",
        price_updated_at,
        CAST(total_supply AS REAL) as "total_supply!: f64",
        CAST(subscribed_amount AS REAL) as "subscribed_amount!: f64",
        CAST(min_subscription AS REAL) as "min_subscription!: f64",
        subscription_start_at, subscription_end_at,
        CAST(apy_3m AS REAL) as "apy_3m!: f64",
        CAST(apy_6m AS REAL) as "apy_6m!: f64",
        CAST(apy_12m AS REAL) as "apy_12m!: f64",
        subscription_mode,
        project, contract_address, frame_style,
        status, environment,
        created_at, updated_at
        FROM asset
        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(pool)
    .await?;

    Ok(item)
}

/// 按 symbol 获取资产
pub async fn get_asset_by_symbol(
    pool: &SqlitePool,
    symbol: &str,
) -> Result<Option<AssetDetail>, AppError> {
    let item = sqlx::query_as!(
        AssetDetail,
        r#"
        SELECT id, name, symbol, description, asset_type,
        image_url, document_url, location,
        CAST(current_price AS REAL) as "current_price!: f64",
        price_updated_at,
        CAST(total_supply AS REAL) as "total_supply!: f64",
        CAST(subscribed_amount AS REAL) as "subscribed_amount!: f64",
        CAST(min_subscription AS REAL) as "min_subscription!: f64",
        subscription_start_at, subscription_end_at,
        CAST(apy_3m AS REAL) as "apy_3m!: f64",
        CAST(apy_6m AS REAL) as "apy_6m!: f64",
        CAST(apy_12m AS REAL) as "apy_12m!: f64",
        subscription_mode,
        project, contract_address, frame_style,
        status, environment,
        created_at, updated_at
        FROM asset
        WHERE symbol = $1
        "#,
        symbol
    )
    .fetch_optional(pool)
    .await?;

    Ok(item)
}

/// 获取资产价格历史
pub async fn get_price_history(
    pool: &SqlitePool,
    asset_id: i64,
    limit: i64,
) -> Result<Vec<AssetPriceHistory>, AppError> {
    let items = sqlx::query_as!(
        AssetPriceHistory,
        r#"
        SELECT id, asset_id, price, source, created_at, updated_at
        FROM asset_price_history
        WHERE asset_id = $1
        ORDER BY created_at DESC
        LIMIT $2
        "#,
        asset_id,
        limit
    )
    .fetch_all(pool)
    .await?;

    Ok(items)
}

/// 获取合约地址列表
pub async fn get_contract_addresses(
    pool: &SqlitePool,
    network: Option<&str>,
) -> Result<Vec<AssetContractBinding>, AppError> {
    let _net = network.unwrap_or("hardhat");
    let items = sqlx::query_as!(
        AssetContractBinding,
        r#"
        SELECT id, asset_id, contract_name, contract_address, contract_type, is_primary, created_at, updated_at
        FROM asset_contract_binding
        "#
    )
    .fetch_all(pool)
    .await?;

    Ok(items)
}

/// 获取所有资产（不分页，用于内部查询）
pub async fn get_all_assets(
    pool: &SqlitePool,
    environment: Option<&str>,
) -> Result<Vec<Asset>, AppError> {
    let env = environment.unwrap_or("hardhat");
    let items = sqlx::query_as!(
        Asset,
        r#"
        SELECT id, name, symbol, description, asset_type,
        image_url, document_url, location, current_price, price_updated_at,
        total_supply, subscribed_amount, min_subscription,
        subscription_start_at, subscription_end_at,
        apy_3m, apy_6m, apy_12m,
        subscription_mode,
        project, contract_address, frame_style,
        status, environment,
        created_by, created_at, updated_at
        FROM asset
        WHERE environment = $1
        ORDER BY created_at DESC
        "#,
        env
    )
    .fetch_all(pool)
    .await?;

    Ok(items)
}
