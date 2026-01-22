"""
项目合约注册表模型

Epic 10: 项目合约注册表

包含:
- ProjectContractConfig: 合约配置（从 YAML 同步）
- ContractDeploymentStatus: 合约部署状态（按网络）
"""

from tortoise import fields

from src.models.base import AbstractModel, TimestampMixin
from src.shared.schemas.enums.contract import (
    ContractRegistryStatus,
    DependencyType,
)


class ProjectContractConfig(AbstractModel, TimestampMixin):
    """
    项目合约配置

    存储从 config.yaml 或 config/projects/*.yaml 同步的合约配置
    每个项目的每个合约一条记录
    """

    # 项目标识
    project_name = fields.CharField(
        max_length=64,
        description="项目名称",
        index=True,
    )
    contract_name = fields.CharField(
        max_length=64,
        description="合约名称",
        index=True,
    )

    # 合约描述
    description = fields.TextField(
        null=True,
        description="合约描述",
    )

    # 依赖类型
    dependency_type = fields.CharEnumField(
        DependencyType,
        default=DependencyType.BUSINESS,
        description="依赖类型: primary/required/business/optional",
    )

    # 是否为主合约
    is_primary = fields.BooleanField(
        default=False,
        description="是否为项目主合约",
    )

    # 合约模块路径 (用于 ape compile)
    module = fields.CharField(
        max_length=128,
        null=True,
        description="合约模块路径",
    )

    # 依赖配置
    required_deps = fields.JSONField(
        default=list,
        description="必须依赖列表",
    )
    optional_deps = fields.JSONField(
        default=list,
        description="可选依赖列表",
    )

    # 部署顺序权重 (越小越先部署)
    deploy_order = fields.IntField(
        default=100,
        description="部署顺序权重",
    )

    # 是否允许零地址绑定
    allow_zero_address = fields.BooleanField(
        default=False,
        description="是否允许零地址绑定",
    )

    # 支持的环境列表
    environments = fields.JSONField(
        default=list,
        description="支持的环境列表: [local, test, production]",
    )

    # 生产环境固定地址
    production_address = fields.CharField(
        max_length=64,
        null=True,
        description="生产环境固定地址",
    )

    class Meta:
        table = "project_contract_configs"
        unique_together = (("project_name", "contract_name"),)
        ordering = ["project_name", "deploy_order", "contract_name"]

    def __str__(self):
        return f"{self.project_name}/{self.contract_name}"


class ContractDeploymentStatus(AbstractModel, TimestampMixin):
    """
    合约部署状态

    记录合约在各网络的部署状态和绑定信息
    每个合约配置在每个网络一条记录
    """

    # 关联配置
    config = fields.ForeignKeyField(
        "models.ProjectContractConfig",
        related_name="deployments",
        on_delete=fields.CASCADE,
        description="关联的合约配置",
    )

    # 网络
    network = fields.CharField(
        max_length=32,
        description="网络名称: local/sepolia/mainnet",
        index=True,
    )

    # 部署地址
    address = fields.CharField(
        max_length=64,
        null=True,
        description="部署地址",
    )

    # 状态
    status = fields.CharEnumField(
        ContractRegistryStatus,
        default=ContractRegistryStatus.REGISTERED,
        description="部署状态",
    )

    # 绑定信息 (JSON)
    # 格式: {dep_name: {address, is_bound, is_zero, last_synced}}
    bindings = fields.JSONField(
        null=True,
        description="依赖绑定信息",
    )

    # 部署交易哈希
    deploy_tx_hash = fields.CharField(
        max_length=128,
        null=True,
        description="部署交易哈希",
    )

    # 部署区块号
    deploy_block = fields.BigIntField(
        null=True,
        description="部署区块号",
    )

    class Meta:
        table = "contract_deployment_status"
        unique_together = (("config", "network"),)
        ordering = ["network", "-updated_at"]

    def __str__(self):
        return f"{self.config}@{self.network}"

    @property
    def is_deployed(self) -> bool:
        """是否已部署（有地址）"""
        return self.address is not None and self.address != ""
