use axum::{
    extract::{Path, Query, State},
    Json, Router,
};
use serde::Deserialize;

use crate::contracts::provider;
use crate::error::AppError;
use crate::repositories::contract_repo;
use crate::schemas::common::{ApiResponse, DataWrapper, Pagination};
use crate::schemas::contract::*;
use crate::services::contract_service;
use crate::state::SharedState;

#[derive(Debug, Deserialize)]
pub struct ContractListQuery {
    #[serde(default = "default_page")]
    page: i64,
    #[serde(default = "default_page_size")]
    page_size: i64,
    network: Option<String>,
    project_name: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ConfigListQuery {
    project_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RegistryListQuery {
    provider_address: Option<String>,
}

fn default_page() -> i64 {
    1
}
fn default_page_size() -> i64 {
    20
}

pub fn routes() -> Router<SharedState> {
    Router::new()
        // 部署 & 导入
        .route("/api/v1/admin/contracts/deploy", axum::routing::post(deploy_contract))
        .route("/api/v1/admin/contracts/import", axum::routing::post(import_contract))
        // 查询
        .route("/api/v1/admin/contracts", axum::routing::get(list_contracts))
        .route("/api/v1/admin/contracts/dependency-graph", axum::routing::get(get_dependency_graph))
        .route("/api/v1/admin/contracts/registry/projects", axum::routing::get(list_registry_projects))
        .route("/api/v1/admin/contracts/validate", axum::routing::post(validate_contracts))
        .route("/api/v1/admin/contracts/treasury", axum::routing::get(get_treasury_binding))
        .route("/api/v1/admin/contracts/treasury/prepare", axum::routing::post(prepare_set_treasury))
        .route("/api/v1/admin/contracts/treasury/confirm", axum::routing::post(confirm_set_treasury))
        .route("/api/v1/admin/contracts/register/prepare", axum::routing::post(prepare_register))
        .route("/api/v1/admin/contracts/register/confirm", axum::routing::post(confirm_register))
        .route("/api/v1/admin/contracts/unregister/prepare", axum::routing::post(prepare_unregister))
        .route("/api/v1/admin/contracts/unregister/confirm", axum::routing::post(confirm_unregister))
        .route("/api/v1/admin/contracts/address", axum::routing::patch(update_contract_address))
        .route("/api/v1/admin/contracts/update-address", axum::routing::post(update_address))
        .route("/api/v1/admin/contracts/confirm-binding", axum::routing::post(confirm_binding))
        .route("/api/v1/admin/contracts/reset/all", axum::routing::delete(reset_all_deployments))
        .route("/api/v1/admin/contracts/{name}", axum::routing::get(get_contract))
        // 修改 & 删除 (与 {name} 同路径，不同 HTTP 方法，axum 允许)
        .route("/api/v1/admin/contracts/{name}/status", axum::routing::patch(update_status))
        .route("/api/v1/admin/contracts/{name}/dependencies", axum::routing::get(get_contract_dependencies))
        .route("/api/v1/admin/contracts/{name}/verify", axum::routing::get(verify_contract))
        .route("/api/v1/admin/contracts/{name}", axum::routing::delete(delete_contract))
        // Provider 注册
        .route("/api/v1/admin/contracts/register", axum::routing::post(register_to_provider))
        .route("/api/v1/admin/contracts/registry", axum::routing::get(list_registry))
        .route("/api/v1/admin/contracts/registry/sync", axum::routing::post(sync_registry))
        .route("/api/v1/admin/contracts/provider/sync", axum::routing::post(sync_from_provider))
        // 合约配置
        .route("/api/v1/admin/contracts/config", axum::routing::get(list_configs))
        .route("/api/v1/admin/contracts/config", axum::routing::put(upsert_config))
        // Primary
        .route("/api/v1/admin/contracts/{id}/set-primary", axum::routing::patch(set_primary))
        .route("/api/v1/admin/contracts/{id}/unset-primary", axum::routing::patch(unset_primary))
        // Reset by project (dynamic route)
        .route("/api/v1/admin/contracts/reset/{project}", axum::routing::delete(reset_project_deployments))
}

// ============================================
// 部署 & 导入
// ============================================

async fn deploy_contract(
    State(state): State<SharedState>,
    Json(req): Json<DeployContractRequest>,
) -> Result<Json<ApiResponse<DataWrapper<DeployResult>>>, AppError> {
    let result = contract_service::deploy_contract(&state.db, &state.config, &req).await?;
    let data = DataWrapper::object(result);
    Ok(Json(ApiResponse::ok(data)))
}

async fn import_contract(
    State(state): State<SharedState>,
    Json(req): Json<ImportContractRequest>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    contract_service::import_contract(&state.db, &state.config, &req).await?;
    let data = DataWrapper::msg("Contract imported");
    Ok(Json(ApiResponse::ok(data)))
}

// ============================================
// 查询
// ============================================

async fn list_contracts(
    State(state): State<SharedState>,
    Query(params): Query<ContractListQuery>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let (items, total) = contract_repo::list_deployments(
        &state.db,
        params.network.as_deref(),
        params.project_name.as_deref(),
        params.status.as_deref(),
        params.page,
        params.page_size,
    )
    .await?;

    let items: Vec<serde_json::Value> = items
        .into_iter()
        .map(|c| {
            serde_json::json!({
                "id": c.id,
                "name": c.name,
                "address": c.address,
                "deployer_address": c.deployer_address,
                "network": c.network,
                "chain_id": c.chain_id,
                "scope": c.scope,
                "contract_type": c.contract_type,
                "project_name": c.project_name,
                "tx_hash": c.tx_hash,
                "status": c.status,
                "abi_path": c.abi_path,
                "has_abi": c.abi.is_some(),
                "created_at": c.created_at,
                "updated_at": c.updated_at,
            })
        })
        .collect();

    let pagination = Pagination::new(total, params.page, params.page_size);
    let data = DataWrapper::list(items, pagination);
    Ok(Json(ApiResponse::ok(data)))
}

async fn get_contract(
    State(state): State<SharedState>,
    Path(name): Path<String>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let contract = contract_repo::get_deployment_by_name(&state.db, &name)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("contract {} not found", name)))?;

