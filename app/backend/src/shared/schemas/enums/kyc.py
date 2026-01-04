"""
KYC 相关枚举
"""
from enum import Enum


class KycStatus(str, Enum):
    """KYC 状态枚举"""
    NOT_STARTED = "not_started"  # 未开始
    PENDING = "pending"          # 审核中
    APPROVED = "approved"        # 已通过
    REJECTED = "rejected"        # 已拒绝


class OnChainSyncStatus(str, Enum):
    """链上同步状态枚举 (ADR-3: 合约调用失败处理)"""
    NOT_REQUIRED = "not_required"  # main 环境，不需要同步
    PENDING = "pending"            # 待同步
    SYNCED = "synced"              # 已同步
    FAILED = "failed"              # 同步失败，需重试


class IdType(str, Enum):
    """证件类型枚举"""
    ID_CARD = "id_card"            # 身份证
    PASSPORT = "passport"          # 护照
    DRIVER_LICENSE = "driver_license"  # 驾照


class WalletType(str, Enum):
    """钱包类型枚举"""
    LOCAL = "local"
    TEST = "test"
    MAIN = "main"

