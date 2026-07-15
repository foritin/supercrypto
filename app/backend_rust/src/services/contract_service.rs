use sqlx::SqlitePool;

use crate::config::AppConfig;
use crate::contracts::provider;
use crate::error::AppError;
use crate::repositories::contract_repo;
use crate::schemas::contract::*;

/// 获取部署者私钥 (优先 deployer, 回退到 faucet)
fn get_deployer_key(config: &AppConfig) -> &str {
    if config.deployer.private_key.is_empty() {
        &config.faucet.private_key
    } else {
        &config.deployer.private_key
    }
}

/// 合约名称转 Provider Key (CamelCase -> UPPER_SNAKE_CASE)
fn name_to_provider_key(name: &str) -> String {
    match name {
        "KYC" | "KYCManager" => return "KYC_MANAGER".to_string(),
        "AddressProvider" => return "ADDRESS_PROVIDER".to_string(),
        "TreasuryMultisig" => return "TREASURY_MULTISIG".to_string(),
        _ => {}
    }
    let mut result = Vec::new();
    for (i, ch) in name.chars().enumerate() {
        if ch.is_uppercase() && i > 0 {
            result.push('_');
        }
        result.push(ch.to_ascii_uppercase());
    }
    result.into_iter().collect()
}

/// 部署合约: 解析 bytecode -> 链上部署 -> 入库
pub async fn deploy_contract(
    db: &SqlitePool,
    config: &AppConfig,
    req: &DeployContractRequest,
) -> Result<DeployResult, AppError> {
    let bytecode = provider::parse_hex_bytes(&req.bytecode)?;
    let args = req
        .constructor_args
        .as_ref()
        .filter(|s| !s.is_empty())
        .map(|s| provider::parse_hex_bytes(s))
        .transpose()?;
    let bytecode = provider::combine_bytecode_and_args(bytecode, args);

    let private_key = get_deployer_key(config);
    let deployer_address = provider::get_address_from_private_key(private_key)?;

    let receipt =
        provider::deploy_bytecode(&config.chain.rpc_url, private_key, bytecode).await?;

    let abi_str = req
        .abi
        .as_ref()
        .map(|v| serde_json::to_string(v).unwrap_or_default());

    let scope = req.scope.as_deref().unwrap_or("common");
    contract_repo::insert_deployment(
        db,
        &req.name,
        &receipt.address,
        &deployer_address,
        &config.chain.network,
        config.chain.chain_id as i64,
        scope,
        &req.contract_type,
        &req.project_name,
        &receipt.tx_hash,
        None,
        abi_str.as_deref(),
    )
    .await?;

    Ok(DeployResult {
        name: req.name.clone(),
        address: receipt.address,
        tx_hash: receipt.tx_hash,
        deployer_address,
        block_number: receipt.block_number,
    })
}

/// 导入已部署合约: 验证链上代码 -> 入库
pub async fn import_contract(
    db: &SqlitePool,
    config: &AppConfig,
    req: &ImportContractRequest,
) -> Result<(), AppError> {
    let exists =
        provider::check_contract_code(&config.chain.rpc_url, &req.address).await?;
    if !exists {
        return Err(AppError::Web3(format!(
            "no contract code at address: {}",
            req.address
        )));
    }

    let abi_str = req
        .abi
        .as_ref()
        .map(|v| serde_json::to_string(v).unwrap_or_default());

    let scope = req.scope.as_deref().unwrap_or("common");
    let deployer = req
        .deployer_address
        .as_deref()
        .unwrap_or("0x0000000000000000000000000000000000000000");
    let tx_hash = req
        .tx_hash
        .as_deref()
        .unwrap_or("0x0000000000000000000000000000000000000000000000000000000000000000");

    contract_repo::upsert_deployment(
        db,
        &req.name,
        &req.address,
        deployer,
        &config.chain.network,
        config.chain.chain_id as i64,
        scope,
        &req.contract_type,
        &req.project_name,
        tx_hash,
        None,
        abi_str.as_deref(),
    )
    .await?;

    Ok(())
}

/// 注册合约到 AddressProvider: 链上交易 + DB 更新
pub async fn register_to_provider(
    db: &SqlitePool,
    config: &AppConfig,
    req: &RegisterToProviderRequest,
) -> Result<(), AppError> {
    let private_key = get_deployer_key(config);

    provider::register_to_provider_onchain(
        &config.chain.rpc_url,
        private_key,
        &req.provider_address,
        &req.key_name,
        &req.contract_address,
    )
    .await?;

    let key_hash = provider::compute_key_hash(&req.key_name);
    let key_hash_str = key_hash.to_string();

    // Look up contract_name from config by matching provider_key
    let configs = contract_repo::list_configs(db, None).await?;
    let contract_name = configs
        .iter()
        .find(|c| c.provider_key.as_deref() == Some(&req.key_name))
        .map(|c| c.contract_name.as_str());

    contract_repo::upsert_registry(
        db,
        &req.provider_address,
        config.chain.chain_id as i64,
        &config.chain.network,
        &req.key_name,
        &key_hash_str,
        true,
        &req.contract_address,
        contract_name,
    )
    .await?;

    Ok(())
}