    let abi_json = contract
        .abi
        .as_ref()
        .and_then(|s| serde_json::from_str::<serde_json::Value>(s).ok());

    let data = DataWrapper::object(serde_json::json!({
        "id": contract.id,
        "name": contract.name,
        "address": contract.address,
        "deployer_address": contract.deployer_address,
        "network": contract.network,
        "chain_id": contract.chain_id,
        "scope": contract.scope,
        "contract_type": contract.contract_type,
        "project_name": contract.project_name,
        "tx_hash": contract.tx_hash,
        "status": contract.status,
        "abi_path": contract.abi_path,
        "abi": abi_json,
        "created_at": contract.created_at,
        "updated_at": contract.updated_at,
    }));
    Ok(Json(ApiResponse::ok(data)))
}

// ============================================
// 修改 & 删除
// ============================================

async fn update_status(
    State(state): State<SharedState>,
    Path(name): Path<String>,
    Json(req): Json<UpdateContractStatusRequest>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    // {name} 可能是数字 id 或合约名称，统一处理
    let id: i64 = name.parse().map_err(|_| AppError::BadRequest("invalid id".to_string()))?;
    contract_repo::update_deployment_status(&state.db, id, &req.status).await?;
    let data = DataWrapper::msg("Status updated");
    Ok(Json(ApiResponse::ok(data)))
}

async fn delete_contract(
    State(state): State<SharedState>,
    Path(name): Path<String>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let id: i64 = name.parse().map_err(|_| AppError::BadRequest("invalid id".to_string()))?;
    contract_repo::delete_deployment(&state.db, id).await?;
    let data = DataWrapper::msg("Contract deleted");
    Ok(Json(ApiResponse::ok(data)))
}

