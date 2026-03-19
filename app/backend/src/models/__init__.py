"""
Models 包
导出所有数据库模型
Tortoise ORM统一入口

注意: 枚举现在统一从 src.schemas.enums 导入
此处为向后兼容保留导出，但已标记 deprecated，将在未来版本移除
"""

import warnings

from src.models.account import Account
from src.models.asset import Asset, AssetContractBinding, AssetPriceHistory
from src.models.asset_media import AssetFeatures, AssetMedia
from src.models.audit import AuditLog
from src.models.base import AbstractModel, TimestampMixin
from src.models.chain import Chain
from src.models.contracts.contract_config import ContractConfig
from src.models.contracts.contract_deployment import ContractDeployment
from src.models.contracts.provider_registry import ProviderRegistry
from src.models.kyc import (
    AccountKyc,
    AccountKycDocument,
)
from src.models.kyc_audit_log import KycAuditLog
from src.models.redemption import (
    RedemptionEvent,
    RedemptionRequest,
    RedemptionSignature,
)
from src.models.staking import (
    RewardClaim,
    StakingLimit,
    StakingRecord,
)
from src.models.subscription import Subscription
from src.models.transaction_audit import (
    TransactionAudit,
)

__all__ = [
    # Base
    "AbstractModel",
    "TimestampMixin",
    # Account
    "Account",
    # Redemption
    "RedemptionRequest",
    "RedemptionSignature",
    "RedemptionEvent",
    # Chain
    "Chain",
    # KYC
    "AccountKyc",
    "AccountKycDocument",
    "UserKyc",  # deprecated alias
    "KycAuditLog",
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
    # Audit Log
    "AuditLog",
    # Transaction Audit
    "TransactionAudit",
    # ============ 枚举 (deprecated - 请从 src.schemas.enums 导入) ============
    # KYC
    "KycStatus",
    "OnChainSyncStatus",
    "IdType",
    "RiskLevel",
    "ReviewPriority",
    "KycAuditAction",
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
    # Account / Network
    "Network",
    "NetWork",  # 向后兼容别名
    # Audit
    "AuditAction",
    "AuditCategory",
    "AuditStatus",
    "TransactionAuditType",
    "TransactionAuditStatus",
    # Contract
    "ChainID",
]

# ============ 枚举 deprecated 重导出 ============
# 枚举名称集合，用于 __getattr__ 延迟加载 + DeprecationWarning
_DEPRECATED_ENUM_NAMES = {
    "AssetStatus",
    "AssetType",
    "AuditAction",
    "AuditCategory",
    "AuditStatus",
    "ChainID",
    "IdType",
    "KycAuditAction",
    "KycStatus",
    "LockPeriod",
    "MediaType",
    "NetWork",
    "Network",
    "OnChainSyncStatus",
    "ReviewPriority",
    "RiskLevel",
    "StakingPeriod",
    "StakingStatus",
    "SubscriptionStatus",
    "TokenType",
    "TransactionAuditStatus",
    "TransactionAuditType",
    "TransactionStatus",
    "TransactionType",
}


def __getattr__(name: str):
    if name == "UserKyc":
        warnings.warn(
            "UserKyc 是 AccountKyc 的废弃别名，请迁移到 AccountKyc。"
            "将在 v2.0 版本移除。",
            DeprecationWarning,
            stacklevel=2,
        )
        return AccountKyc
    if name in _DEPRECATED_ENUM_NAMES:
        warnings.warn(
            f"从 src.models 导入枚举 '{name}' 已废弃，"
            f"请改为 'from src.schemas.enums import {name}'。"
            f"此兼容导出将在 v2.0 移除。",
            DeprecationWarning,
            stacklevel=2,
        )
        from src.schemas import enums

        return getattr(enums, name)
    raise AttributeError(f"module 'src.models' has no attribute {name!r}")
