"""
Models 包
导出所有数据库模型
Tortoise ORM统一入口
"""

from src.models.account import Account, AccountPermission, RoutePermission
from src.models.asset import (
    Asset,
    AssetContractBinding,
    AssetPriceHistory,
    AssetStatus,
    AssetType,
)
from src.models.asset_media import AssetFeatures, AssetMedia, MediaType
from src.models.audit_log import AuditAction, AuditLog
from src.models.base import AbstractModel, TimestampMixin
from src.models.contract_dependency import (
    DEPENDENCY_SET_FUNCTIONS,
    PRESET_DEPENDENCIES,
    ContractBinding,
    ContractDependencySync,  # 别名，兼容旧代码
    get_set_function,
)
from src.models.deploy import DeployInfo
from src.models.kyc import KycStatus, UserKyc
from src.models.staking import (
    BASE_DAILY_RATE,
    STAKING_MULTIPLIERS,
    RewardClaim,
    StakingLimit,
    StakingPeriod,
    StakingRecord,
    StakingStatus,
)
from src.models.subscription import (
    LockPeriod,
    Subscription,
    SubscriptionStatus,
    TokenType,
)
from src.models.transaction import Transaction
from src.models.wallet import Wallet

__all__ = [
    "AbstractModel",
    "TimestampMixin",
    "Account",
    "Wallet",
    "Transaction",
    "AccountPermission",
    "RoutePermission",
    "DeployInfo",
    "UserKyc",
    "KycStatus",
    "Asset",
    "AssetPriceHistory",
    "AssetContractBinding",
    "AssetStatus",
    "AssetType",
    "AssetMedia",
    "AssetFeatures",
    "MediaType",
    "Subscription",
    "SubscriptionStatus",
    "TokenType",
    "LockPeriod",
    "ContractBinding",
    "ContractDependencySync",
    "DEPENDENCY_SET_FUNCTIONS",
    "get_set_function",
    "PRESET_DEPENDENCIES",
    # Staking
    "StakingRecord",
    "StakingLimit",
    "RewardClaim",
    "StakingStatus",
    "StakingPeriod",
    "STAKING_MULTIPLIERS",
    "BASE_DAILY_RATE",
    # Audit Log
    "AuditLog",
    "AuditAction",
]
