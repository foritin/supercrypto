"""
常量定义模块

导出所有常量定义，并在模块导入时自动注册到常量注册中心。

常量分组:
- asset_type: 资产类型
- asset_status: 资产状态
- media_type: 媒体类型
- subscription_status: 认购状态
- staking_status: 质押状态
- transaction_type: 交易类型
- id_type: 证件类型
- lock_period: 锁定期
- token_type: 代币类型
- price_source: 价格来源
- kyc_reject_reason: KYC 拒绝原因
- kyc_status: KYC 状态
- kyc_risk_level: KYC 风险等级
- kyc_priority: KYC 审核优先级

注意: 区块链网络配置已迁移到数据库表 (chains)，通过 API 获取
"""

from src.constants.registry import get_registry

# 导入资产相关常量
from .asset import ASSET_STATUS_CONSTANTS, ASSET_TYPE_CONSTANTS, MEDIA_TYPE_CONSTANTS

# 导入业务相关常量
from .business import (
    STAKING_STATUS_CONSTANTS,
    SUBSCRIPTION_STATUS_CONSTANTS,
    TRANSACTION_TYPE_CONSTANTS,
)

# 导入合约常量
from .contract import ZERO_ADDRESS

# 导入 KYC 相关常量
from .kyc import (
    KYC_PRIORITY_CONSTANTS,
    KYC_REJECT_REASON_CONSTANTS,
    KYC_RISK_LEVEL_CONSTANTS,
    KYC_STATUS_CONSTANTS,
)

# 导入质押业务常量
from .staking import (
    BASE_DAILY_RATE,
    PLT_STAKING_POOL,
    PLT_TOTAL_SUPPLY,
    STAKING_MULTIPLIERS,
)

# 导入用户相关常量
from .user import (
    ID_TYPE_CONSTANTS,
    LOCK_PERIOD_CONSTANTS,
    PRICE_SOURCE_CONSTANTS,
    TOKEN_TYPE_CONSTANTS,
)

__all__ = [
    # 资产相关
    "ASSET_TYPE_CONSTANTS",
    "ASSET_STATUS_CONSTANTS",
    "MEDIA_TYPE_CONSTANTS",
    # 业务相关
    "SUBSCRIPTION_STATUS_CONSTANTS",
    "STAKING_STATUS_CONSTANTS",
    "TRANSACTION_TYPE_CONSTANTS",
    # 用户相关
    "ID_TYPE_CONSTANTS",
    "LOCK_PERIOD_CONSTANTS",
    "TOKEN_TYPE_CONSTANTS",
    "PRICE_SOURCE_CONSTANTS",
    # KYC 相关
    "KYC_REJECT_REASON_CONSTANTS",
    "KYC_STATUS_CONSTANTS",
    "KYC_RISK_LEVEL_CONSTANTS",
    "KYC_PRIORITY_CONSTANTS",
    # 质押业务常量
    "PLT_TOTAL_SUPPLY",
    "PLT_STAKING_POOL",
    "STAKING_MULTIPLIERS",
    "BASE_DAILY_RATE",
    # 合约常量
    "ZERO_ADDRESS",
]


def register_all_constants() -> None:
    """
    注册所有常量到注册中心

    此函数将所有定义的常量分组注册到 ConstantsRegistry 单例中。
    在模块导入时自动调用。
    """
    registry = get_registry()

    # 注册资产相关常量
    registry.register("asset_type", ASSET_TYPE_CONSTANTS)
    registry.register("asset_status", ASSET_STATUS_CONSTANTS)
    registry.register("media_type", MEDIA_TYPE_CONSTANTS)

    # 注册业务相关常量
    registry.register("subscription_status", SUBSCRIPTION_STATUS_CONSTANTS)
    registry.register("staking_status", STAKING_STATUS_CONSTANTS)
    registry.register("transaction_type", TRANSACTION_TYPE_CONSTANTS)

    # 注册用户相关常量
    registry.register("id_type", ID_TYPE_CONSTANTS)
    registry.register("lock_period", LOCK_PERIOD_CONSTANTS)
    registry.register("token_type", TOKEN_TYPE_CONSTANTS)
    registry.register("price_source", PRICE_SOURCE_CONSTANTS)

    # 注册 KYC 相关常量
    registry.register("kyc_reject_reason", KYC_REJECT_REASON_CONSTANTS)
    registry.register("kyc_status", KYC_STATUS_CONSTANTS)
    registry.register("kyc_risk_level", KYC_RISK_LEVEL_CONSTANTS)
    registry.register("kyc_priority", KYC_PRIORITY_CONSTANTS)


# 模块导入时自动注册所有常量
register_all_constants()
