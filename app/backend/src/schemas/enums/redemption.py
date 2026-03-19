"""
赎回相关枚举
"""

from enum import Enum


class RedemptionStatus(str, Enum):
    """赎回状态枚举"""

    PENDING = "pending"  # 待审批 (已创建赎回申请)
    APPROVED = "approved"  # 已批准 (多签提案已创建)
    EXECUTED = "executed"  # 已执行 (资金已转出)
    REJECTED = "rejected"  # 已拒绝


class SignatureStatus(str, Enum):
    """签名状态枚举"""

    PENDING = "pending"  # 待签名
    SIGNED = "signed"  # 已签名
    REJECTED = "rejected"  # 已拒绝


class RedemptionEventType(str, Enum):
    """赎回事件类型枚举"""

    REQUEST_CREATED = "request_created"  # 创建赎回请求
    PROPOSAL_CREATED = "proposal_created"  # 创建链上提案
    SIGNATURE_SUBMITTED = "signature_submitted"  # 多签成员提交签名
    THRESHOLD_REACHED = "threshold_reached"  # 签名达到阈值
    EXECUTED = "executed"  # 链上执行完成
    REJECTED = "rejected"  # 请求被拒绝