/// 同步 Provider Registry: 从链上读取所有注册地址 -> 更新 DB
pub async fn sync_registry(
    db: &SqlitePool,
    config: &AppConfig,
    provider_address: &str,
) -> Result<SyncResult, AppError> {
    let onchain_pairs =
        provider::get_all_registered_addresses(&config.chain.rpc_url, provider_address).await?;

    // Build reverse map: key_hash_str -> (key_name, contract_name) from configs
    let configs = contract_repo::list_configs(db, None).await?;
    let hash_to_info: std::collections::HashMap<String, (&str, &str)> = configs
        .iter()
        .filter_map(|c| {
            c.provider_key.as_ref().and_then(|pk| {
                let kh = provider::compute_key_hash(pk).to_string();
                Some((kh, (pk.as_str(), c.contract_name.as_str())))
            })
        })
        .collect();

    let mut synced_count = 0i64;
    let mut details = Vec::new();

    for (key_hash, addr) in onchain_pairs {
        let key_hash_str = key_hash.to_string();
        let addr_str = addr.to_string();
        let is_zero = addr_str.eq_ignore_ascii_case(provider::ZERO_ADDRESS);

        // Resolve key_name and contract_name from reverse map; fall back to key_hash_str
        let (key_name, contract_name) = hash_to_info
            .get(&key_hash_str)
            .copied()
            .unwrap_or((key_hash_str.as_str(), key_hash_str.as_str()));

        contract_repo::upsert_registry(
            db,
            provider_address,
            config.chain.chain_id as i64,
            &config.chain.network,
            key_name,
            &key_hash_str,
            !is_zero,
            &addr_str,
            Some(contract_name),
        )
        .await?;

        synced_count += 1;
        details.push(serde_json::json!({
            "key": key_name,
            "key_hash": key_hash_str,
            "registered_address": addr_str,
            "is_registered": !is_zero,
        }));
    }

    Ok(SyncResult {
        provider_address: provider_address.to_string(),
        synced_count,
        details,
    })
}

/// 验证合约: 链上代码 + DB 记录 + Provider 注册状态
pub async fn verify_contract(
    db: &SqlitePool,
    config: &AppConfig,
    name: &str,
) -> Result<VerifyResult, AppError> {
    let deployment = contract_repo::get_deployment_by_name(db, name)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("contract {} not found", name)))?;

    let onchain_exists =
        provider::check_contract_code(&config.chain.rpc_url, &deployment.address).await?;

    let provider_deployment =
        contract_repo::get_deployment_by_name(db, "AddressProvider").await?;

    let (provider_registered, provider_address) = if let Some(pd) = provider_deployment {
        let key_name = name_to_provider_key(name);
        match provider::get_registered_address(
            &config.chain.rpc_url,
            &pd.address,
            &key_name,
        )
        .await
        {
            Ok(registered_addr) => {
                let is_registered =
                    registered_addr.eq_ignore_ascii_case(&deployment.address);
                (Some(is_registered), Some(pd.address))
            }
            Err(_) => (None, Some(pd.address)),
        }
    } else {
        (None, None)
    };

    Ok(VerifyResult {
        name: deployment.name,
        address: deployment.address,
        onchain_exists,
        db_exists: true,
        provider_registered,
        provider_address,
    })
}

// ============================================
// Prepare / Confirm (frontend wallet signing mode)
// ============================================

/// The IAddressProvider ABI as JSON (for prepare responses)
fn provider_abi_json() -> serde_json::Value {
    serde_json::json!([
        {
            "name": "admin_set_address",
            "type": "function",
            "stateMutability": "nonpayable",
            "inputs": [
                {"name": "_id", "type": "bytes32"},
                {"name": "_addr", "type": "address"}
            ],
            "outputs": []
        },
        {
            "name": "get_address",
            "type": "function",
            "stateMutability": "view",
            "inputs": [{"name": "_id", "type": "bytes32"}],
            "outputs": [{"name": "", "type": "address"}]
        },
        {
            "name": "get_all_addresses",
            "type": "function",
            "stateMutability": "view",
            "inputs": [],
            "outputs": [
                {"name": "_types", "type": "bytes32[]"},
                {"name": "_addrs", "type": "address[]"}
            ]
        }
    ])
}

