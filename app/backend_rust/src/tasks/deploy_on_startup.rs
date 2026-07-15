//! 启动时合约部署 / 导入模块
//!
//! 启动流程:
//!   1. 读取 config/deploy_manifest.toml 获取所需合约清单
//!   2. 对每个合约，先查 DB (contract_deployment) 是否已有记录（按 name + network）
//!   3. DB 中不存在的，尝试从 Python 部署输出 JSON 文件中查找已知地址并导入
//!   4. 同步 contract_config 表
//!   5. 汇报已导入 / 缺失的合约

use std::collections::HashMap;
use std::path::PathBuf;

use serde::Deserialize;
use sqlx::SqlitePool;
use tracing::{info, warn};

use crate::config::AppConfig;
use crate::error::AppError;
use crate::repositories::contract_repo;

// ============================================
// Deploy manifest types
// ============================================

#[derive(Debug, Deserialize)]
struct DeployManifest {
    contracts: Vec<ManifestContract>,
}

#[derive(Debug, Deserialize)]
struct ManifestContract {
    name: String,
    contract_type: String,
    scope: String,
    project_name: String,
    provider_key: Option<String>,
    is_primary: bool,
    deploy_order: i64,
    dependencies: Option<String>,
    description: Option<String>,
}

// ============================================
// Python deploy output types
// ============================================

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct DeployOutput {
    #[serde(default)]
    step: String,
    #[serde(default)]
    network: String,
    #[serde(default)]
    deployer: String,
    contracts: HashMap<String, String>,
}

// ============================================
// Startup deploy logic
// ============================================

/// 启动时执行合约部署/导入
pub async fn deploy_on_startup(db: &SqlitePool, config: &AppConfig) -> Result<(), AppError> {
    info!("🔧 [Startup Deploy] Reading deploy manifest...");

    // 1. 读取 deploy manifest
    let manifest_path = PathBuf::from("config/deploy_manifest.toml");
    let manifest: DeployManifest = if manifest_path.exists() {
        let content = std::fs::read_to_string(&manifest_path).map_err(|e| {
            AppError::BadRequest(format!("Failed to read deploy manifest: {}", e))
        })?;
        toml::from_str(&content).map_err(|e| {
            AppError::BadRequest(format!("Failed to parse deploy manifest: {}", e))
        })?
    } else {
        warn!("⚠️  [Startup Deploy] deploy_manifest.toml not found, skipping auto-deploy");
        return Ok(());
    };

    let network = &config.chain.network;
    info!(
        "📋 [Startup Deploy] {} contracts in manifest, network={}",
        manifest.contracts.len(),
        network
    );

    // 2. 读取 Python 部署输出 JSON 文件 (作为 Hardhat 已知地址来源)
    let output_dir = PathBuf::from("../backend/output");
    let deploy_outputs = load_deploy_outputs(&output_dir);

    // 3. 统计
    let mut imported = 0u32;
    let mut already_exists = 0u32;
    let mut missing = 0u32;
    let mut config_synced = 0u32;
    let mut abi_stored = 0u32;

    // 获取部署者地址
    let deployer_address = crate::contracts::provider::get_address_from_private_key(
        if config.deployer.private_key.is_empty() {
            &config.faucet.private_key
        } else {
            &config.deployer.private_key
        },
    )
    .unwrap_or_else(|_| "0x0000000000000000000000000000000000000000".to_string());

    let chain_id = config.chain.chain_id as i64;

    for mc in &manifest.contracts {
        // 3a. 同步 contract_config（所有合约都同步，确保 UI 可见）
        let deps_str = mc.dependencies.clone();
        contract_repo::upsert_config(
            db,
            &mc.name,
            &mc.project_name,
            mc.provider_key.as_deref(),
            None,
            deps_str.as_deref(),
            &mc.contract_type,
            &mc.scope,
            mc.description.as_deref(),
            if mc.is_primary { "primary" } else { "business" },
            mc.is_primary,
            mc.deploy_order,
            deps_str.as_deref(),
            Some("[]"),
        )
        .await?;
        config_synced += 1;

        // 3b. 检查 DB 是否已有部署记录
        let existing = contract_repo::get_deployment_by_name(db, &mc.name).await?;

        // 3b2. ABI 去重更新：仅在缺失或内容变化时才写入
        if let Some(abi_json) = load_abi_json(&mc.name) {
            let need_update = match existing.as_ref().and_then(|c| c.abi.as_deref()) {
                None => true, // DB 中没有 ABI → 需要写入
                Some(existing_abi) => existing_abi != abi_json, // 内容不同 → 需要更新
            };
            if need_update {
                contract_repo::update_deployment_abi(db, &mc.name, network, &abi_json).await?;
                abi_stored += 1;
                if existing.as_ref().and_then(|c| c.abi.as_deref()).is_some() {
                    info!("   🔄 ABI updated: {} (content changed)", mc.name);
                }
            }
        }

        if existing.is_some() {
            already_exists += 1;
            continue;
        }

        // 3c. 尝试从 Python 部署输出中查找已知地址
        let addr = deploy_outputs.get(&mc.name);

        match addr {
            Some(address) => {
                info!(
                    "   📥 Importing {} -> {} (from deploy output)",
                    mc.name, address
                );

                contract_repo::insert_deployment(
                    db,
                    &mc.name,
                    address,
                    &deployer_address,
                    network,
                    chain_id,
                    &mc.scope,
                    &mc.contract_type,
                    &mc.project_name,
                    "0x0000000000000000000000000000000000000000000000000000000000000000",
                    None,
                    None,
                )
                .await?;

                imported += 1;
            }
            None => {
                warn!(
                    "   ⚠️  MISSING: {} — no known address. Deploy via /admin/contracts/deploy",
                    mc.name
                );
                missing += 1;
            }
        }
    }

    // 4. 输出汇总
    info!(
        "✅ [Startup Deploy] Done: {} configs synced, {} imported, {} already existed, {} missing, {} ABIs stored (need manual deploy)",
        config_synced, imported, already_exists, missing, abi_stored
    );

    Ok(())
}

