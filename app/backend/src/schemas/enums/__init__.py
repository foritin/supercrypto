"""
统一枚举导出模块

按领域组织所有业务枚举，避免分散在各 model 文件中
"""

# KYC 相关
# 账户相关 (NetType/NetworkType 已废弃，统一使用 Network)
from .account import NetType, NetworkType

# 资产相关
from .asset import AssetStatus, AssetType, MediaType

# 审计相关
from .audit import (
    AuditAction,
    AuditCategory,
    AuditStatus,
    TransactionAuditStatus,
    TransactionAuditType,
)
from .base import NetWork, Network

# 合约相关
from .contract import (
    ChainID,
    ContractRegistryStatus,
    ContractScope,
    ContractStatus,
    ContractType,
    DependencyType,
    ProjectReadiness,
)

# 错误码
from .error_codes import ErrorCode
from .kyc import (
    IdType,
    KycAuditAction,
    KycStatus,
    OnChainSyncStatus,
    RejectReasonCode,
    ReviewPriority,
    RiskLevel,
)

# 质押相关
from .staking import StakingPeriod, StakingStatus

# 认购相关
from .subscription import LockPeriod, SubscriptionStatus, TokenType

# 交易相关
from .transaction import TransactionStatus, TransactionType

__all__ = [
    # KYC
    "KycStatus",
    "OnChainSyncStatus",
    "IdType",
    "RiskLevel",
    "ReviewPriority",
    "KycAuditAction",
    "RejectReasonCode",
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
    "NetType",  # 向后兼容别名
    "NetworkType",  # 向后兼容别名
    # Audit
    "AuditCategory",
    "AuditAction",
    "AuditStatus",
    "TransactionAuditType",
    "TransactionAuditStatus",
    # Contract
    "ChainID",
    "ContractScope",
    "ContractType",
    "ContractStatus",
    "DependencyType",
    "ContractRegistryStatus",
    "ProjectReadiness",
    # Error Codes
    "ErrorCode",
]