// ============================================
// Provider 注册
// ============================================

async fn register_to_provider(
    State(state): State<SharedState>,
    Json(req): Json<RegisterToProviderRequest>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    contract_service::register_to_provider(&state.db, &state.config, &req).await?;

    let data = DataWrapper::object(serde_json::json!({
        "key_name": req.key_name,
        "contract_address": req.contract_address,
        "provider_address": req.provider_address,
        "registered": true,
    }));
    Ok(Json(ApiResponse::ok(data)))
}

async fn list_registry(
    State(state): State<SharedState>,
    Query(params): Query<RegistryListQuery>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let items = contract_repo::list_registry(
        &state.db,
        params.provider_address.as_deref(),
    )
    .await?;

    let items: Vec<serde_json::Value> = items
        .into_iter()
        .map(|r| {
            serde_json::json!({
                "id": r.id,
                "provider_address": r.provider_address,
                "chain_id": r.chain_id,
                "network": r.network,
                "key": r.key,
                "key_hash": r.key_hash,
                "is_registered": r.is_registered,
                "registered_address": r.registered_address,
                "is_deleted": r.is_deleted,
                "created_at": r.created_at,
                "updated_at": r.updated_at,
            })
        })
        .collect();

    let total = items.len() as i64;
    let data = DataWrapper::list(items, Pagination::new(total, 1, 100));
    Ok(Json(ApiResponse::ok(data)))
}

async fn sync_registry(
    State(state): State<SharedState>,
    Json(req): Json<SyncRegistryRequest>,
) -> Result<Json<ApiResponse<DataWrapper<SyncResult>>>, AppError> {
    let result = contract_service::sync_registry(&state.db, &state.config, &req.provider_address)
        .await?;
    let data = DataWrapper::object(result);
    Ok(Json(ApiResponse::ok(data)))
}

// ============================================
// 合约配置
// ============================================

async fn list_configs(
    State(state): State<SharedState>,
    Query(params): Query<ConfigListQuery>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let items = contract_repo::list_configs(&state.db, params.project_name.as_deref()).await?;

    let items: Vec<serde_json::Value> = items
        .into_iter()
        .map(|c| {
            serde_json::json!({
                "id": c.id,
                "contract_name": c.contract_name,
                "project_name": c.project_name,
                "provider_key": c.provider_key,
                "provider_key_hash": c.provider_key_hash,
                "dependencies": c.dependencies,
                "contract_type": c.contract_type,
                "scope": c.scope,
                "description": c.description,
                "dependency_type": c.dependency_type,
                "is_primary": c.is_primary,
                "deploy_order": c.deploy_order,
                "required_deps": c.required_deps,
                "optional_deps": c.optional_deps,
                "created_at": c.created_at,
                "updated_at": c.updated_at,
            })
        })
        .collect();

    let total = items.len() as i64;
    let data = DataWrapper::list(items, Pagination::new(total, 1, 100));
    Ok(Json(ApiResponse::ok(data)))
}

async fn upsert_config(
    State(state): State<SharedState>,
    Json(req): Json<UpsertContractConfigRequest>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let dependencies = req
        .dependencies
        .as_ref()
        .map(|v| serde_json::to_string(v).unwrap_or_default());
    let required_deps = req
        .required_deps
        .as_ref()
        .map(|v| serde_json::to_string(v).unwrap_or_default());
    let optional_deps = req
        .optional_deps
        .as_ref()
        .map(|v| serde_json::to_string(v).unwrap_or_default());

    let key_hash = req.provider_key.as_ref().map(|k| {
        let hash = provider::compute_key_hash(k);
        hash.to_string()
    });

    contract_repo::upsert_config(
        &state.db,
        &req.contract_name,
        &req.project_name,
        req.provider_key.as_deref(),
        key_hash.as_deref(),
        dependencies.as_deref(),
        req.contract_type.as_deref().unwrap_or("unknown"),
        req.scope.as_deref().unwrap_or("project"),
        req.description.as_deref(),
        req.dependency_type.as_deref().unwrap_or("business"),
        req.is_primary.unwrap_or(false),
        req.deploy_order.unwrap_or(100),
        required_deps.as_deref(),
        optional_deps.as_deref(),
    )
    .await?;

    let data = DataWrapper::msg("Config saved");
    Ok(Json(ApiResponse::ok(data)))
}

