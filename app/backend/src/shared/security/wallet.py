"""
钱包签名验证

纯工具函数，仅依赖 web3
"""

from typing import Optional

from eth_account.messages import encode_defunct
from fastapi import HTTPException, status
from web3 import Web3


def verify_wallet_signature(
    address: str, signature: str, message: str = "SlimCryptoAccess"
) -> bool:
    """
    验证钱包签名

    Args:
        address: 钱包地址
        signature: 签名
        message: 签名的消息

    Returns:
        签名是否有效
    """
    try:
        w3 = Web3()
        message_hash = encode_defunct(text=message)
        recovered_address = w3.eth.account.recover_message(
            message_hash, signature=signature
        )
        return recovered_address.lower() == address.lower()
    except Exception:
        return False


def create_sensitive_operation_message(
    action: str,
    wallet_address: str,
    timestamp: int,
    params_hash: Optional[str] = None,
) -> str:
    """
    创建敏感操作签名消息

    Args:
        action: 操作类型 (e.g., "transfer", "kyc_submit", "stake")
        wallet_address: 钱包地址
        timestamp: Unix 时间戳 (秒)
        params_hash: 操作参数的哈希值 (可选)

    Returns:
        待签名的消息字符串
    """
    msg = "ApprovePlatform Sensitive Operation\n\n"
    msg += f"Action: {action}\n"
    msg += f"Wallet: {wallet_address}\n"
    msg += f"Timestamp: {timestamp}\n"
    if params_hash:
        msg += f"Params: {params_hash}\n"
    return msg


def verify_sensitive_operation_signature(
    wallet_address: str,
    signature: str,
    action: str,
    timestamp: int,
    params_hash: Optional[str] = None,
    max_age_seconds: int = 300,  # 签名有效期 5 分钟
) -> bool:
    """
    验证敏感操作签名

    Args:
        wallet_address: 声明的钱包地址
        signature: MetaMask 签名
        action: 操作类型
        timestamp: 签名时的时间戳
        params_hash: 操作参数的哈希值
        max_age_seconds: 签名最大有效期 (秒)

    Returns:
        签名是否有效

    Raises:
        HTTPException: 签名无效或已过期
    """
    import time

    # 1. 检查时间戳是否在有效期内
    current_time = int(time.time())
    if abs(current_time - timestamp) > max_age_seconds:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Signature expired. Please sign again. (max age: {max_age_seconds}s)",
        )

    # 2. 重建签名消息并验证
    message = create_sensitive_operation_message(
        action=action,
        wallet_address=wallet_address,
        timestamp=timestamp,
        params_hash=params_hash,
    )

    if not verify_wallet_signature(wallet_address, signature, message):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signature for sensitive operation",
        )

    return True


class SensitiveOperationRequest:
    """敏感操作请求的通用字段"""

    signature: str  # MetaMask 签名
    timestamp: int  # 签名时的 Unix 时间戳
