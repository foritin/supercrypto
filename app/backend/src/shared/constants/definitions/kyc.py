"""
KYC 相关常量定义

定义 KYC 审核相关的常量，包括：
- 拒绝原因代码 (kyc_reject_reason)
- KYC 状态 (kyc_status)
- 风险等级 (kyc_risk_level)
- 审核优先级 (kyc_priority)

这些常量用于:
- KYC 审核时的拒绝原因选择
- KYC 状态显示
- 风险等级筛选
- 优先级排序
"""

from src.shared.constants.schemas import ConstantItem

# =============================================================================
# KYC 拒绝原因常量 (kyc_reject_reason)
# 用于管理员审核 KYC 时选择拒绝原因
# =============================================================================
KYC_REJECT_REASON_CONSTANTS: list[ConstantItem] = [
    ConstantItem(
        value="invalid_document",
        labels={"zh": "证件无效或不清晰", "en": "Invalid or unclear document"},
    ),
    ConstantItem(
        value="expired_document",
        labels={"zh": "证件已过期", "en": "Expired document"},
    ),
    ConstantItem(
        value="mismatch_info",
        labels={"zh": "信息不匹配", "en": "Information mismatch"},
    ),
    ConstantItem(
        value="incomplete_info",
        labels={"zh": "信息不完整", "en": "Incomplete information"},
    ),
    ConstantItem(
        value="suspected_fraud",
        labels={"zh": "疑似欺诈", "en": "Suspected fraud"},
    ),
    ConstantItem(
        value="unsupported_country",
        labels={"zh": "不支持的国家/地区", "en": "Unsupported country/region"},
    ),
    ConstantItem(
        value="duplicate_application",
        labels={"zh": "重复申请", "en": "Duplicate application"},
    ),
    ConstantItem(
        value="other",
        labels={"zh": "其他原因", "en": "Other reason"},
    ),
]

# =============================================================================
# KYC 状态常量 (kyc_status)
# 用于 KYC 状态显示和筛选
# =============================================================================
KYC_STATUS_CONSTANTS: list[ConstantItem] = [
    ConstantItem(
        value="not_started",
        labels={"zh": "未开始", "en": "Not Started"},
        metadata={"color": "gray"},
    ),
    ConstantItem(
        value="pending",
        labels={"zh": "待审核", "en": "Pending"},
        metadata={"color": "yellow"},
    ),
    ConstantItem(
        value="approved",
        labels={"zh": "已通过", "en": "Approved"},
        metadata={"color": "green"},
    ),
    ConstantItem(
        value="rejected",
        labels={"zh": "已拒绝", "en": "Rejected"},
        metadata={"color": "red"},
    ),
]

# =============================================================================
# KYC 风险等级常量 (kyc_risk_level)
# 用于风险等级显示和筛选
# =============================================================================
KYC_RISK_LEVEL_CONSTANTS: list[ConstantItem] = [
    ConstantItem(
        value="low",
        labels={"zh": "低风险", "en": "Low Risk"},
        metadata={"color": "green", "score_range": [0, 30]},
    ),
    ConstantItem(
        value="medium",
        labels={"zh": "中风险", "en": "Medium Risk"},
        metadata={"color": "yellow", "score_range": [31, 60]},
    ),
    ConstantItem(
        value="high",
        labels={"zh": "高风险", "en": "High Risk"},
        metadata={"color": "orange", "score_range": [61, 80]},
    ),
    ConstantItem(
        value="critical",
        labels={"zh": "极高风险", "en": "Critical Risk"},
        metadata={"color": "red", "score_range": [81, 100]},
    ),
]

# =============================================================================
# KYC 审核优先级常量 (kyc_priority)
# 用于审核优先级显示和排序
# =============================================================================
KYC_PRIORITY_CONSTANTS: list[ConstantItem] = [
    ConstantItem(
        value="low",
        labels={"zh": "低", "en": "Low"},
        metadata={"order": 1},
    ),
    ConstantItem(
        value="normal",
        labels={"zh": "普通", "en": "Normal"},
        metadata={"order": 2},
    ),
    ConstantItem(
        value="high",
        labels={"zh": "高", "en": "High"},
        metadata={"order": 3},
    ),
    ConstantItem(
        value="urgent",
        labels={"zh": "紧急", "en": "Urgent"},
        metadata={"order": 4},
    ),
]
