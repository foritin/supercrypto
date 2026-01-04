"""
共享Schema模块

目录结构:
- base.py      : 基础响应模型 (ApiResponse, PaginatedResponse, ErrorResponse)
- common.py    : 通用参数模型 (PaginationParams, SortParams)
- mixins.py    : 可复用混入类 (TimestampMixin, IDMixin)
- enums/       : 所有业务枚举
"""

# 基础响应模型
from .base import (
    ApiResponse,
    ErrorResponse,
    PaginatedResponse,
)

# 混入类
from .mixins import (
    IDMixin,
    TimestampMixin,
)

# 通用参数
from .common import (
    PaginationParams,
    SortParams,
)

# 枚举 - 统一从 enums 包导入
from .enums import (
    # KYC
    IdType,
    KycStatus,
    OnChainSyncStatus,
    WalletType,
    # Asset
    AssetStatus,
    AssetType,
    MediaType,
    # Subscription
    LockPeriod,
    SubscriptionStatus,
    TokenType,
    # Staking
    StakingPeriod,
    StakingStatus,
    # Transaction
    TransactionStatus,
    TransactionType,
    # Account
    NetType,
    NetworkType,
    # Audit
    AuditAction,
    AuditCategory,
    AuditStatus,
)


__all__ = [
    # Base
    "ApiResponse",
    "PaginatedResponse",
    "ErrorResponse",
    # Mixins
    "TimestampMixin",
    "IDMixin",
    # Common
    "PaginationParams",
    "SortParams",
    # Enums - KYC
    "KycStatus",
    "OnChainSyncStatus",
    "IdType",
    "WalletType",
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
    "NetType",
    "NetworkType",
    # Enums - Audit
    "AuditCategory",
    "AuditAction",
    "AuditStatus",
]
