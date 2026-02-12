"""
共享Schema模块

目录结构:
- base.py      : 向后兼容导出 (TimestampMixin, IDMixin)
- mixins.py    : 可复用混入类 (TimestampMixin, IDMixin)
- enums/       : 所有业务枚举
"""

# 枚举 - 统一从 enums 包导入
from .enums import (  # Asset; Audit; KYC; Subscription; Account; Staking; Transaction
    AssetStatus,
    AssetType,
    AuditAction,
    AuditCategory,
    AuditStatus,
    IdType,
    KycStatus,
    LockPeriod,
    MediaType,
    NetType,
    Network,
    NetworkType,
    OnChainSyncStatus,
    StakingPeriod,
    StakingStatus,
    SubscriptionStatus,
    TokenType,
    TransactionStatus,
    TransactionType,
)

# 混入类
from .mixins import IDMixin, TimestampMixin

__all__ = [
    # Mixins
    "TimestampMixin",
    "IDMixin",
    # Enums - KYC
    "KycStatus",
    "OnChainSyncStatus",
    "IdType",
    # Enums - Asset
    "AssetStatus",
    "AssetType",
    "MediaType",
    # Enums - Subscription
    "SubscriptionStatus",
    "TokenType",
    "LockPeriod",
    # Enums - Staking
    "StakingStatus",
    "StakingPeriod",
    # Enums - Transaction
    "TransactionStatus",
    "TransactionType",
    # Enums - Account
    "Network",
    "NetType",
    "NetworkType",
    # Enums - Audit
    "AuditCategory",
    "AuditAction",
    "AuditStatus",
]
