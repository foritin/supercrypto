use std::str::FromStr;

use alloy::{
    network::{EthereumWallet, TransactionBuilder},
    primitives::{keccak256, Address, Bytes, B256},
    providers::{Provider, ProviderBuilder},
    rpc::types::eth::TransactionRequest,
    signers::local::PrivateKeySigner,
};
use alloy::sol_types::SolCall;

use crate::error::AppError;

// AddressProvider 合约接口 (与 contracts/common/AddressProvider.vy 对应)
alloy::sol! {
    #[allow(missing_docs)]
    interface IAddressProvider {
        function admin_set_address(bytes32 _id, address _addr) external;
        function get_address(bytes32 _id) external view returns (address);
        function get_all_addresses() external view returns (bytes32[] _types, address[] _addrs);
    }
}

pub const ZERO_ADDRESS: &str = "0x0000000000000000000000000000000000000000";

/// 部署回执
pub struct DeployReceipt {
    pub address: String,
    pub tx_hash: String,
    pub block_number: Option<i64>,
}

/// 计算 Provider Key 的 keccak256 哈希
pub fn compute_key_hash(key_name: &str) -> B256 {
    keccak256(key_name.as_bytes())
}

/// 解析 hex 字符串为 Bytes (0x 前缀可选)
pub fn parse_hex_bytes(hex_str: &str) -> Result<Bytes, AppError> {
    let s = if hex_str.starts_with("0x") {
        hex_str.to_string()
    } else {
        format!("0x{}", hex_str)
    };
    s.parse::<Bytes>()
        .map_err(|e| AppError::BadRequest(format!("invalid hex: {}", e)))
}

/// 合并 bytecode 和构造函数参数
pub fn combine_bytecode_and_args(bytecode: Bytes, args: Option<Bytes>) -> Bytes {
    match args {
        Some(args) if !args.is_empty() => {
            let mut combined = bytecode.to_vec();
            combined.extend_from_slice(&args);
            Bytes::from(combined)
        }
        _ => bytecode,
    }
}

/// 从私钥获取地址
pub fn get_address_from_private_key(private_key: &str) -> Result<String, AppError> {
    let signer = PrivateKeySigner::from_str(private_key)
        .map_err(|e| AppError::BadRequest(format!("invalid private key: {}", e)))?;
    Ok(signer.address().to_string())
}

/// 检查链上合约代码是否存在
pub async fn check_contract_code(rpc_url: &str, address: &str) -> Result<bool, AppError> {
    let url = rpc_url
        .parse()
        .map_err(|e| AppError::BadRequest(format!("invalid rpc url: {}", e)))?;
    let provider = ProviderBuilder::new().connect_http(url);

    let addr = address
        .parse::<Address>()
        .map_err(|e| AppError::BadRequest(format!("invalid address: {}", e)))?;
    let code = provider
        .get_code_at(addr)
        .await
        .map_err(|e| AppError::Web3(format!("get_code failed: {}", e)))?;
    Ok(!code.is_empty())
}

/// 部署合约 (发送 bytecode 到链上)
pub async fn deploy_bytecode(
    rpc_url: &str,
    private_key: &str,
    bytecode: Bytes,
) -> Result<DeployReceipt, AppError> {
    let signer = PrivateKeySigner::from_str(private_key)
        .map_err(|e| AppError::BadRequest(format!("invalid private key: {}", e)))?;
    let wallet = EthereumWallet::from(signer);
    let url = rpc_url
        .parse()
        .map_err(|e| AppError::BadRequest(format!("invalid rpc url: {}", e)))?;
    let provider = ProviderBuilder::new().wallet(wallet).connect_http(url);

    // 合约部署: 不设置 to, input 为 bytecode
    let tx = TransactionRequest::default().with_input(bytecode);

    let builder = provider
        .send_transaction(tx)
        .await
        .map_err(|e| AppError::Web3(format!("deploy tx failed: {}", e)))?;
    let receipt = builder
        .get_receipt()
        .await
        .map_err(|e| AppError::Web3(format!("deploy receipt failed: {}", e)))?;

    if !receipt.status() {
        return Err(AppError::Web3("deploy transaction reverted".into()));
    }

    let address = receipt
        .contract_address
        .ok_or_else(|| AppError::Web3("no contract address in receipt".into()))?;

    Ok(DeployReceipt {
        address: address.to_string(),
        tx_hash: receipt.transaction_hash.to_string(),
        block_number: receipt.block_number.map(|n| n as i64),
    })
}