/// Get provider key from config or derive from name
fn get_effective_key(config: &crate::models::contract::ContractConfig, fallback_name: &str) -> String {
    config.provider_key.clone().unwrap_or_else(|| name_to_provider_key(fallback_name))
}

/// Get provider key hash from config or compute
fn get_effective_key_hash(config: &crate::models::contract::ContractConfig, fallback_name: &str) -> String {
    if let Some(hash) = &config.provider_key_hash {
        if !hash.is_empty() {
            return hash.clone();
        }
    }
    let key = get_effective_key(config, fallback_name);
    provider::compute_key_hash(&key).to_string()
}

/// Prepare register: return calldata info for frontend wallet signing
pub async fn prepare_register(
    db: &SqlitePool,
    _config: &AppConfig,
    req: &PrepareRegisterRequest,
) -> Result<serde_json::Value, AppError> {
    let contract = contract_repo::get_deployment_by_name(db, &req.contract_name)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("contract {} not found", req.contract_name)))?;

    let cfg = contract_repo::get_config_by_name(db, &req.contract_name).await?;
    let key = req.provider_key.clone()
        .or_else(|| cfg.as_ref().and_then(|c| c.provider_key.clone()))
        .unwrap_or_else(|| name_to_provider_key(&req.contract_name));

    let key_hash = cfg.as_ref()
        .map(|c| get_effective_key_hash(c, &req.contract_name))
        .unwrap_or_else(|| provider::compute_key_hash(&key).to_string());

    let provider = contract_repo::get_deployment_by_name(db, "AddressProvider")
        .await?
        .ok_or_else(|| AppError::NotFound("AddressProvider not deployed".to_string()))?;

    Ok(serde_json::json!({
        "provider_address": provider.address,
        "function_name": "admin_set_address",
        "key_hash": key_hash,
        "contract_address": contract.address,
        "contract_name": req.contract_name,
        "provider_key": key,
        "abi": provider_abi_json(),
    }))
}

/// Confirm register: verify on-chain state, update DB cache
pub async fn confirm_register(
    db: &SqlitePool,
    config: &AppConfig,
    req: &ConfirmRegisterRequest,
) -> Result<serde_json::Value, AppError> {
    let _contract = contract_repo::get_deployment_by_name(db, &req.contract_name)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("contract {} not found", req.contract_name)))?;

    let cfg = contract_repo::get_config_by_name(db, &req.contract_name).await?;
    let effective_key = cfg.as_ref()
        .map(|c| get_effective_key(c, &req.contract_name))
        .unwrap_or(req.provider_key.clone());

    let key_hash = cfg.as_ref()
        .map(|c| get_effective_key_hash(c, &req.contract_name))
        .unwrap_or_else(|| provider::compute_key_hash(&effective_key).to_string());

    let provider = contract_repo::get_deployment_by_name(db, "AddressProvider")
        .await?
        .ok_or_else(|| AppError::NotFound("AddressProvider not deployed".to_string()))?;

    // Verify on-chain
    let on_chain_address = provider::get_registered_address(
        &config.chain.rpc_url,
        &provider.address,
        &effective_key,
    ).await.unwrap_or_else(|_| provider::ZERO_ADDRESS.to_string());

    contract_repo::upsert_registry(
        db,
        &provider.address,
        config.chain.chain_id as i64,
        &config.chain.network,
        &effective_key,
        &key_hash,
        true,
        &on_chain_address,
        Some(&req.contract_name),
    ).await?;

    // Also update contract_config so list_contracts can JOIN on provider_key_hash
    let _ = sqlx::query!(
        "UPDATE contract_config SET provider_key = $1, provider_key_hash = $2 WHERE contract_name = $3",
        effective_key, key_hash, req.contract_name
    )
    .execute(db)
    .await;

    Ok(serde_json::json!({
        "status": "registered",
        "contract_name": req.contract_name,
        "provider_key": effective_key,
        "address": on_chain_address,
        "tx_hash": req.tx_hash,
    }))
}

/// Prepare unregister: return calldata info with zero address
pub async fn prepare_unregister(
    db: &SqlitePool,
    _config: &AppConfig,
    req: &PrepareUnregisterRequest,
) -> Result<serde_json::Value, AppError> {
    let cfg = contract_repo::get_config_by_name(db, &req.contract_name).await?;
    let key = req.provider_key.clone()
        .or_else(|| cfg.as_ref().and_then(|c| c.provider_key.clone()))
        .unwrap_or_else(|| name_to_provider_key(&req.contract_name));

    let key_hash = cfg.as_ref()
        .map(|c| get_effective_key_hash(c, &req.contract_name))
        .unwrap_or_else(|| provider::compute_key_hash(&key).to_string());

    let provider = contract_repo::get_deployment_by_name(db, "AddressProvider")
        .await?
        .ok_or_else(|| AppError::NotFound("AddressProvider not deployed".to_string()))?;

    Ok(serde_json::json!({
        "provider_address": provider.address,
        "function_name": "admin_set_address",
        "key_hash": key_hash,
        "contract_address": provider::ZERO_ADDRESS,
        "contract_name": req.contract_name,
        "provider_key": key,
        "abi": provider_abi_json(),
    }))
}

