"""
Contract Meta Model
合约元数据模型

存储合约的静态元数据，包括：
- 项目归属 (project_name)
- Provider Key 映射 (provider_key)
- 依赖关系声明 (dependencies)

数据来源: 部署脚本写入 (scripts/deploy/projects/*.py 中的 ContractConfig.provider_deps)
"""

from tortoise import fields

from src.models.base import AbstractModel, TimestampMixin


class ContractMeta(AbstractModel, TimestampMixin):
    """
    合约元数据表

    存储合约的静态配置信息，与 Contract 表（部署记录）分离。
    Contract 表记录 "部署了什么"，ContractMeta 表记录 "合约是什么"。

    数据写入时机:
    - 部署脚本 (deploy_*.py) 部署合约时自动写入
    - 数据迁移脚本一次性导入现有配置

    数据来源:
    - scripts/deploy/base.py: COMMON_CONTRACTS, STABLECOIN_CONTRACTS
    - scripts/deploy/projects/vanke.py: VANKE_PROJECT.contracts
    - 每个 ContractConfig 的 provider_deps 字段定义依赖关系
    """

    # 合约标识
    contract_name = fields.CharField(
        max_length=100, unique=True, description="合约名称，如 VankeRWAToken"
    )

    # 项目归属
    project_name = fields.CharField(
        max_length=100,
        index=True,
        description="项目名称: common, stablecoin, vanke, mock 等",
    )

    # Provider 相关
    provider_key = fields.CharField(
        max_length=100,
        null=True,
        index=True,
        description="对应的 Provider Key 名称，如 VANKE_RWA_TOKEN",
    )

    provider_key_hash = fields.CharField(
        max_length=66, null=True, description="keccak256(provider_key) 的 hex 值"
    )

    # 依赖关系 (核心字段)
    # 存储依赖的 Provider Key 列表
    # 例: ["KYC_MANAGER", "USDT", "VANKE_RWA_TOKEN"]
    dependencies = fields.JSONField(
        default=[], description="依赖的 Provider Key 列表 (JSON Array)"
    )

    # 合约类型 (从 ContractConfig.contract_type)
    contract_type = fields.CharField(
        max_length=50,
        null=True,
        description="合约类型: registry, kyc, stablecoin, token, defi",
    )

    # 作用域 (从 ContractConfig.scope)
    scope = fields.CharField(
        max_length=20,
        default="project",
        description="作用域: global (公共) / project (项目私有)",
    )

    # 描述信息
    description = fields.TextField(null=True, description="合约描述")

    display_name = fields.CharField(max_length=200, null=True, description="显示名称")

    # 版本信息
    version = fields.CharField(max_length=20, null=True, description="合约版本")

    class Meta:
        table = "contract_meta"

    def __str__(self):
        return f"ContractMeta({self.contract_name}, project={self.project_name})"

    @property
    def has_dependencies(self) -> bool:
        """是否有依赖"""
        return bool(self.dependencies)

    @property
    def dependency_count(self) -> int:
        """依赖数量"""
        return len(self.dependencies) if self.dependencies else 0
