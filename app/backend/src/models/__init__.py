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
from src.models.audit import AuditLog, log_audit, query_audit_logs
from src.models.base import AbstractModel, TimestampMixin
from src.models.chain import Chain
from src.models.contracts.contract_config import ContractConfig
from src.models.contracts.contract_deployment import ContractDeployment
from src.models.contracts.provider_registry import ProviderRegistry
from src.models.kyc import AccountKyc, UserKyc  # UserKyc is deprecated alias
from src.models.staking import (
    BASE_DAILY_RATE,
    STAKING_MULTIPLIERS,
    RewardClaim,
    StakingLimit,
    StakingRecord,
)
from src.models.subscription import Subscription
from src.models.transaction_audit import (
    TransactionAudit,
    get_pending_transactions,
    get_transaction_by_hash,
    query_transactions,
    record_transaction,
    update_transaction_status,
)

# 枚举 - 从 shared.schemas.enums 统一导入（向后兼容）
from src.shared.schemas.enums import (
    AssetStatus,
    AssetType,
    AuditAction,
    AuditCategory,
    AuditStatus,
    ChainID,
    IdType,
    KycStatus,
    LockPeriod,
    MediaType,
    NetWork,
    OnChainSyncStatus,
    StakingPeriod,
    StakingStatus,
    SubscriptionStatus,
    TokenType,
    TransactionAuditStatus,
    TransactionAuditType,
    TransactionStatus,
    TransactionType,
)

__all__ = [
    # Base
    "AbstractModel",
    "TimestampMixin",
    # Account
    "Account",
    # Chain
    "Chain",
    # KYC
    "AccountKyc",
    "UserKyc",  # deprecated alias
    # Asset
    "Asset",
    "AssetPriceHistory",
    "AssetContractBinding",
    "AssetMedia",
    "AssetFeatures",
    # Subscription
    "Subscription",
    # 合约模型
    "ContractConfig",
    "ContractDeployment",
    "ProviderRegistry",
    # Staking
    "StakingRecord",
    "StakingLimit",
    "RewardClaim",
    "STAKING_MULTIPLIERS",
    "BASE_DAILY_RATE",
    # Audit Log
    "AuditLog",
    "log_audit",
    "query_audit_logs",
    # Transaction Audit
    "TransactionAudit",
    "record_transaction",
    "update_transaction_status",
    "get_transaction_by_hash",
    "get_pending_transactions",
    "query_transactions",
    # ============ 枚举 (向后兼容) ============
    # KYC
    "KycStatus",
    "OnChainSyncStatus",
    "IdType",
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
    "TransactionAuditType",
    "TransactionAuditStatus",
    # Contract
    "ChainID",
]