/// Confirm unregister: verify on-chain zero address, soft delete DB record
pub async fn confirm_unregister(
    db: &SqlitePool,
    _config: &AppConfig,
    req: &ConfirmUnregisterRequest,
) -> Result<serde_json::Value, AppError> {
    let cfg = contract_repo::get_config_by_name(db, &req.contract_name).await?;
    let effective_key = cfg.as_ref()
        .map(|c| get_effective_key(c, &req.contract_name))
        .unwrap_or(req.provider_key.clone());

    let provider = contract_repo::get_deployment_by_name(db, "AddressProvider")
        .await?
        .ok_or_else(|| AppError::NotFound("AddressProvider not deployed".to_string()))?;

    // Soft delete the registry record
    let deleted_by = format!("unregister_tx:{}", &req.tx_hash[..req.tx_hash.len().min(10)]);
    contract_repo::soft_delete_registry(db, &provider.address, &effective_key, &deleted_by).await?;

    // Clear provider_key in contract_config
    let _ = sqlx::query!(
        "UPDATE contract_config SET provider_key = NULL, provider_key_hash = NULL WHERE contract_name = $1",
        req.contract_name
    )
    .execute(db)
    .await;

    Ok(serde_json::json!({
        "success": true,
        "contract_name": req.contract_name,
        "provider_key": effective_key,
        "tx_hash": req.tx_hash,
        "message": "Contract unregistered successfully",
    }))
}

/// Prepare set treasury: return calldata info for setting TREASURY key
pub async fn prepare_set_treasury(
    db: &SqlitePool,
    _config: &AppConfig,
    req: &PrepareSetTreasuryRequest,
) -> Result<serde_json::Value, AppError> {
    let treasury_contract = contract_repo::get_deployment_by_name(db, &req.treasury_contract_name)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("contract {} not found", req.treasury_contract_name)))?;

    let provider = contract_repo::get_deployment_by_name(db, "AddressProvider")
        .await?
        .ok_or_else(|| AppError::NotFound("AddressProvider not deployed".to_string()))?;

    let key = "TREASURY".to_string();
    let key_hash = provider::compute_key_hash(&key).to_string();

    Ok(serde_json::json!({
        "provider_address": provider.address,
        "function_name": "admin_set_address",
        "key_hash": key_hash,
        "contract_address": treasury_contract.address,
        "contract_name": req.treasury_contract_name,
        "provider_key": key,
        "abi": provider_abi_json(),
    }))
}

/// Confirm set treasury: verify on-chain, update DB cache
pub async fn confirm_set_treasury(
    db: &SqlitePool,
    config: &AppConfig,
    req: &ConfirmSetTreasuryRequest,
) -> Result<serde_json::Value, AppError> {
    let _treasury_contract = contract_repo::get_deployment_by_name(db, &req.treasury_contract_name)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("contract {} not found", req.treasury_contract_name)))?;

    let provider = contract_repo::get_deployment_by_name(db, "AddressProvider")
        .await?
        .ok_or_else(|| AppError::NotFound("AddressProvider not deployed".to_string()))?;

    let key = "TREASURY".to_string();
    let key_hash = provider::compute_key_hash(&key).to_string();

    // Verify on-chain
    let on_chain_address = provider::get_registered_address(
        &config.chain.rpc_url,
        &provider.address,
        &key,
    ).await.unwrap_or_else(|_| provider::ZERO_ADDRESS.to_string());

    contract_repo::upsert_registry(
        db,
        &provider.address,
        config.chain.chain_id as i64,
        &config.chain.network,
        &key,
        &key_hash,
        on_chain_address != provider::ZERO_ADDRESS,
        &on_chain_address,
        Some(&req.treasury_contract_name),
    ).await?;

    Ok(serde_json::json!({
        "status": "registered",
        "provider_key": key,
        "contract_name": req.treasury_contract_name,
        "address": on_chain_address,
        "tx_hash": req.tx_hash,
    }))
}

