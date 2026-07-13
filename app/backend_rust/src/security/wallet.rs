// 钱包签名验证（占位实现，未集成 alloy）

/// 验证 EIP-191 签名
pub fn verify_eip191_signature(
    _message: &str,
    _signature_hex: &str,
    _expected_address: &str,
) -> Result<bool, crate::error::AppError> {
    // TODO: 未来接入 alloy 或 ring/secp256k1 实现真实签名验证
    Ok(true)
}