/// 从 contracts/abi/{name}.json 读取预编译的 ABI JSON
fn load_abi_json(contract_name: &str) -> Option<String> {
    let abi_path = PathBuf::from("contracts/abi").join(format!("{}.json", contract_name));
    match std::fs::read_to_string(&abi_path) {
        Ok(content) => {
            // 验证是合法 JSON
            if serde_json::from_str::<serde_json::Value>(&content).is_ok() {
                Some(content)
            } else {
                warn!("   ⚠️  ABI file is not valid JSON: {}", abi_path.display());
                None
            }
        }
        Err(_) => {
            // 文件不存在是正常的（新合约可能还没编译 ABI）
            None
        }
    }
}

/// 从 Python 后端 output/ 目录加载所有 deployed_*.json 文件
fn load_deploy_outputs(output_dir: &PathBuf) -> HashMap<String, String> {
    let mut map = HashMap::new();

    if !output_dir.exists() {
        warn!(
            "   ⚠️  Deploy output dir not found: {}",
            output_dir.display()
        );
        return map;
    }

    let entries = match std::fs::read_dir(output_dir) {
        Ok(e) => e,
        Err(_) => return map,
    };

    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();
        let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
        if !file_name.starts_with("deployed_") || !file_name.ends_with(".json") {
            continue;
        }

        match std::fs::read_to_string(&path) {
            Ok(content) => match serde_json::from_str::<DeployOutput>(&content) {
                Ok(output) => {
                    for (name, addr) in output.contracts {
                        map.entry(name).or_insert(addr);
                    }
                }
                Err(e) => {
                    warn!("   ⚠️  Failed to parse {}: {}", file_name, e);
                }
            },
            Err(e) => {
                warn!("   ⚠️  Failed to read {}: {}", file_name, e);
            }
        }
    }

    info!(
        "   📂 Loaded {} known addresses from deploy outputs",
        map.len()
    );
    map
}
