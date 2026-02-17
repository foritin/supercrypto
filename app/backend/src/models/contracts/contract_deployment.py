"""
Contract Deployment Model
合约部署记录模型

整合 Contract 和 ContractDeploymentStatus 的功能，提供统一的合约部署记录管理。

数据来源:
- 部署脚本 (scripts/deploy/projects/*.py) 部署合约时写入
- 数据迁移脚本从旧表 (Contract, ContractDeploymentStatus) 迁移的数据

字段说明:
- 关联配置: config_id (外键关联 ContractConfig)
- 部署信息: name, address, deployer_address, network, chain_id
- 分类信息: scope, contract_type, project_name
- 部署详情: tx_hash, abi_path, status
- 主合约标记: is_primary, symbol
- 状态信息: bindings, deploy_block
"""

from typing import TYPE_CHECKING, Optional, Sequence

from tortoise import fields

from src.models.base import AbstractModel, TimestampMixin
from src.schemas.enums import (
    ContractScope,
    ContractStatus,
    ContractType,
    Network,
)

if TYPE_CHECKING:
    from src.models.contracts.contract_config import ContractConfig


class ContractDeployment(AbstractModel, TimestampMixin):
    """
    合约部署记录表 - 整合部署信息和状态

    存储合约的部署记录，包括：
    - 部署基本信息 (地址、网络、链ID)
    - 部署者信息
    - 合约分类 (作用域、类型)
    - 部署状态和详情
    - 依赖绑定状态

    数据写入时机:
    - 部署脚本 (deploy_*.py) 部署合约时自动写入
    - 数据迁移脚本一次性导入现有部署记录

    数据来源:
    - 原 Contract 表: 部署基本信息
    - 原 ContractDeploymentStatus 表: 绑定状态和区块信息
    """

    # === 关联配置 ===
    # 外键字段，关联 ContractConfig 表
    # null=True 允许为空，兼容迁移过程中的数据
    config: fields.ForeignKeyNullableRelation["ContractConfig"] = (
        fields.ForeignKeyField(
            "models.ContractConfig",
            related_name="deployments",
            on_delete=fields.SET_NULL,
            null=True,
            description="关联的合约配置",
        )
    )
    # config_id 字段由 Tortoise ORM 自动生成
    config_id: Optional[int]

    # === 部署信息 (来自 Contract) ===
    name = fields.CharField(max_length=255, description="合约名称")
    address = fields.CharField(max_length=255, unique=True, description="合约地址")
    deployer_address = fields.CharField(max_length=255, description="部署者地址")
    network = fields.CharEnumField(Network, max_length=255, description="网络类型")
    # 使用 BigIntField 而非 IntEnumField，因为 chain_id 可能很大 (如 Sepolia=11155111)
    chain_id = fields.BigIntField(description="链ID (EIP-155)")

    # === 分类 (来自 Contract) ===
    scope = fields.CharEnumField(
        ContractScope,
        max_length=50,
        default=ContractScope.GLOBAL,
        description="作用域: global (公共) / project (项目私有)",
    )
    contract_type = fields.CharEnumField(
        ContractType,
        max_length=50,
        default=ContractType.UNKNOWN,
        description="功能类型: registry, kyc, stablecoin, token, defi 等",
    )
    project_name = fields.CharField(max_length=255, description="项目名称")

    # === 部署详情 (来自 Contract) ===
    tx_hash = fields.CharField(max_length=255, description="部署交易哈希")
    abi_path = fields.CharField(max_length=255, null=True, description="ABI 文件路径")
    status = fields.CharEnumField(
        ContractStatus,
        max_length=255,
        default=ContractStatus.ACTIVE,
        description="合约状态: active, paused, deprecated, frozen",
    )

    # === 主合约标记 (来自 Contract) ===
    is_primary = fields.BooleanField(
        default=False,
        description="是否为项目主合约（RWA Token），每个项目只能有一个主合约",
    )
    symbol = fields.CharField(
        max_length=20,
        null=True,
        description="Token Symbol，用于标识代币符号",
    )

    # === 状态信息 (来自 ContractDeploymentStatus) ===
    bindings = fields.JSONField(
        null=True,
        description="依赖绑定状态，格式: {provider_key: bound_address}",
    )
    deploy_block = fields.BigIntField(
        null=True,
        description="部署区块号",
    )

    class Meta:
        table = "contract_deployment"
        table_description = "合约部署记录表"
        unique_together = [("name", "chain_id")]
        ordering = ["name", "chain_id"]

    def __str__(self) -> str:
        return f"ContractDeployment({self.name} @ {self.address[:10]}...)"

    def __repr__(self) -> str:
        return (
            f"<ContractDeployment(id={self.id}, name={self.name}, "
            f"address={self.address}, network={self.network}, chain_id={self.chain_id})>"
        )

    # === 属性方法 ===

    @property
    def short_address(self) -> str:
        """获取缩短的地址显示"""
        if len(self.address) > 10:
            return f"{self.address[:6]}...{self.address[-4:]}"
        return self.address

    @property
    def has_bindings(self) -> bool:
        """是否有依赖绑定"""
        return bool(self.bindings)

    @property
    def binding_count(self) -> int:
        """绑定数量"""
        return len(self.bindings) if self.bindings else 0

    @property
    def is_active(self) -> bool:
        """是否为活跃状态"""
        return self.status == ContractStatus.ACTIVE

    @property
    def is_global(self) -> bool:
        """是否为全局合约"""
        return self.scope == ContractScope.GLOBAL

    @property
    def is_project_scoped(self) -> bool:
        """是否为项目专属合约"""
        return self.scope == ContractScope.PROJECT

    # === 辅助方法 ===

    def get_binding(self, provider_key: str) -> Optional[str]:
        """获取指定 Provider Key 的绑定地址"""
        if not self.bindings:
            return None
        return self.bindings.get(provider_key)

    def set_binding(self, provider_key: str, address: str) -> None:
        """设置指定 Provider Key 的绑定地址"""
        if self.bindings is None:
            self.bindings = {}
        self.bindings[provider_key] = address

    def remove_binding(self, provider_key: str) -> bool:
        """移除指定 Provider Key 的绑定"""
        if self.bindings and provider_key in self.bindings:
            del self.bindings[provider_key]
            return True
        return False

    def to_dict(self) -> dict:
        """转换为字典"""
        # config_id 在模型保存后由 Tortoise ORM 自动生成
        config_id = getattr(self, "config_id", None)
        return {
            "id": self.id,
            "config_id": config_id,
            "name": self.name,
            "address": self.address,
            "deployer_address": self.deployer_address,
            "network": self.network.value if self.network else None,
            "chain_id": self.chain_id,
            "scope": self.scope.value if self.scope else None,
            "contract_type": self.contract_type.value if self.contract_type else None,
            "project_name": self.project_name,
            "tx_hash": self.tx_hash,
            "abi_path": self.abi_path,
            "status": self.status.value if self.status else None,
            "is_primary": self.is_primary,
            "symbol": self.symbol,
            "bindings": self.bindings,
            "deploy_block": self.deploy_block,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    # === 类方法 ===

    @classmethod
    async def get_by_address(cls, address: str) -> Optional["ContractDeployment"]:
        """通过合约地址获取部署记录"""
        return await cls.filter(address=address).first()

    @classmethod
    async def get_by_name_and_chain(
        cls, name: str, chain_id: int
    ) -> Optional["ContractDeployment"]:
        """通过合约名称和链ID获取部署记录"""
        return await cls.filter(name=name, chain_id=chain_id).first()

    @classmethod
    async def get_by_project(
        cls, project_name: str, chain_id: Optional[int] = None
    ) -> Sequence["ContractDeployment"]:
        """获取项目的所有部署记录"""
        query = cls.filter(project_name=project_name)
        if chain_id is not None:
            query = query.filter(chain_id=chain_id)
        return await query.order_by("name")

    @classmethod
    async def get_by_network(cls, network: Network) -> Sequence["ContractDeployment"]:
        """获取指定网络的所有部署记录"""
        return await cls.filter(network=network).order_by("name")

    @classmethod
    async def get_primary_contract(
        cls, project_name: str, chain_id: int
    ) -> Optional["ContractDeployment"]:
        """获取项目的主合约部署记录"""
        return await cls.filter(
            project_name=project_name, chain_id=chain_id, is_primary=True
        ).first()

    @classmethod
    async def get_active_contracts(
        cls, chain_id: Optional[int] = None
    ) -> Sequence["ContractDeployment"]:
        """获取所有活跃状态的合约"""
        query = cls.filter(status=ContractStatus.ACTIVE)
        if chain_id is not None:
            query = query.filter(chain_id=chain_id)
        return await query.order_by("name")

    @classmethod
    async def get_global_contracts(
        cls, chain_id: Optional[int] = None
    ) -> Sequence["ContractDeployment"]:
        """获取所有全局合约"""
        query = cls.filter(scope=ContractScope.GLOBAL)
        if chain_id is not None:
            query = query.filter(chain_id=chain_id)
        return await query.order_by("name")

    @classmethod
    async def get_by_contract_type(
        cls, contract_type: ContractType, chain_id: Optional[int] = None
    ) -> Sequence["ContractDeployment"]:
        """获取指定类型的所有合约"""
        query = cls.filter(contract_type=contract_type)
        if chain_id is not None:
            query = query.filter(chain_id=chain_id)
        return await query.order_by("name")

    @classmethod
    async def exists_by_address(cls, address: str) -> bool:
        """检查指定地址的合约是否存在"""
        return await cls.filter(address=address).exists()
