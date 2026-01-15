"""
Contract Dependency Model
合约依赖关系模型 (纯 Provider 模式简化版)

记录合约部署时的依赖关系，用于：
1. 追踪合约间的依赖关系
2. 检测依赖合约地址变更

注意: 纯 Provider 模式下，所有依赖通过 AddressProvider 管理，
      不再区分 source/constraint，绑定状态通过 Provider 链上查询
"""

from tortoise import fields

from src.models.base import AbstractModel, TimestampMixin


class ContractDependency(AbstractModel, TimestampMixin):
    """
    合约依赖关系表 (简化版)

    纯 Provider 模式：
    - 所有依赖通过 AddressProvider 动态获取
    - 不再需要 setter 函数绑定
    - 绑定状态通过 Provider 链上查询
    """

    contract_id = fields.BigIntField(
        null=True,
        description="主合约ID",
    )
    dependency_id = fields.BigIntField(
        null=True,
        description="依赖合约ID",
    )
    contract_address = fields.CharField(
        max_length=100, null=True, description="主合约地址"
    )
    contract_name = fields.CharField(
        max_length=100, null=True, description="主合约名称"
    )
    dependency_address = fields.CharField(
        max_length=100, null=True, description="依赖合约地址"
    )
    dependency_name = fields.CharField(
        max_length=100, null=True, description="依赖合约名称"
    )

    # Provider Key (用于从 Provider 查询)
    provider_key = fields.CharField(
        max_length=100, null=True, description="Provider Key，如 VANKE_RWA_TOKEN"
    )

    is_deployed = fields.BooleanField(default=False, description="依赖合约是否已部署")

    class Meta:
        table = "contract_dependency"
        unique_together = [("contract_id", "dependency_id")]


# ============ 依赖关系配置 (配置驱动，非数据库) ============

# 合约依赖声明 - 用于依赖图展示和就绪检查
CONTRACT_DEPENDENCIES: dict[str, list[str]] = {
    # Vanke 项目合约依赖
    "VankeRWAToken": ["KYC_MANAGER"],
    "VankePlatformToken": ["KYC_MANAGER"],
    "VankeSubscription": ["KYC_MANAGER", "USDT", "VANKE_RWA_TOKEN"],
    "VankeStaking": [
        "KYC_MANAGER",
        "VANKE_RWA_TOKEN",
        "VANKE_PLATFORM_TOKEN",
        "VANKE_SUBSCRIPTION",
    ],
    "VankeLiquidityMining": ["KYC_MANAGER", "USDT", "VANKE_PLATFORM_TOKEN"],
}

# Provider Key 映射配置
PROVIDER_KEYS: dict[str, dict] = {
    # 公共合约
    "KYC_MANAGER": {"category": "common", "contract": "KYC"},
    "USDT": {"category": "stablecoin", "contract": "USDT"},
    "USDC": {"category": "stablecoin", "contract": "USDC"},
    "TIMELOCK": {"category": "common", "contract": "Timelock"},
    "MULTI_SIG": {"category": "common", "contract": "MultiSigManager"},
    # Vanke 项目合约
    "VANKE_RWA_TOKEN": {"category": "vanke", "contract": "VankeRWAToken"},
    "VANKE_PLATFORM_TOKEN": {"category": "vanke", "contract": "VankePlatformToken"},
    "VANKE_SUBSCRIPTION": {"category": "vanke", "contract": "VankeSubscription"},
    "VANKE_STAKING": {"category": "vanke", "contract": "VankeStaking"},
    "VANKE_LIQUIDITY_MINING": {"category": "vanke", "contract": "VankeLiquidityMining"},
}


def get_contract_dependencies(contract_name: str) -> list[str]:
    """获取合约的依赖列表"""
    return CONTRACT_DEPENDENCIES.get(contract_name, [])


def get_provider_key_info(key: str) -> dict | None:
    """获取 Provider Key 的元信息"""
    return PROVIDER_KEYS.get(key)


def get_keys_by_category(category: str) -> list[str]:
    """获取指定分类的所有 Key"""
    return [k for k, v in PROVIDER_KEYS.items() if v["category"] == category]
