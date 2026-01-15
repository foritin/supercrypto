"""
Models 包
导出所有数据库模型
Tortoise ORM统一入口

注意: 枚举现在统一从 src.shared.schemas.enums 导入
此处为向后兼容保留导出
"""

from src.models.account import Account
from src.models.asset import Asset, AssetContractBinding, AssetPriceHistory
from src.models.asset_media import AssetFeatures, AssetMedia
from src.models.audit_log import AuditLog
from src.models.base import AbstractModel, TimestampMixin
from src.models.contracts.contract import Contract
from src.models.contracts.contract_dependency import ContractDependency
from src.models.contracts.provider_registry import ProviderRegistry
from src.models.kyc import UserKyc
from src.models.staking import (
    BASE_DAILY_RATE,
    STAKING_MULTIPLIERS,
    RewardClaim,
    StakingLimit,
    StakingRecord,
)
from src.models.subscription import Subscription
from src.models.transaction import Transaction
from src.models.wallet import Wallet

# 枚举 - 从 shared.schemas.enums 统一导入（向后兼容）
from src.shared.schemas.enums import (
    # Asset
    AssetStatus,
    AssetType,
    # Audit
    AuditAction,
    AuditCategory,
    AuditStatus,
    # Contract
    ChainID,
    # KYC
    IdType,
    KycStatus,
    # Subscription
    LockPeriod,
    MediaType,
    # Account
    # Base
    NetWork,
    OnChainSyncStatus,
    # Staking
    StakingPeriod,
    StakingStatus,
    SubscriptionStatus,
    TokenType,
    # Transaction
    TransactionStatus,
    TransactionType,
    WalletType,
)

__all__ = [
    # Base
    "AbstractModel",
    "TimestampMixin",
    # Account
    "Account",
    # Wallet
    "Wallet",
    # Transaction
    "Transaction",
    # KYC
    "UserKyc",
    # Asset
    "Asset",
    "AssetPriceHistory",
    "AssetContractBinding",
    "AssetMedia",
    "AssetFeatures",
    # Subscription
    "Subscription",
    # Contract
    "Contract",
    "ContractDependency",
    "ProviderRegistry",
    # Staking
    "StakingRecord",
    "StakingLimit",
    "RewardClaim",
    "STAKING_MULTIPLIERS",
    "BASE_DAILY_RATE",
    # Audit Log
    "AuditLog",
    # ============ 枚举 (向后兼容) ============
    # KYC
    "KycStatus",
    "OnChainSyncStatus",
    "IdType",
    "WalletType",
    # Asset
    "AssetStatus",
    "AssetType",
    "MediaType",
    # Subscription
    "SubscriptionStatus",
    "TokenType",
    "LockPeriod",
    # Staking
    "StakingStatus",
    "StakingPeriod",
    # Transaction
    "TransactionStatus",
    "TransactionType",
    # Account
    "NetWork",
    # Audit
    "AuditAction",
    "AuditCategory",
    "AuditStatus",
]
