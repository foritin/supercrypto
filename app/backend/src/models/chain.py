"""
区块链网络模型

定义支持的区块链网络配置，包含网络信息、RPC URL、区块浏览器等。
用于前端动态获取可用网络列表。
"""

from tortoise import fields

from src.models.base import AbstractModel, TimestampMixin


class Chain(AbstractModel, TimestampMixin):
    """
    区块链网络配置表

    存储支持的区块链网络信息，支持按环境（development/production）筛选。
    """

    # 基础信息
    chain_id = fields.IntField(
        unique=True, db_index=True, description="链 ID (如 1, 31337)"
    )
    name = fields.CharField(max_length=64, description="网络名称 (如 Ethereum)")
    display_name = fields.CharField(
        max_length=128, description="显示名称 (如 以太坊主网)"
    )

    # 原生代币信息
    symbol = fields.CharField(max_length=16, default="ETH", description="代币符号")
    decimals = fields.SmallIntField(default=18, description="代币精度")

    # RPC 配置
    rpc_url = fields.CharField(max_length=512, description="RPC URL")
    rpc_url_backup = fields.CharField(
        max_length=512, null=True, description="备用 RPC URL"
    )

    # 区块浏览器
    block_explorer = fields.CharField(
        max_length=256, null=True, description="区块浏览器 URL"
    )

    # 环境与状态
    environment = fields.CharField(
        max_length=20,
        default="development",
        db_index=True,
        description="环境: development / production / all",
    )
    is_testnet = fields.BooleanField(default=False, description="是否为测试网")
    is_enabled = fields.BooleanField(
        default=True, db_index=True, description="是否启用"
    )

    # 显示配置
    icon = fields.CharField(max_length=64, null=True, description="图标标识")
    sort_order = fields.SmallIntField(default=0, description="排序顺序")

    # 扩展配置 (JSON)
    metadata = fields.JSONField(null=True, description="扩展元数据")

    class Meta:
        table = "chains"
        ordering = ["sort_order", "chain_id"]

    def __str__(self):
        return f"{self.name} ({self.chain_id})"

    @classmethod
    async def get_by_chain_id(cls, chain_id: int):
        """根据链 ID 获取网络配置"""
        return await cls.filter(chain_id=chain_id, is_enabled=True).first()

    @classmethod
    async def get_enabled_chains(cls, environment: str | None = None):
        """
        获取启用的网络列表

        Args:
            environment: 环境筛选 (development/production)，为空时返回所有
        """
        query = cls.filter(is_enabled=True)
        if environment:
            # environment 为 'all' 的网络在任何环境下都显示
            query = query.filter(environment__in=[environment, "all"])
        return await query.order_by("sort_order", "chain_id").all()