// ============================================
// 验证
// ============================================

async fn verify_contract(
    State(state): State<SharedState>,
    Path(name): Path<String>,
) -> Result<Json<ApiResponse<DataWrapper<VerifyResult>>>, AppError> {
    let result = contract_service::verify_contract(&state.db, &state.config, &name).await?;
    let data = DataWrapper::object(result);
    Ok(Json(ApiResponse::ok(data)))
}

// ============================================
// Prepare / Confirm (frontend wallet signing mode)
// ============================================

async fn prepare_register(
    State(state): State<SharedState>,
    Json(req): Json<PrepareRegisterRequest>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let result = contract_service::prepare_register(&state.db, &state.config, &req).await?;
    Ok(Json(ApiResponse::ok(DataWrapper::object(result))))
}

async fn confirm_register(
    State(state): State<SharedState>,
    Json(req): Json<ConfirmRegisterRequest>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let result = contract_service::confirm_register(&state.db, &state.config, &req).await?;
    Ok(Json(ApiResponse::ok(DataWrapper::object(result))))
}

async fn prepare_unregister(
    State(state): State<SharedState>,
    Json(req): Json<PrepareUnregisterRequest>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let result = contract_service::prepare_unregister(&state.db, &state.config, &req).await?;
    Ok(Json(ApiResponse::ok(DataWrapper::object(result))))
}

async fn confirm_unregister(
    State(state): State<SharedState>,
    Json(req): Json<ConfirmUnregisterRequest>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let result = contract_service::confirm_unregister(&state.db, &state.config, &req).await?;
    Ok(Json(ApiResponse::ok(DataWrapper::object(result))))
}

async fn prepare_set_treasury(
    State(state): State<SharedState>,
    Json(req): Json<PrepareSetTreasuryRequest>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let result = contract_service::prepare_set_treasury(&state.db, &state.config, &req).await?;
    Ok(Json(ApiResponse::ok(DataWrapper::object(result))))
}

async fn confirm_set_treasury(
    State(state): State<SharedState>,
    Json(req): Json<ConfirmSetTreasuryRequest>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let result = contract_service::confirm_set_treasury(&state.db, &state.config, &req).await?;
    Ok(Json(ApiResponse::ok(DataWrapper::object(result))))
}

async fn get_treasury_binding(
    State(state): State<SharedState>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let result = contract_service::get_treasury_binding(&state.db, &state.config).await?;
    Ok(Json(ApiResponse::ok(DataWrapper::object(result))))
}

// ============================================
// Dependency graph
// ============================================

async fn get_dependency_graph(
    State(state): State<SharedState>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let result = contract_service::get_dependency_graph(&state.db).await?;
    Ok(Json(ApiResponse::ok(DataWrapper::object(result))))
}

async fn get_contract_dependencies(
    State(state): State<SharedState>,
    Path(name): Path<String>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let result = contract_service::get_contract_dependencies(&state.db, &name).await?;
    Ok(Json(ApiResponse::ok(DataWrapper::object(result))))
}

// ============================================
// Primary contract management
// ============================================

async fn set_primary(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let result = contract_service::set_primary(&state.db, id).await?;
    Ok(Json(ApiResponse::ok(DataWrapper::object(result))))
}

async fn unset_primary(
    State(state): State<SharedState>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let result = contract_service::unset_primary(&state.db, id).await?;
    Ok(Json(ApiResponse::ok(DataWrapper::object(result))))
}

// ============================================
// Address update & binding confirm
// ============================================

