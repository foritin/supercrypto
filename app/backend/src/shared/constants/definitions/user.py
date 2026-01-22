"""
用户相关常量定义

定义证件类型、锁定期、代币类型、价格来源等用户相关常量。

这些常量用于:
- KYC 证件类型选择
- 质押锁定期配置
- 支持的代币类型
- 资产价格来源配置
"""

from src.shared.constants.schemas import ConstantItem

# =============================================================================
# 证件类型常量 (id_type)
# 用于 KYC 认证时的证件类型选择
# =============================================================================
ID_TYPE_CONSTANTS: list[ConstantItem] = [
    ConstantItem(
        value="passport",
        labels={"zh": "护照", "en": "Passport"},
    ),
    ConstantItem(
        value="id_card",
        labels={"zh": "身份证", "en": "ID Card"},
    ),
    ConstantItem(
        value="driver_license",
        labels={"zh": "驾驶证", "en": "Driver License"},
    ),
]

# =============================================================================
# 锁定期常量 (lock_period)
# 用于质押锁定期选择，值为月数
# =============================================================================
LOCK_PERIOD_CONSTANTS: list[ConstantItem] = [
    ConstantItem(
        value="3",
        labels={"zh": "3 个月", "en": "3 Months"},
    ),
    ConstantItem(
        value="6",
        labels={"zh": "6 个月", "en": "6 Months"},
    ),
    ConstantItem(
        value="12",
        labels={"zh": "12 个月", "en": "12 Months"},
    ),
]

# =============================================================================
# 代币类型常量 (token_type)
# 用于支持的支付代币类型
# =============================================================================
TOKEN_TYPE_CONSTANTS: list[ConstantItem] = [
    ConstantItem(
        value="USDT",
        labels={"zh": "USDT", "en": "USDT"},
    ),
    ConstantItem(
        value="USDC",
        labels={"zh": "USDC", "en": "USDC"},
    ),
]

# =============================================================================
# 价格来源常量 (price_source)
# 用于资产价格来源配置
# =============================================================================
PRICE_SOURCE_CONSTANTS: list[ConstantItem] = [
    ConstantItem(
        value="manual",
        labels={"zh": "手动输入", "en": "Manual"},
    ),
    ConstantItem(
        value="oracle",
        labels={"zh": "预言机", "en": "Oracle"},
    ),
    ConstantItem(
        value="api",
        labels={"zh": "API", "en": "API"},
    ),
]