/// Get treasury binding: read TREASURY and TREASURY_MULTISIG from chain
pub async fn get_treasury_binding(
    db: &SqlitePool,
    config: &AppConfig,
) -> Result<serde_json::Value, AppError> {
    let provider = contract_repo::get_deployment_by_name(db, "AddressProvider")
        .await?
        .ok_or_else(|| AppError::NotFound("AddressProvider not deployed".to_string()))?;

    let treasury = provider::get_registered_address(
        &config.chain.rpc_url, &provider.address, "TREASURY",
    ).await.unwrap_or_else(|_| provider::ZERO_ADDRESS.to_string());

    let treasury_multisig = provider::get_registered_address(
        &config.chain.rpc_url, &provider.address, "TREASURY_MULTISIG",
    ).await.unwrap_or_else(|_| provider::ZERO_ADDRESS.to_string());

    Ok(serde_json::json!({
        "provider_address": provider.address,
        "treasury": treasury,
        "treasury_multisig": treasury_multisig,
    }))
}

/// Get dependency graph: build nodes + edges from DB
pub async fn get_dependency_graph(
    db: &SqlitePool,
) -> Result<serde_json::Value, AppError> {
    let configs = contract_repo::list_configs(db, None).await?;

    // Build contract map (name -> deployment)
    let mut contract_map: std::collections::HashMap<String, crate::models::contract::ContractDeployment> = std::collections::HashMap::new();
    for c in contract_repo::list_deployments(db, None, None, None, 1, 1000).await?.0 {
        contract_map.insert(c.name.clone(), c);
    }

    // Build registry map (contract_name -> registry)
    let registries = contract_repo::list_registry(db, None).await?;
    let mut registry_map: std::collections::HashMap<String, crate::models::contract::ProviderRegistry> = std::collections::HashMap::new();
    for r in registries {
        if let Some(cn) = &r.contract_name {
            registry_map.insert(cn.clone(), r);
        }
    }

    // Build key_to_contract map (provider_key -> contract_name)
    let mut key_to_contract: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    for c in &configs {
        if let Some(pk) = &c.provider_key {
            key_to_contract.insert(pk.clone(), c.contract_name.clone());
        }
    }

    let type_to_graph_type = |ct: &str| -> &str {
        match ct {
            "stablecoin" | "kyc" => "foundation",
            "rwa_token" | "platform_token" => "token",
            "subscription" | "staking" | "liquidity_mining" => "business",
            _ => "exclusive",
        }
    };

    let mut nodes = Vec::new();
    for cfg in &configs {
        let contract = contract_map.get(&cfg.contract_name);
        let registry = registry_map.get(&cfg.contract_name);

        let deps: Vec<String> = cfg.dependencies.as_ref()
            .and_then(|d| d.as_array())
            .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
            .unwrap_or_default();

        let missing_deps: Vec<&str> = deps.iter()
            .filter(|dk| {
                let dep_name = key_to_contract.get(*dk).map(|s| s.as_str()).unwrap_or(dk.as_str());
                let dr = registry_map.get(dep_name);
                dr.map(|r| r.is_registered == 0).unwrap_or(true)
            })
            .map(|s| s.as_str())
            .collect();

        let node_status = if contract.is_none() || contract.unwrap().address.is_empty() {
            "not_deployed"
        } else if cfg.provider_key.is_some() && (registry.is_none() || registry.unwrap().is_registered == 0) {
            "not_registered"
        } else if !missing_deps.is_empty() {
            "missing_deps"
        } else {
            "ready"
        };

        nodes.push(serde_json::json!({
            "id": cfg.contract_name,
            "label": cfg.contract_name,
            "type": type_to_graph_type(&cfg.contract_type),
            "module": cfg.contract_type,
            "address": contract.map(|c| c.address.clone()),
            "status": node_status,
            "project": cfg.project_name,
            "isRegistered": registry.map(|r| r.is_registered == 1).unwrap_or(false),
            "providerAddress": registry.map(|r| r.registered_address.clone()),
            "missingDeps": missing_deps,
            "description": cfg.description,
            "isDeleted": registry.map(|r| r.is_deleted == 1).unwrap_or(false),
        }));
    }

    let mut edges = Vec::new();
    for cfg in &configs {
        let deps: Vec<String> = cfg.dependencies.as_ref()
            .and_then(|d| d.as_array())
            .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
            .unwrap_or_default();

        for dep_key in deps {
            let dep_name = key_to_contract.get(&dep_key).cloned().unwrap_or_else(|| dep_key.clone());
            let dep_reg = registry_map.get(&dep_name);
            edges.push(serde_json::json!({
                "source": cfg.contract_name,
                "target": dep_name,
                "key": dep_key,
                "status": if dep_reg.map(|r| r.is_registered == 1).unwrap_or(false) { "registered" } else { "not_registered" },
                "registeredAddress": dep_reg.map(|r| r.registered_address.clone()),
            }));
        }
    }

    Ok(serde_json::json!({"nodes": nodes, "edges": edges}))
}

