"""
交易相关枚举
"""
from enum import Enum


class TransactionStatus(str, Enum):
    """交易状态枚举"""
    PENDING = "pending"        # 待确认
    CONFIRMED = "confirmed"    # 已确认
    FAILED = "failed"          # 失败
    CANCELLED = "cancelled"    # 已取消


class TransactionType(str, Enum):
    """交易类型枚举"""
    TRANSFER = "transfer"      # 转账
    CONTRACT = "contract"      # 合约调用
    MINT = "mint"              # 铸造
    SWAP = "swap"              # 兑换

