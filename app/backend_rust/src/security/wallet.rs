use alloy::primitives::{hex, Address, Signature};

use crate::error::AppError;

/// 验证 EIP-191 签名（MetaMask 等钱包标准）
pub fn verify_eip191_signature(
    message: &str,
    signature_hex: &str,
    expected_address: &str,
) -> Result<bool, AppError> {
    let sig_hex = signature_hex.trim().trim_start_matches("0x");
    let sig_bytes = hex::decode(sig_hex)
        .map_err(|e| AppError::BadRequest(format!("invalid signature hex: {}", e)))?;
    let signature = Signature::try_from(sig_bytes.as_slice())
        .map_err(|e| AppError::BadRequest(format!("invalid signature: {}", e)))?;

    let recovered = signature
        .recover_address_from_msg(message.as_bytes())
        .map_err(|e| AppError::BadRequest(format!("signature recover failed: {}", e)))?;

    let expected = expected_address
        .parse::<Address>()
        .map_err(|e| AppError::BadRequest(format!("invalid expected address: {}", e)))?;

    Ok(recovered.to_checksum(None).to_lowercase() == expected.to_checksum(None).to_lowercase())
}

/// 生成钱包登录消息（供前端签名）
pub fn build_login_message(address: &str) -> String {
    format!(
        "Welcome to SuperCrypto!\n\nPlease sign this message to authenticate.\n\nAddress: {}\nNonce: {}",
        address.to_lowercase(),
        uuid::Uuid::new_v4()
    )
}
