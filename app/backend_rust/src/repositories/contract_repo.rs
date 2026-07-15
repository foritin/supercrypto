use sqlx::SqlitePool;

use crate::error::AppError;
use crate::models::contract::{ContractConfig, ContractDeployment, ProviderRegistry};

// ============================================
// ContractDeployment CRUD
// ============================================

/// 查询合约部署列表 (分页 + 过滤)
pub async fn list_deployments(
    pool: &SqlitePool,
    network: Option<&str>,
    project_name: Option<&str>,
    status: Option<&str>,
    page: i64,
    page_size: i64,
) -> Result<(Vec<ContractDeployment>, i64), AppError> {
    let offset = (page - 1).max(0) * page_size;

    let mut query = sqlx::QueryBuilder::<sqlx::Sqlite>::new(
        "SELECT id, name, address, deployer_address, network, chain_id, scope, \
         contract_type, project_name, tx_hash, status, abi_path, abi, is_primary, \
         created_at, updated_at \
         FROM contract_deployment WHERE 1=1",
    );
    if let Some(net) = network {
        query.push(" AND network = ").push_bind(net);
    }
    if let Some(proj) = project_name {
        query.push(" AND project_name = ").push_bind(proj);
    }
    if let Some(st) = status {
        query.push(" AND status = ").push_bind(st);
    }
    query.push(" ORDER BY created_at DESC LIMIT ").push_bind(page_size);
    query.push(" OFFSET ").push_bind(offset);

    let items = query
        .build_query_as::<ContractDeployment>()
        .fetch_all(pool)
        .await?;

    let mut count_query = sqlx::QueryBuilder::<sqlx::Sqlite>::new(
        "SELECT COUNT(*) FROM contract_deployment WHERE 1=1",
    );
    if let Some(net) = network {
        count_query.push(" AND network = ").push_bind(net);
    }
    if let Some(proj) = project_name {
        count_query.push(" AND project_name = ").push_bind(proj);
    }
    if let Some(st) = status {
        count_query.push(" AND status = ").push_bind(st);
    }
    let total: i64 = count_query.build_query_scalar().fetch_one(pool).await?;

    Ok((items, total))
}

/// 按名称查询合约部署
pub async fn get_deployment_by_name(
    pool: &SqlitePool,
    name: &str,
) -> Result<Option<ContractDeployment>, AppError> {
    let item = sqlx::query_as::<_, ContractDeployment>(
        "SELECT id, name, address, deployer_address, network, chain_id, scope, \
         contract_type, project_name, tx_hash, status, abi_path, abi, is_primary, \
         created_at, updated_at \
         FROM contract_deployment WHERE name = ? LIMIT 1",
    )
    .bind(name)
    .fetch_optional(pool)
    .await?;
    Ok(item)
}

/// 按地址查询合约部署
pub async fn get_deployment_by_address(
    pool: &SqlitePool,
    address: &str,
) -> Result<Option<ContractDeployment>, AppError> {
    let item = sqlx::query_as::<_, ContractDeployment>(
        "SELECT id, name, address, deployer_address, network, chain_id, scope, \
         contract_type, project_name, tx_hash, status, abi_path, abi, is_primary, \
         created_at, updated_at \
         FROM contract_deployment WHERE address = ? LIMIT 1",
    )
    .bind(address)
    .fetch_optional(pool)
    .await?;
    Ok(item)
}

/// 插入合约部署记录
#[allow(clippy::too_many_arguments)]
pub async fn insert_deployment(
    pool: &SqlitePool,
    name: &str,
    address: &str,
    deployer_address: &str,
    network: &str,
    chain_id: i64,
    scope: &str,
    contract_type: &str,
    project_name: &str,
    tx_hash: &str,
    abi_path: Option<&str>,
    abi: Option<&str>,
) -> Result<i64, AppError> {
    let result = sqlx::query(
        "INSERT INTO contract_deployment \
         (name, address, deployer_address, network, chain_id, scope, contract_type, \
         project_name, tx_hash, status, abi_path, abi) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)",
    )
    .bind(name)
    .bind(address)
    .bind(deployer_address)
    .bind(network)
    .bind(chain_id)
    .bind(scope)
    .bind(contract_type)
    .bind(project_name)
    .bind(tx_hash)
    .bind(abi_path)
    .bind(abi)
    .execute(pool)
    .await?;

    Ok(result.last_insert_rowid())
}

