use serde::{Deserialize, Serialize};

// ============================================
// Request types
// ============================================

/// 部署合约请求
#[derive(Debug, Deserialize)]
pub struct DeployContractRequest {
    /// 合约名称 (如 "MockUSDT", "KYCManager")
    pub name: String,
    /// 合约 bytecode (hex 编码, 0x 前缀可选)
    pub bytecode: String,
    /// 合约 ABI (JSON)
    pub abi: Option<serde_json::Value>,
    /// 构造函数参数 (hex 编码, 会追加到 bytecode 后面)
    pub constructor_args: Option<String>,
    /// 合约类型 (stablecoin/kyc/rwa_token/subscription/staking/...)
    pub contract_type: String,
    /// 项目名称 (common/vanke/...)
    pub project_name: String,
    /// 作用域 (common/project), 默认 common
    pub scope: Option<String>,
}

/// 导入已部署合约请求 (用于外部已部署的合约)
#[derive(Debug, Deserialize)]
pub struct ImportContractRequest {
    /// 合约名称
    pub name: String,
    /// 合约地址
    pub address: String,
    /// 合约 ABI (JSON)
    pub abi: Option<serde_json::Value>,
    /// 合约类型
    pub contract_type: String,
    /// 项目名称
    pub project_name: String,
    /// 作用域
    pub scope: Option<String>,
    /// 交易哈希 (可选)
    pub tx_hash: Option<String>,
    /// 部署者地址 (可选)
    pub deployer_address: Option<String>,
}

/// 注册合约到 AddressProvider 请求
#[derive(Debug, Deserialize)]
pub struct RegisterToProviderRequest {
    /// AddressProvider 合约地址
    pub provider_address: String,
    /// Provider Key 名称 (如 "KYC_MANAGER", "USDT")
    pub key_name: String,
    /// 要注册的合约地址
    pub contract_address: String,
}

/// 更新合约状态请求
#[derive(Debug, Deserialize)]
pub struct UpdateContractStatusRequest {
    /// 新状态 (active/paused/deprecated/frozen)
    pub status: String,
}

/// 同步 Provider Registry 请求
#[derive(Debug, Deserialize)]
pub struct SyncRegistryRequest {
    /// AddressProvider 合约地址
    pub provider_address: String,
}

/// 合约配置 Upsert 请求
#[derive(Debug, Deserialize)]
pub struct UpsertContractConfigRequest {
    pub contract_name: String,
    pub project_name: String,
    pub provider_key: Option<String>,
    pub dependencies: Option<serde_json::Value>,
    pub contract_type: Option<String>,
    pub scope: Option<String>,
    pub description: Option<String>,
    pub dependency_type: Option<String>,
    pub is_primary: Option<bool>,
    pub deploy_order: Option<i64>,
    pub required_deps: Option<serde_json::Value>,
    pub optional_deps: Option<serde_json::Value>,
}

// ============================================
// Response types
// ============================================

/// 部署结果
#[derive(Debug, Serialize)]
pub struct DeployResult {
    pub name: String,
    pub address: String,
    pub tx_hash: String,
    pub deployer_address: String,
    pub block_number: Option<i64>,
}

/// 验证结果
#[derive(Debug, Serialize)]
pub struct VerifyResult {
    pub name: String,
    pub address: String,
    /// 链上是否存在合约代码
    pub onchain_exists: bool,
    /// 数据库中是否有记录
    pub db_exists: bool,
    /// 是否已注册到 AddressProvider
    pub provider_registered: Option<bool>,
    /// AddressProvider 地址
    pub provider_address: Option<String>,
}

/// 同步结果
#[derive(Debug, Serialize)]
pub struct SyncResult {
    pub provider_address: String,
    pub synced_count: i64,
    pub details: Vec<serde_json::Value>,
}

// ============================================
// Prepare / Confirm request types
// ============================================

/// 准备注册请求
#[derive(Debug, Deserialize)]
pub struct PrepareRegisterRequest {
    pub contract_name: String,
    pub provider_key: Option<String>,
    pub external_address: Option<String>,
}

/// 确认注册请求
#[derive(Debug, Deserialize)]
pub struct ConfirmRegisterRequest {
    pub contract_name: String,
    pub provider_key: String,
    pub tx_hash: String,
}

/// 准备解除注册请求
#[derive(Debug, Deserialize)]
pub struct PrepareUnregisterRequest {
    pub contract_name: String,
    pub provider_key: Option<String>,
}

/// 确认解除注册请求
#[derive(Debug, Deserialize)]
pub struct ConfirmUnregisterRequest {
    pub contract_name: String,
    pub provider_key: String,
    pub tx_hash: String,
}

/// 准备设置 Treasury 请求
#[derive(Debug, Deserialize)]
pub struct PrepareSetTreasuryRequest {
    pub treasury_contract_name: String,
}

/// 确认设置 Treasury 请求
#[derive(Debug, Deserialize)]
pub struct ConfirmSetTreasuryRequest {
    pub treasury_contract_name: String,
    pub tx_hash: String,
}

/// 更新合约地址请求 (PATCH /address)
#[derive(Debug, Deserialize)]
pub struct ContractAddressUpdateRequest {
    pub contract_name: String,
    pub address: String,
}

/// 更新地址请求 (POST /update-address, 前端依赖设置模式)
#[derive(Debug, Deserialize)]
pub struct UpdateContractAddressRequest {
    pub target_contract: String,
    pub set_function: String,
    pub new_address: String,
}

/// 确认绑定请求
#[derive(Debug, Deserialize)]
pub struct ConfirmBindingRequest {
    pub contract_name: String,
    pub dependency_name: String,
    pub tx_hash: String,
    pub new_address: String,
}

/// 验证合约请求
#[derive(Debug, Deserialize)]
pub struct ValidateContractRequest {
    pub addresses: Vec<String>,
    pub check_rwa_binding: Option<bool>,
    pub rwa_token_name: Option<String>,
}