/// 注册合约地址到 AddressProvider (链上交易)
pub async fn register_to_provider_onchain(
    rpc_url: &str,
    private_key: &str,
    provider_address: &str,
    key_name: &str,
    contract_address: &str,
) -> Result<(), AppError> {
    let signer = PrivateKeySigner::from_str(private_key)
        .map_err(|e| AppError::BadRequest(format!("invalid private key: {}", e)))?;
    let wallet = EthereumWallet::from(signer);
    let url = rpc_url
        .parse()
        .map_err(|e| AppError::BadRequest(format!("invalid rpc url: {}", e)))?;
    let provider = ProviderBuilder::new().wallet(wallet).connect_http(url);

    let key_hash = compute_key_hash(key_name);
    let provider_addr = provider_address
        .parse::<Address>()
        .map_err(|e| AppError::BadRequest(format!("invalid provider address: {}", e)))?;
    let contract_addr = contract_address
        .parse::<Address>()
        .map_err(|e| AppError::BadRequest(format!("invalid contract address: {}", e)))?;

    let call = IAddressProvider::admin_set_addressCall {
        _id: key_hash,
        _addr: contract_addr,
    };
    let calldata = call.abi_encode();

    let tx = TransactionRequest::default()
        .to(provider_addr)
        .with_input(Bytes::from(calldata));

    let builder = provider
        .send_transaction(tx)
        .await
        .map_err(|e| AppError::Web3(format!("register tx failed: {}", e)))?;
    let receipt = builder
        .get_receipt()
        .await
        .map_err(|e| AppError::Web3(format!("register receipt failed: {}", e)))?;

    if !receipt.status() {
        return Err(AppError::Web3("register transaction reverted".into()));
    }

    Ok(())
}

/// 从 AddressProvider 读取已注册的合约地址 (eth_call)
pub async fn get_registered_address(
    rpc_url: &str,
    provider_address: &str,
    key_name: &str,
) -> Result<String, AppError> {
    let url = rpc_url
        .parse()
        .map_err(|e| AppError::BadRequest(format!("invalid rpc url: {}", e)))?;
    let provider = ProviderBuilder::new().connect_http(url);

    let key_hash = compute_key_hash(key_name);
    let provider_addr = provider_address
        .parse::<Address>()
        .map_err(|e| AppError::BadRequest(format!("invalid provider address: {}", e)))?;

    let call = IAddressProvider::get_addressCall { _id: key_hash };
    let calldata = call.abi_encode();

    let tx = TransactionRequest::default()
        .to(provider_addr)
        .with_input(Bytes::from(calldata));

    let result = provider
        .call(tx)
        .await
        .map_err(|e| AppError::Web3(format!("call failed: {}", e)))?;

    let decoded = IAddressProvider::get_addressCall::abi_decode_returns(&result)
        .map_err(|e| AppError::Web3(format!("decode failed: {}", e)))?;

    Ok(decoded.to_string())
}

/// 从 AddressProvider 读取所有已注册的合约地址
pub async fn get_all_registered_addresses(
    rpc_url: &str,
    provider_address: &str,
) -> Result<Vec<(B256, Address)>, AppError> {
    let url = rpc_url
        .parse()
        .map_err(|e| AppError::BadRequest(format!("invalid rpc url: {}", e)))?;
    let provider = ProviderBuilder::new().connect_http(url);

    let provider_addr = provider_address
        .parse::<Address>()
        .map_err(|e| AppError::BadRequest(format!("invalid provider address: {}", e)))?;

    let call = IAddressProvider::get_all_addressesCall {};
    let calldata = call.abi_encode();

    let tx = TransactionRequest::default()
        .to(provider_addr)
        .with_input(Bytes::from(calldata));

    let result = provider
        .call(tx)
        .await
        .map_err(|e| AppError::Web3(format!("call failed: {}", e)))?;

    let decoded = IAddressProvider::get_all_addressesCall::abi_decode_returns(&result)
        .map_err(|e| AppError::Web3(format!("decode failed: {}", e)))?;

    let pairs = decoded
        ._types
        .into_iter()
        .zip(decoded._addrs.into_iter())
        .collect();

    Ok(pairs)
}