/// Upsert 合约部署记录 (先删后插)
#[allow(clippy::too_many_arguments)]
pub async fn upsert_deployment(
    pool: &SqlitePool,
    name: &str,
    address: &str,
    deployer_address: &str,
    network: &str,
    chain_id: i64,
    scope: &str,
    contract_type: &str,
    project_name: &str,
    tx_hash: &str,
    abi_path: Option<&str>,
    abi: Option<&str>,
) -> Result<i64, AppError> {
    sqlx::query(
        "DELETE FROM contract_deployment WHERE name = ? AND network = ? AND project_name = ?",
    )
    .bind(name)
    .bind(network)
    .bind(project_name)
    .execute(pool)
    .await?;

    insert_deployment(
        pool, name, address, deployer_address, network, chain_id, scope, contract_type,
        project_name, tx_hash, abi_path, abi,
    )
    .await
}

/// 更新合约状态
pub async fn update_deployment_status(
    pool: &SqlitePool,
    id: i64,
    status: &str,
) -> Result<(), AppError> {
    sqlx::query(
        "UPDATE contract_deployment SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    )
    .bind(status)
    .bind(id)
    .execute(pool)
    .await?;
    Ok(())
}

/// 删除合约部署记录
pub async fn delete_deployment(pool: &SqlitePool, id: i64) -> Result<(), AppError> {
    sqlx::query("DELETE FROM contract_deployment WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

/// 更新合约 ABI（按 name + network 定位）
pub async fn update_deployment_abi(
    pool: &SqlitePool,
    name: &str,
    network: &str,
    abi_json: &str,
) -> Result<(), AppError> {
    sqlx::query(
        "UPDATE contract_deployment SET abi = ?, updated_at = CURRENT_TIMESTAMP WHERE name = ? AND network = ?",
    )
    .bind(abi_json)
    .bind(name)
    .bind(network)
    .execute(pool)
    .await?;
    Ok(())
}

// ============================================
// ContractConfig CRUD
// ============================================

/// 查询合约配置列表
pub async fn list_configs(
    pool: &SqlitePool,
    project_name: Option<&str>,
) -> Result<Vec<ContractConfig>, AppError> {
    let items = if let Some(proj) = project_name {
        sqlx::query_as::<_, ContractConfig>(
            "SELECT id, contract_name, project_name, provider_key, provider_key_hash, \
             dependencies, contract_type, scope, description, dependency_type, is_primary, \
             deploy_order, required_deps, optional_deps, created_at, updated_at \
             FROM contract_config WHERE project_name = ? ORDER BY deploy_order",
        )
        .bind(proj)
        .fetch_all(pool)
        .await?
    } else {
        sqlx::query_as::<_, ContractConfig>(
            "SELECT id, contract_name, project_name, provider_key, provider_key_hash, \
             dependencies, contract_type, scope, description, dependency_type, is_primary, \
             deploy_order, required_deps, optional_deps, created_at, updated_at \
             FROM contract_config ORDER BY deploy_order",
        )
        .fetch_all(pool)
        .await?
    };
    Ok(items)
}

/// 按名称查询合约配置
pub async fn get_config_by_name(
    pool: &SqlitePool,
    name: &str,
) -> Result<Option<ContractConfig>, AppError> {
    let item = sqlx::query_as::<_, ContractConfig>(
        "SELECT id, contract_name, project_name, provider_key, provider_key_hash, \
         dependencies, contract_type, scope, description, dependency_type, is_primary, \
         deploy_order, required_deps, optional_deps, created_at, updated_at \
         FROM contract_config WHERE contract_name = ? LIMIT 1",
    )
    .bind(name)
    .fetch_optional(pool)
    .await?;
    Ok(item)
}

/// Upsert 合约配置
#[allow(clippy::too_many_arguments)]
pub async fn upsert_config(
    pool: &SqlitePool,
    contract_name: &str,
    project_name: &str,
    provider_key: Option<&str>,
    provider_key_hash: Option<&str>,
    dependencies: Option<&str>,
    contract_type: &str,
    scope: &str,
    description: Option<&str>,
    dependency_type: &str,
    is_primary: bool,
    deploy_order: i64,
    required_deps: Option<&str>,
    optional_deps: Option<&str>,
) -> Result<(), AppError> {
    sqlx::query(
        "INSERT INTO contract_config \
         (contract_name, project_name, provider_key, provider_key_hash, dependencies, \
         contract_type, scope, description, dependency_type, is_primary, deploy_order, \
         required_deps, optional_deps) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) \
         ON CONFLICT(contract_name) DO UPDATE SET \
         project_name = excluded.project_name, \
         provider_key = excluded.provider_key, \
         provider_key_hash = excluded.provider_key_hash, \
         dependencies = excluded.dependencies, \
         contract_type = excluded.contract_type, \
         scope = excluded.scope, \
         description = excluded.description, \
         dependency_type = excluded.dependency_type, \
         is_primary = excluded.is_primary, \
         deploy_order = excluded.deploy_order, \
         required_deps = excluded.required_deps, \
         optional_deps = excluded.optional_deps, \
         updated_at = CURRENT_TIMESTAMP",
    )
    .bind(contract_name)
    .bind(project_name)
    .bind(provider_key)
    .bind(provider_key_hash)
    .bind(dependencies)
    .bind(contract_type)
    .bind(scope)
    .bind(description)
    .bind(dependency_type)
    .bind(is_primary as i64)
    .bind(deploy_order)
    .bind(required_deps)
    .bind(optional_deps)
    .execute(pool)
    .await?;
    Ok(())
}

// ============================================
// ProviderRegistry CRUD
// ============================================

/// 查询 Provider Registry 列表
pub async fn list_registry(
    pool: &SqlitePool,
    provider_address: Option<&str>,
) -> Result<Vec<ProviderRegistry>, AppError> {
    let items = if let Some(addr) = provider_address {
        sqlx::query_as::<_, ProviderRegistry>(
            "SELECT id, provider_address, chain_id, network, key, key_hash, \
             is_registered, registered_address, is_deleted, deleted_at, deleted_by, \
             category, contract_name, last_synced_at, \
             created_at, updated_at \
             FROM provider_registry WHERE provider_address = ? AND is_deleted = 0 \
             ORDER BY key",
        )
        .bind(addr)
        .fetch_all(pool)
        .await?
    } else {
        sqlx::query_as::<_, ProviderRegistry>(
            "SELECT id, provider_address, chain_id, network, key, key_hash, \
             is_registered, registered_address, is_deleted, deleted_at, deleted_by, \
             category, contract_name, last_synced_at, \
             created_at, updated_at \
             FROM provider_registry WHERE is_deleted = 0 ORDER BY key",
        )
        .fetch_all(pool)
        .await?
    };
    Ok(items)
}

/// Upsert Provider Registry 记录
#[allow(clippy::too_many_arguments)]
pub async fn upsert_registry(
    pool: &SqlitePool,
    provider_address: &str,
    chain_id: i64,
    network: &str,
    key: &str,
    key_hash: &str,
    is_registered: bool,
    registered_address: &str,
    contract_name: Option<&str>,
) -> Result<(), AppError> {
    let existing: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM provider_registry \
         WHERE provider_address = ? AND chain_id = ? AND key = ?",
    )
    .bind(provider_address)
    .bind(chain_id)
    .bind(key)
    .fetch_one(pool)
    .await?;

    if existing > 0 {
        sqlx::query(
            "UPDATE provider_registry SET \
             is_registered = ?, registered_address = ?, \
             contract_name = COALESCE(?, contract_name), \
             is_deleted = 0, deleted_at = NULL, deleted_by = NULL, \
             updated_at = CURRENT_TIMESTAMP \
             WHERE provider_address = ? AND chain_id = ? AND key = ?",
        )
        .bind(is_registered as i64)
        .bind(registered_address)
        .bind(contract_name)
        .bind(provider_address)
        .bind(chain_id)
        .bind(key)
        .execute(pool)
        .await?;
    } else {
        sqlx::query(
            "INSERT INTO provider_registry \
             (provider_address, chain_id, network, key, key_hash, is_registered, \
             registered_address, is_deleted, contract_name) \
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)",
        )
        .bind(provider_address)
        .bind(chain_id)
        .bind(network)
        .bind(key)
        .bind(key_hash)
        .bind(is_registered as i64)
        .bind(registered_address)
        .bind(contract_name)
        .execute(pool)
        .await?;
    }
    Ok(())
}

// ============================================
// Additional CRUD for admin endpoints
// ============================================

/// Get deployment by numeric ID
pub async fn get_deployment_by_id(
    pool: &SqlitePool,
    id: i64,
) -> Result<Option<ContractDeployment>, AppError> {
    let item = sqlx::query_as::<_, ContractDeployment>(
        "SELECT id, name, address, deployer_address, network, chain_id, scope, \
         contract_type, project_name, tx_hash, status, abi_path, abi, is_primary, \
         created_at, updated_at \
         FROM contract_deployment WHERE id = ? LIMIT 1",
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;
    Ok(item)
}

/// Update contract deployment address
pub async fn update_deployment_address(
    pool: &SqlitePool,
    name: &str,
    address: &str,
) -> Result<(), AppError> {
    sqlx::query(
        "UPDATE contract_deployment SET address = ?, status = 'active', \
         updated_at = CURRENT_TIMESTAMP WHERE name = ?",
    )
    .bind(address)
    .bind(name)
    .execute(pool)
    .await?;
    Ok(())
}

/// Set a contract as primary (must be PROJECT scope, no existing primary for the project)
pub async fn set_primary(pool: &SqlitePool, id: i64) -> Result<ContractDeployment, AppError> {
    let contract = get_deployment_by_id(pool, id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("contract {} not found", id)))?;

    if contract.scope != "project" {
        return Err(AppError::BadRequest(format!(
            "contract {} is not PROJECT scope (current: {})",
            id, contract.scope
        )));
    }

    // Check existing primary for the same project
    let existing: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM contract_deployment \
         WHERE project_name = ? AND is_primary = 1 AND id != ?",
    )
    .bind(&contract.project_name)
    .bind(id)
    .fetch_one(pool)
    .await?;

    if existing > 0 {
        return Err(AppError::BadRequest(format!(
            "project {} already has a primary contract",
            contract.project_name
        )));
    }

    sqlx::query(
        "UPDATE contract_deployment SET is_primary = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    )
    .bind(id)
    .execute(pool)
    .await?;

    get_deployment_by_id(pool, id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("contract {} not found after update", id)))
}

/// Unset a contract as primary
pub async fn unset_primary(pool: &SqlitePool, id: i64) -> Result<ContractDeployment, AppError> {
    let contract = get_deployment_by_id(pool, id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("contract {} not found", id)))?;

    if contract.is_primary == 0 {
        return Err(AppError::BadRequest(format!(
            "contract {} is not primary",
            contract.name
        )));
    }

    sqlx::query(
        "UPDATE contract_deployment SET is_primary = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    )
    .bind(id)
    .execute(pool)
    .await?;

    get_deployment_by_id(pool, id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("contract {} not found after update", id)))
}

