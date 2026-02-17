"""
交易相关枚举
"""

from enum import Enum


class TransactionStatus(str, Enum):
    """交易状态枚举"""

    PENDING = "pending"  # 待确认
    CONFIRMED = "confirmed"  # 已确认
    FAILED = "failed"  # 失败
    CANCELLED = "cancelled"  # 已取消


class TransactionType(str, Enum):
    """交易类型枚举"""

    # 业务交易类型
    SUBSCRIPTION = "subscription"  # 认购
    REDEEM = "redeem"  # 赎回
    STAKE = "stake"  # 质押
    UNSTAKE = "unstake"  # 解押
    CLAIM = "claim"  # 领取奖励

    # 链上交易类型
    TRANSFER = "transfer"  # 转账
    APPROVE = "approve"  # 授权
    MINT = "mint"  # 铸造

    # 其他
    OTHER = "other"  # 其他
