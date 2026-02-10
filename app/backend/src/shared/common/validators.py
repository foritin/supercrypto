"""
通用验证工具

提供链上交易相关的格式校验函数。
"""

import re

# tx_hash 正则: 0x + 64 hex 字符 (总长 66)
TX_HASH_PATTERN = re.compile(r"^0x[0-9a-fA-F]{64}$")


def validate_tx_hash(value: str) -> str:
    """
    校验以太坊交易哈希格式

    格式要求: 0x + 64 hex 字符 (总长 66)

    Args:
        value: 待校验的 tx_hash 字符串

    Returns:
        规范化后的 tx_hash (小写)

    Raises:
        ValueError: 格式不合法
    """
    if not TX_HASH_PATTERN.match(value):
        raise ValueError(
            f"Invalid tx_hash format: expected 0x + 64 hex chars (66 total), got length {len(value)}"
        )
    return value.lower()
