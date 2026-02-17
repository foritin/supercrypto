"""
KYC 相关枚举
"""

from enum import Enum


class KycStatus(str, Enum):
    """KYC 状态枚举"""

    NOT_STARTED = "not_started"  # 未开始
    PENDING = "pending"  # 审核中
    APPROVED = "approved"  # 已通过
    REJECTED = "rejected"  # 已拒绝


class OnChainSyncStatus(str, Enum):
    """链上同步状态枚举 (ADR-3: 合约调用失败处理)"""

    NOT_REQUIRED = "not_required"  # main 环境，不需要同步
    PENDING = "pending"  # 待同步
    SYNCED = "synced"  # 已同步
    FAILED = "failed"  # 同步失败，需重试
    REVOKED = "revoked"  # 链上准入已解除


class IdType(str, Enum):
    """证件类型枚举"""

    ID_CARD = "id_card"  # 身份证
    PASSPORT = "passport"  # 护照
    DRIVER_LICENSE = "driver_license"  # 驾照


class RiskLevel(str, Enum):
    """风险等级枚举"""

    LOW = "low"  # 低风险
    MEDIUM = "medium"  # 中风险
    HIGH = "high"  # 高风险
    CRITICAL = "critical"  # 极高风险


class ReviewPriority(str, Enum):
    """审核优先级枚举"""

    LOW = "low"  # 低优先级
    NORMAL = "normal"  # 普通优先级
    HIGH = "high"  # 高优先级
    URGENT = "urgent"  # 紧急


class KycAuditAction(str, Enum):
    """KYC 审核日志操作类型"""

    SUBMIT = "submit"  # 提交申请
    REVIEW = "review"  # 审核中
    APPROVE = "approve"  # 审核通过
    REJECT = "reject"  # 审核拒绝
    RESUBMIT = "resubmit"  # 重新提交
    SYNC = "sync"  # 链上同步
    RESET = "reset"  # 重置状态
    ADMIT = "admit"  # 链上准入
    REVOKE = "revoke"  # 解除准入


class RejectReasonCode(str, Enum):
    """拒绝原因代码枚举"""

    BLURRY_PHOTO = "blurry_photo"  # 证件照片模糊
    EXPIRED_ID = "expired_id"  # 证件已过期
    UNCLEAR_SELFIE = "unclear_selfie"  # 手持照片不清晰
    INFO_MISMATCH = "info_mismatch"  # 信息不匹配
    INCOMPLETE_DOCS = "incomplete_docs"  # 文件不完整
    UNDERAGE = "underage"  # 未满 18 岁
    OTHER = "other"  # 其他原因
