"""
统一枚举导出模块

按领域组织所有业务枚举，避免分散在各 model 文件中
"""

# KYC 相关
# 账户相关
from .account import NetType, NetworkType

# 资产相关
from .asset import AssetStatus, AssetType, MediaType

# 审计相关
from .audit import AuditAction, AuditCategory, AuditStatus
from .base import NetWork

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
from .kyc import IdType, KycStatus, OnChainSyncStatus, WalletType

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
    "NetType",
    "NetworkType",
    # Audit
    "AuditCategory",
    "AuditAction",
    "AuditStatus",
    # Contract
    "ChainID",
    "ContractScope",
    "ContractType",
    "NetWork",
    "ContractStatus",
    "DependencyType",
    "ContractRegistryStatus",
    "ProjectReadiness",
]