async fn update_contract_address(
    State(state): State<SharedState>,
    Json(req): Json<ContractAddressUpdateRequest>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let result = contract_service::update_registry_record(&state.db, &req.contract_name, &req.address).await?;
    Ok(Json(ApiResponse::ok(DataWrapper::object(result))))
}

async fn update_address(
    State(state): State<SharedState>,
    Json(req): Json<UpdateContractAddressRequest>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    // Look up target contract deployment
    let contract = contract_repo::get_deployment_by_name(&state.db, &req.target_contract)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("contract {} not found", req.target_contract)))?;

    // Return the ABI + function info for frontend to construct the transaction
    let abi = serde_json::json!([{
        "name": req.set_function,
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [{"name": "_addr", "type": "address"}],
        "outputs": []
    }]);

    let result = serde_json::json!({
        "target_contract": req.target_contract,
        "target_address": contract.address,
        "function_name": req.set_function,
        "function_args": [req.new_address],
        "abi": abi,
    });
    Ok(Json(ApiResponse::ok(DataWrapper::object(result))))
}

async fn confirm_binding(
    State(state): State<SharedState>,
    Json(req): Json<ConfirmBindingRequest>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    tracing::info!(
        contract = %req.contract_name,
        dependency = %req.dependency_name,
        tx_hash = %req.tx_hash,
        "Binding confirmed"
    );
    let data = DataWrapper::msg("Binding confirmed");
    Ok(Json(ApiResponse::ok(data)))
}

// ============================================
// Validation
// ============================================

async fn validate_contracts(
    State(state): State<SharedState>,
    Json(req): Json<ValidateContractRequest>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let result = contract_service::validate_contracts(&state.db, &state.config, &req).await?;
    Ok(Json(ApiResponse::ok(DataWrapper::object(result))))
}

// ============================================
// Sync from provider
// ============================================

async fn sync_from_provider(
    State(state): State<SharedState>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let result = contract_service::sync_from_provider(&state.db, &state.config).await?;
    Ok(Json(ApiResponse::ok(DataWrapper::object(result))))
}

// ============================================
// Registry projects
// ============================================

async fn list_registry_projects(
    State(state): State<SharedState>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let configs = contract_repo::list_configs(&state.db, None).await?;
    let mut projects: Vec<String> = configs.iter()
        .map(|c| c.project_name.clone())
        .collect();
    projects.sort();
    projects.dedup();
    let total = projects.len() as i64;
    let data = DataWrapper::list(
        projects.into_iter().map(serde_json::Value::String).collect(),
        Pagination::new(total, 1, 100),
    );
    Ok(Json(ApiResponse::ok(data)))
}

// ============================================
// Reset deployments
// ============================================

async fn reset_project_deployments(
    State(state): State<SharedState>,
    Path(project): Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let confirm = req.get("confirm").and_then(|v| v.as_str()).unwrap_or("");
    if confirm != "RESET" {
        return Err(AppError::BadRequest("confirm must be 'RESET'".to_string()));
    }
    let deleted = contract_repo::delete_deployments_by_project(&state.db, &project).await?;
    let data = DataWrapper::object(serde_json::json!({
        "deleted_count": deleted,
        "project": project,
        "network": state.config.chain.network,
    }));
    Ok(Json(ApiResponse::ok(data)))
}

async fn reset_all_deployments(
    State(state): State<SharedState>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<DataWrapper<serde_json::Value>>>, AppError> {
    let confirm = req.get("confirm").and_then(|v| v.as_str()).unwrap_or("");
    if confirm != "RESET" {
        return Err(AppError::BadRequest("confirm must be 'RESET'".to_string()));
    }
    let deleted = contract_repo::delete_all_deployments(&state.db).await?;
    let data = DataWrapper::object(serde_json::json!({
        "deleted_count": deleted,
        "network": state.config.chain.network,
    }));
    Ok(Json(ApiResponse::ok(data)))
}
