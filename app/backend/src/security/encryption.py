"""
私钥加密模块

使用 Fernet 对称加密（基于 AES-128-CBC + HMAC-SHA256）保护私钥存储。
密钥从 SETTINGS.ENCRYPTION_KEY 读取。

用法:
    from src.security.encryption import encrypt_private_key, decrypt_private_key

    encrypted = encrypt_private_key("0xabc123...")
    original = decrypt_private_key(encrypted)
"""

from cryptography.fernet import Fernet, InvalidToken
from falib.utils.config import SETTINGS
from falib.utils.log import get_logger

logger = get_logger("system.security.encryption")

_fernet_instance: Fernet | None = None


def _get_fernet() -> Fernet:
    """
    获取 Fernet 实例（缓存复用）

    从 SETTINGS 读取 ENCRYPTION_KEY 并创建 Fernet 对象。
    首次调用后缓存实例，后续调用直接返回。

    Returns:
        Fernet 实例

    Raises:
        ValueError: 如果 ENCRYPTION_KEY 未配置或格式无效
    """
    global _fernet_instance
    if _fernet_instance is not None:
        return _fernet_instance

    key = getattr(SETTINGS, "ENCRYPTION_KEY", None)
    if not key:
        raise ValueError(
            "ENCRYPTION_KEY 未配置，请在 config.*.yaml 中设置 encryption_key"
        )
    try:
        _fernet_instance = Fernet(key.encode() if isinstance(key, str) else key)
        return _fernet_instance
    except Exception as e:
        raise ValueError(f"ENCRYPTION_KEY 格式无效，需要有效的 Fernet 密钥: {e}")


def encrypt_private_key(key: str) -> str:
    """
    加密私钥

    Args:
        key: 明文私钥字符串

    Returns:
        加密后的 Base64 编码字符串

    Raises:
        ValueError: 如果输入为空或加密密钥未配置
    """
    if not key:
        raise ValueError("私钥不能为空")

    fernet = _get_fernet()
    encrypted = fernet.encrypt(key.encode("utf-8"))
    logger.debug("私钥加密成功")
    return encrypted.decode("utf-8")


def decrypt_private_key(encrypted: str) -> str:
    """
    解密私钥

    Args:
        encrypted: 加密后的 Base64 编码字符串

    Returns:
        解密后的明文私钥

    Raises:
        ValueError: 如果输入为空、加密密钥未配置或解密失败
    """
    if not encrypted:
        raise ValueError("加密数据不能为空")

    fernet = _get_fernet()
    try:
        decrypted = fernet.decrypt(encrypted.encode("utf-8"))
        logger.debug("私钥解密成功")
        return decrypted.decode("utf-8")
    except InvalidToken:
        logger.error("私钥解密失败: 无效的加密数据或密钥不匹配")
        raise ValueError("解密失败: 无效的加密数据或密钥不匹配")
