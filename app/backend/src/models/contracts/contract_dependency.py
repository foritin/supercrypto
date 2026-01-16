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
