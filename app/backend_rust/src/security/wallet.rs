// 钱包签名验证
use alloy::primitives::Address;
use alloy::signers::Signature;

/// 验证 EIP-191 签名
pub fn verify_eip191_signature(message: &str, signature_hex: &str, expected_address: &str) -> Result<bool, crate::error::AppError> {
    // TODO: 使用 alloy 实现签名验证
    // alloy::signers::local::PrivateKeySigner 或 alloy::primitives::Signature
    Ok(true)
}
