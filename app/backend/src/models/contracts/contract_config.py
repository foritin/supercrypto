"""
Contract Config Model
合约配置模型

提供统一的合约配置管理。

数据来源:
- 部署脚本 (scripts/deploy/projects/*.py) 中的合约配置

字段说明:
- 基本标识: contract_name, project_name
- Provider 相关: provider_key, provider_key_hash
- 依赖关系: dependencies, required_deps, optional_deps
- 分类信息: contract_type, scope, dependency_type
- 描述信息: description, display_name, version
- 项目配置: is_primary, module, deploy_order, allow_zero_address, environments, production_address
"""

from typing import Optional, Sequence

from tortoise import fields

from src.models.base import AbstractModel, TimestampMixin
from src.shared.schemas.enums.contract import DependencyType


class ContractConfig(AbstractModel, TimestampMixin):
    """
    合约配置表

    存储合约的静态配置信息，包括：
    - 合约标识和项目归属
    - Provider Key 映射
    - 依赖关系声明
    - 部署配置参数

    数据写入时机:
    - 部署脚本 (deploy_*.py) 部署合约时自动写入

    数据来源:
    - scripts/deploy/base.py: COMMON_CONTRACTS, STABLECOIN_CONTRACTS
    - scripts/deploy/projects/*.py: 项目合约配置
    - 每个 ContractConfig 的 provider_deps 字段定义依赖关系
    """

    # === 基本标识 ===
    contract_name = fields.CharField(
        max_length=100, unique=True, description="合约名称，如 VankeRWAToken"
    )

    project_name = fields.CharField(
        max_length=100,
        index=True,
        description="项目名称: common, stablecoin, vanke, mock 等",
    )

    # === Provider 相关 ===
    provider_key = fields.CharField(
        max_length=100,
        null=True,
        index=True,
        description="对应的 Provider Key 名称，如 VANKE_RWA_TOKEN",
    )

    provider_key_hash = fields.CharField(
        max_length=66, null=True, description="keccak256(provider_key) 的 hex 值"
    )

    # === 依赖关系 ===
    # 存储依赖的 Provider Key 列表
    # 例: ["KYC_MANAGER", "USDT", "VANKE_RWA_TOKEN"]
    dependencies = fields.JSONField(
        default=[], description="依赖的 Provider Key 列表 (JSON Array)"
    )

    # === 分类信息 ===
    contract_type = fields.CharField(
        max_length=50,
        null=True,
        description="合约类型: registry, kyc, stablecoin, token, defi",
    )

    scope = fields.CharField(
        max_length=20,
        default="project",
        description="作用域: global (公共) / project (项目私有)",
    )

    # === 描述信息 ===
    description = fields.TextField(null=True, description="合约描述")

    display_name = fields.CharField(max_length=200, null=True, description="显示名称")

    version = fields.CharField(max_length=20, null=True, description="合约版本")

    # === 项目配置 ===
    dependency_type = fields.CharEnumField(
        DependencyType,
        default=DependencyType.BUSINESS,
        max_length=20,
        description="依赖类型: primary, required, business, optional",
    )

    is_primary = fields.BooleanField(
        default=False, description="是否为项目主合约 (入口合约)"
    )

    module = fields.CharField(
        max_length=128, null=True, description="合约所属模块，如 token, defi"
    )

    required_deps = fields.JSONField(
        default=[], description="必须依赖的 Provider Key 列表"
    )

    optional_deps = fields.JSONField(
        default=[], description="可选依赖的 Provider Key 列表"
    )

    deploy_order = fields.IntField(
        default=100, description="部署顺序，数值越小越先部署"
    )

    allow_zero_address = fields.BooleanField(
        default=False, description="是否允许零地址依赖 (用于可选依赖)"
    )

    environments = fields.JSONField(
        default=[], description="支持的环境列表，如 ['hardhat', 'sepolia', 'mainnet']"
    )

    production_address = fields.CharField(
        max_length=64, null=True, description="生产环境预设地址 (如有)"
    )

    class Meta:
        table = "contract_config"
        indexes = [
            ("project_name", "deploy_order"),
        ]

    def __str__(self) -> str:
        return f"ContractConfig({self.contract_name}, project={self.project_name})"

    def __repr__(self) -> str:
        return (
            f"<ContractConfig(id={self.id}, contract_name={self.contract_name}, "
            f"project_name={self.project_name}, dependency_type={self.dependency_type})>"
        )

    # === 属性方法 ===

    @property
    def has_dependencies(self) -> bool:
        """是否有依赖"""
        return bool(self.dependencies)

    @property
    def dependency_count(self) -> int:
        """依赖数量"""
        return len(self.dependencies) if self.dependencies else 0

    @property
    def all_deps(self) -> Sequence[str]:
        """获取所有依赖 (required + optional)"""
        required = self.required_deps if self.required_deps else []
        optional = self.optional_deps if self.optional_deps else []
        return list(set(required + optional))

    @property
    def is_global(self) -> bool:
        """是否为全局合约"""
        return self.scope == "global"

    @property
    def is_project_scoped(self) -> bool:
        """是否为项目专属合约"""
        return self.scope == "project"

    # === 辅助方法 ===

    def get_required_deps(self) -> Sequence[str]:
        """获取必须依赖列表"""
        return self.required_deps if self.required_deps else []

    def get_optional_deps(self) -> Sequence[str]:
        """获取可选依赖列表"""
        return self.optional_deps if self.optional_deps else []

    def is_supported_environment(self, env: str) -> bool:
        """检查是否支持指定环境"""
        if not self.environments:
            return True  # 空列表表示支持所有环境
        return env in self.environments

    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "id": self.id,
            "contract_name": self.contract_name,
            "project_name": self.project_name,
            "provider_key": self.provider_key,
            "provider_key_hash": self.provider_key_hash,
            "dependencies": self.dependencies,
            "contract_type": self.contract_type,
            "scope": self.scope,
            "description": self.description,
            "display_name": self.display_name,
            "version": self.version,
            "dependency_type": self.dependency_type.value
            if self.dependency_type
            else None,
            "is_primary": self.is_primary,
            "module": self.module,
            "required_deps": self.required_deps,
            "optional_deps": self.optional_deps,
            "deploy_order": self.deploy_order,
            "allow_zero_address": self.allow_zero_address,
            "environments": self.environments,
            "production_address": self.production_address,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    @classmethod
    async def get_by_name(cls, contract_name: str) -> Optional["ContractConfig"]:
        """通过合约名称获取配置"""
        return await cls.filter(contract_name=contract_name).first()

    @classmethod
    async def get_by_project(cls, project_name: str) -> Sequence["ContractConfig"]:
        """获取项目的所有合约配置"""
        return await cls.filter(project_name=project_name).order_by("deploy_order")

    @classmethod
    async def get_primary_contract(
        cls, project_name: str
    ) -> Optional["ContractConfig"]:
        """获取项目的主合约配置"""
        return await cls.filter(project_name=project_name, is_primary=True).first()

    @classmethod
    async def get_by_provider_key(cls, provider_key: str) -> Optional["ContractConfig"]:
        """通过 Provider Key 获取配置"""
        return await cls.filter(provider_key=provider_key).first()

    @classmethod
    async def get_global_contracts(cls) -> Sequence["ContractConfig"]:
        """获取所有全局合约配置"""
        return await cls.filter(scope="global").order_by("deploy_order")

    @classmethod
    async def get_by_dependency_type(
        cls, project_name: str, dependency_type: DependencyType
    ) -> Sequence["ContractConfig"]:
        """获取项目中指定依赖类型的合约配置"""
        return await cls.filter(
            project_name=project_name, dependency_type=dependency_type
        ).order_by("deploy_order")