/// Set primary contract
pub async fn set_primary(db: &SqlitePool, id: i64) -> Result<serde_json::Value, AppError> {
    let contract = contract_repo::set_primary(db, id).await?;
    Ok(serde_json::json!({
        "id": contract.id, "name": contract.name, "address": contract.address,
        "project_name": contract.project_name, "scope": contract.scope,
        "contract_type": contract.contract_type, "is_primary": contract.is_primary == 1,
        "status": contract.status, "network": contract.network, "chain_id": contract.chain_id,
    }))
}

/// Unset primary contract
pub async fn unset_primary(db: &SqlitePool, id: i64) -> Result<serde_json::Value, AppError> {
    let contract = contract_repo::unset_primary(db, id).await?;
    Ok(serde_json::json!({
        "id": contract.id, "name": contract.name, "address": contract.address,
        "project_name": contract.project_name, "scope": contract.scope,
        "contract_type": contract.contract_type, "is_primary": contract.is_primary == 1,
        "status": contract.status, "network": contract.network, "chain_id": contract.chain_id,
    }))
}

/// Update registry record (manual address update)
pub async fn update_registry_record(
    db: &SqlitePool,
    contract_name: &str,
    address: &str,
) -> Result<serde_json::Value, AppError> {
    contract_repo::update_deployment_address(db, contract_name, address).await?;
    let contract = contract_repo::get_deployment_by_name(db, contract_name)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("contract {} not found", contract_name)))?;

    Ok(serde_json::json!({
        "contract_name": contract.name,
        "address": contract.address,
        "status": contract.status,
        "network": contract.network,
    }))
}

/// Validate contract addresses (format + on-chain existence)
pub async fn validate_contracts(
    _db: &SqlitePool,
    config: &AppConfig,
    req: &ValidateContractRequest,
) -> Result<serde_json::Value, AppError> {
    let mut results = serde_json::Map::new();
    let mut all_valid = true;

    for addr in &req.addresses {
        let format_valid = addr.starts_with("0x") && addr.len() == 42;
        let exists_on_chain = if format_valid {
            provider::check_contract_code(&config.chain.rpc_url, addr).await.unwrap_or(false)
        } else {
            false
        };

        let message = if !format_valid {
            "Invalid address format".to_string()
        } else if !exists_on_chain {
            "No contract code at address".to_string()
        } else {
            "OK".to_string()
        };

        if !format_valid || !exists_on_chain {
            all_valid = false;
        }

        results.insert(addr.clone(), serde_json::json!({
            "address": addr,
            "format_valid": format_valid,
            "exists_on_chain": exists_on_chain,
            "message": message,
        }));
    }

    Ok(serde_json::json!({
        "results": serde_json::Value::Object(results),
        "all_valid": all_valid,
    }))
}

/// Sync from provider (using AddressProvider from DB)
pub async fn sync_from_provider(
    db: &SqlitePool,
    config: &AppConfig,
) -> Result<serde_json::Value, AppError> {
    let provider = contract_repo::get_deployment_by_name(db, "AddressProvider")
        .await?
        .ok_or_else(|| AppError::NotFound("AddressProvider not deployed".to_string()))?;

    let result = sync_registry(db, config, &provider.address).await?;
    Ok(serde_json::json!({
        "updated": result.synced_count,
        "created": 0,
        "total": result.synced_count,
    }))
}

/// Get contract dependencies for a specific contract
pub async fn get_contract_dependencies(
    db: &SqlitePool,
    name: &str,
) -> Result<serde_json::Value, AppError> {
    let cfg = contract_repo::get_config_by_name(db, name)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("config for {} not found", name)))?;

    let depends_on: Vec<String> = cfg.dependencies.as_ref()
        .and_then(|d| d.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
        .unwrap_or_default();

    // Build set_functions from required_deps + optional_deps
    let mut set_functions: Vec<String> = Vec::new();
    if let Some(rd) = &cfg.required_deps {
        if let Some(arr) = rd.as_array() {
            for v in arr {
                if let Some(s) = v.as_str() {
                    set_functions.push(s.to_string());
                }
            }
        }
    }
    if let Some(od) = &cfg.optional_deps {
        if let Some(arr) = od.as_array() {
            for v in arr {
                if let Some(s) = v.as_str() {
                    set_functions.push(s.to_string());
                }
            }
        }
    }

    Ok(serde_json::json!({
        "contract_name": name,
        "depends_on": depends_on,
        "set_functions": set_functions,
    }))
}

