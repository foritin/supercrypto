"""
合约模型
"""

from tortoise import fields

from src.models.base import (
    AbstractModel,
    TimestampMixin,
)
from src.shared.schemas.enums import (
    ContractScope,
    ContractStatus,
    ContractType,
    NetWork,
)


class Contract(AbstractModel, TimestampMixin):
    """
    合约模型

    chain_id 常见值:
    - 1: Ethereum Mainnet
    - 11155111: Sepolia
    - 31337: Hardhat/Localhost
    - 137: Polygon
    - 42161: Arbitrum
    - 10: Optimism
    - 8453: Base

    分类维度:
    - scope: 作用域 (GLOBAL/PROJECT)
    - contract_type: 功能类型 (REGISTRY/KYC/STABLECOIN/TOKEN/DEFI/...)
    """

    name = fields.CharField(max_length=255, description="合约名称")
    address = fields.CharField(max_length=255, description="合约地址", unique=True)
    deployer_address = fields.CharField(max_length=255, description="部署者地址")
    network = fields.CharEnumField(NetWork, max_length=255, description="网络类型")
    # 使用 BigIntField 而非 IntEnumField，因为 chain_id 可能很大 (如 Sepolia=11155111)
    chain_id = fields.BigIntField(description="链ID (EIP-155)")

    # 分类字段 (双维度)
    scope = fields.CharEnumField(
        ContractScope,
        max_length=50,
        description="作用域",
        default=ContractScope.GLOBAL,
    )
    contract_type = fields.CharEnumField(
        ContractType,
        max_length=50,
        description="功能类型",
        default=ContractType.UNKNOWN,
    )

    project_name = fields.CharField(max_length=255, description="项目名称")
    tx_hash = fields.CharField(max_length=255, description="交易哈希")
    abi_path = fields.CharField(
        max_length=255, description="ABI 文件路径", default="", nullable=True
    )
    status = fields.CharEnumField(
        ContractStatus,
        max_length=255,
        description="合约状态",
    )

    class Meta:
        table = "contract"
        table_description = "合约表"
        unique_together = [("name", "chain_id")]
        ordering = ["name", "chain_id"]

    def __str__(self):
        return f"{self.name} ({self.chain_id})"