/// Get registry record by provider_address + key
pub async fn get_registry_by_key(
    pool: &SqlitePool,
    provider_address: &str,
    key: &str,
) -> Result<Option<ProviderRegistry>, AppError> {
    let item = sqlx::query_as::<_, ProviderRegistry>(
        "SELECT id, provider_address, chain_id, network, key, key_hash, \
         is_registered, registered_address, is_deleted, deleted_at, deleted_by, \
         category, contract_name, last_synced_at, \
         created_at, updated_at \
         FROM provider_registry WHERE provider_address = ? AND key = ? AND is_deleted = 0 LIMIT 1",
    )
    .bind(provider_address)
    .bind(key)
    .fetch_optional(pool)
    .await?;
    Ok(item)
}

/// Soft delete a registry record
pub async fn soft_delete_registry(
    pool: &SqlitePool,
    provider_address: &str,
    key: &str,
    deleted_by: &str,
) -> Result<(), AppError> {
    sqlx::query(
        "UPDATE provider_registry SET is_registered = 0, registered_address = ?, \
         is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, deleted_by = ?, \
         updated_at = CURRENT_TIMESTAMP \
         WHERE provider_address = ? AND key = ?",
    )
    .bind("0x0000000000000000000000000000000000000000")
    .bind(deleted_by)
    .bind(provider_address)
    .bind(key)
    .execute(pool)
    .await?;
    Ok(())
}

