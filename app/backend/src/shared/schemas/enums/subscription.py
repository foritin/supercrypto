"""
认购相关枚举
"""
from enum import Enum


class SubscriptionStatus(str, Enum):
    """认购状态枚举"""
    PENDING = "pending"        # 待确认 (交易发起中)
    ACTIVE = "active"          # 进行中 (锁定期内)
    MATURED = "matured"        # 已到期 (可赎回)
    REDEEMED = "redeemed"      # 已赎回
    CANCELLED = "cancelled"    # 已取消


class TokenType(str, Enum):
    """支付代币类型"""
    USDT = "USDT"
    USDC = "USDC"


class LockPeriod(int, Enum):
    """锁定期枚举 (月)"""
    THREE_MONTHS = 3
    SIX_MONTHS = 6
    TWELVE_MONTHS = 12