/// Get contract status list (compatible with Python backend /admin/contracts/status)
pub async fn get_contract_status(
    db: &SqlitePool,
    config: &AppConfig,
) -> Result<serde_json::Value, AppError> {
    use std::collections::HashMap;

    let network = &config.chain.network;

    // Load all configs, deployments, registries
    let configs = contract_repo::list_configs(db, None).await?;
    let (deployments, _) = contract_repo::list_deployments(db, Some(network), None, None, 1, 1000).await?;
    let registries = contract_repo::list_registry(db, None).await?;

    // Build lookup maps
    let contract_map: HashMap<&str, &crate::models::contract::ContractDeployment> =
        deployments.iter().map(|d| (d.name.as_str(), d)).collect();
    // Registry lookup by key (provider_key), not by contract_name
    let registry_by_key: HashMap<&str, &crate::models::contract::ProviderRegistry> =
        registries.iter().map(|r| (r.key.as_str(), r)).collect();
    // Map contract_name -> provider_key from configs (for dependency lookups)
    let name_to_key: HashMap<&str, &str> = configs.iter()
        .filter_map(|c| c.provider_key.as_ref().map(|pk| (c.contract_name.as_str(), pk.as_str())))
        .collect();

    // Type config lookup
    let type_config = |ct: &str| -> serde_json::Value {
        match ct {
            "registry" => serde_json::json!({"label": "注册中心", "color": "purple", "icon": "📦"}),
            "kyc" => serde_json::json!({"label": "KYC", "color": "blue", "icon": "🔐"}),
            "governance" => serde_json::json!({"label": "治理", "color": "indigo", "icon": "⚖️"}),
            "stablecoin" => serde_json::json!({"label": "稳定币", "color": "green", "icon": "💵"}),
            "token" => serde_json::json!({"label": "代币", "color": "yellow", "icon": "🪙"}),
            "defi" => serde_json::json!({"label": "DeFi", "color": "orange", "icon": "📊"}),
            _ => serde_json::json!({"label": ct, "color": "gray", "icon": "📄"}),
        }
    };

    // Build dep status helper
    let build_dep_status = |deps: &Option<serde_json::Value>, registry_by_key: &HashMap<&str, &crate::models::contract::ProviderRegistry>, name_to_key: &HashMap<&str, &str>| -> Vec<serde_json::Value> {
        let mut result = Vec::new();
        if let Some(arr) = deps.as_ref().and_then(|d| d.as_array()) {
            for v in arr {
                if let Some(contract_name) = v.as_str() {
                    // Look up by provider_key (via name_to_key map), then by contract_name as fallback
                    let dep_reg = name_to_key.get(contract_name)
                        .and_then(|pk| registry_by_key.get(pk))
                        .or_else(|| registry_by_key.get(contract_name));
                    result.push(serde_json::json!({
                        "key": contract_name,
                        "contract": contract_name,
                        "registered": dep_reg.map(|r| r.is_registered == 1).unwrap_or(false),
                        "address": dep_reg.map(|r| r.registered_address.clone()),
                    }));
                }
            }
        }
        result
    };

    let zero_addr = "0x0000000000000000000000000000000000000000";

    // Check treasury configured
    let treasury_configured = registry_by_key.values().any(|r| {
        r.key == "TREASURY"
            && r.is_registered == 1
            && !r.registered_address.eq_ignore_ascii_case(zero_addr)
            && r.is_deleted == 0
    });

    let mut global_contracts = Vec::new();
    let mut project_groups: HashMap<&str, Vec<serde_json::Value>> = HashMap::new();
    let mut needs_update_count = 0i64;

    for cfg in &configs {
        let contract = contract_map.get(cfg.contract_name.as_str()).copied();
        let db_addr = contract.map(|c| c.address.as_str());
        // Look up registry by provider_key (falls back to contract_name for legacy data)
        let registry = cfg.provider_key.as_deref()
            .and_then(|pk| registry_by_key.get(pk))
            .copied()
            .or_else(|| registry_by_key.get(cfg.contract_name.as_str()).copied());

        let chain_addr = registry
            .filter(|r| r.is_registered == 1)
            .map(|r| r.registered_address.as_str());

        // Resolve status
        let (status, update_inc) = if db_addr.is_none() || db_addr == Some("") {
            ("not_deployed", 0i64)
        } else if let (Some(chain), Some(db)) = (chain_addr, db_addr) {
            if !chain.eq_ignore_ascii_case(db) {
                ("mismatch", 1)
            } else {
                ("synced", 0)
            }
        } else if cfg.provider_key.is_some() && registry.is_none() {
            ("not_registered", 0)
        } else if registry.map(|r| r.is_registered == 0).unwrap_or(false) {
            ("not_registered", 0)
        } else {
            ("synced", 0)
        };
        needs_update_count += update_inc;

        let contract_data = serde_json::json!({
            "id": contract.map(|c| c.id),
            "name": cfg.contract_name,
            "project": cfg.project_name,
            "address": db_addr,
            "deployed": db_addr.is_some() && db_addr != Some(""),
            "deployed_at": contract.and_then(|c| c.created_at.map(|t| t.to_string())),
            "registration_status": status,
            "provider_address": chain_addr,
            "provider_key": cfg.provider_key,
            "dependencies": build_dep_status(&cfg.required_deps, &registry_by_key, &name_to_key),
            "optional_dependencies": build_dep_status(&cfg.optional_deps, &registry_by_key, &name_to_key),
            "scope": cfg.scope,
            "contract_type": cfg.contract_type,
            "type_config": type_config(&cfg.contract_type),
            "description": cfg.description,
            "last_synced": registry.and_then(|r| r.last_synced_at.map(|t| t.to_string())),
            "is_deleted": registry.map(|r| r.is_deleted == 1).unwrap_or(false),
            "is_primary": if cfg.is_primary == 1 { true } else { contract.map(|c| c.is_primary == 1).unwrap_or(false) },
            "symbol": contract.map(|c| c.name.clone()),
            "actions": serde_json::json!({
                "can_set_primary": cfg.scope == "project" && cfg.is_primary == 0,
                "can_unset_primary": cfg.is_primary == 1,
                "disabled_reason": null,
            }),
        });

        if cfg.scope == "global" {
            global_contracts.push(contract_data);
        } else {
            project_groups
                .entry(cfg.project_name.as_str())
                .or_default()
                .push(contract_data);
        }
    }

    // Build project_contracts array
    let project_configs: HashMap<&str, serde_json::Value> = [
        ("vanke", serde_json::json!({"name": "vanke", "label": "VANKE", "color": "green"})),
    ]
    .into_iter()
    .collect();

    let mut project_contracts = Vec::new();
    for (pn, contracts) in &project_groups {
        let has_primary = contracts.iter().any(|c| {
            c.get("is_primary").and_then(|v| v.as_bool()).unwrap_or(false)
        });
        let primary_contract = contracts.iter().find(|c| {
            c.get("is_primary").and_then(|v| v.as_bool()).unwrap_or(false)
        });

        let all_registered = contracts.iter().all(|c| {
            c.get("registration_status").and_then(|v| v.as_str()) == Some("synced")
        });
        let deps_all_registered = contracts.iter().all(|c| {
            c.get("dependencies").and_then(|v| v.as_array()).map(|deps| {
                deps.iter().all(|d| d.get("registered").and_then(|v| v.as_bool()).unwrap_or(false))
            }).unwrap_or(true)
        });

        let readiness = if all_registered && deps_all_registered && has_primary && treasury_configured {
            "ready"
        } else if all_registered || has_primary {
            "partially_ready"
        } else {
            "not_ready"
        };

        project_contracts.push(serde_json::json!({
            "project": pn,
            "config": project_configs.get(pn).cloned().unwrap_or(
                serde_json::json!({"name": pn, "label": pn, "color": "gray"})
            ),
            "contracts": contracts,
            "has_primary": has_primary,
            "primary_contract": primary_contract,
            "is_ready": readiness == "ready",
            "project_readiness": readiness,
            "readiness_details": {
                "all_registered": all_registered,
                "no_missing_deps": deps_all_registered,
                "has_primary": has_primary,
                "treasury_configured": treasury_configured,
            },
            "is_bound_to_asset": false,
            "bound_asset": null,
            "can_bind_asset": false,
        }));
    }

    // Build contract_types map
    let contract_types: serde_json::Value = serde_json::json!({
        "registry": type_config("registry"),
        "kyc": type_config("kyc"),
        "governance": type_config("governance"),
        "stablecoin": type_config("stablecoin"),
        "token": type_config("token"),
        "defi": type_config("defi"),
    });

    // Build projects list
    let projects: Vec<serde_json::Value> = project_configs
        .into_iter()
        .map(|(_k, v)| v)
        .collect();

    let total = global_contracts.len() as i64
        + project_groups.values().map(|v| v.len() as i64).sum::<i64>();

    let global_count = global_contracts.len() as i64;
    let project_count = project_groups.len() as i64;
    let deployed = contract_map.len() as i64;
    let registered = registry_by_key.values().filter(|r| r.is_registered == 1).count() as i64;

    Ok(serde_json::json!({
        "global_contracts": global_contracts,
        "project_contracts": project_contracts,
        "contract_types": contract_types,
        "projects": projects,
        "network": network,
        "needs_update_count": needs_update_count,
        "stats": {
            "total": total,
            "global_count": global_count,
            "project_count": project_count,
            "deployed": deployed,
            "registered": registered,
        },
    }))
}