/// List all configs that have a provider_key
pub async fn list_configs_with_provider_key(
    pool: &SqlitePool,
) -> Result<Vec<ContractConfig>, AppError> {
    let items = sqlx::query_as::<_, ContractConfig>(
        "SELECT id, contract_name, project_name, provider_key, provider_key_hash, \
         dependencies, contract_type, scope, description, dependency_type, is_primary, \
         deploy_order, required_deps, optional_deps, created_at, updated_at \
         FROM contract_config WHERE provider_key IS NOT NULL ORDER BY deploy_order",
    )
    .fetch_all(pool)
    .await?;
    Ok(items)
}

/// Delete deployments by project name
pub async fn delete_deployments_by_project(
    pool: &SqlitePool,
    project_name: &str,
) -> Result<i64, AppError> {
    let result = sqlx::query(
        "DELETE FROM contract_deployment WHERE project_name = ?",
    )
    .bind(project_name)
    .execute(pool)
    .await?;
    Ok(result.rows_affected() as i64)
}

/// Delete all deployments
pub async fn delete_all_deployments(pool: &SqlitePool) -> Result<i64, AppError> {
    let result = sqlx::query("DELETE FROM contract_deployment")
        .execute(pool)
        .await?;
    Ok(result.rows_affected() as i64)
}
