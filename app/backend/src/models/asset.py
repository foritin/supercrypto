"""
RWA 资产模型
"""
from enum import Enum
from decimal import Decimal
from tortoise import fields
from src.models.base import AbstractModel, TimestampMixin


class AssetStatus(str, Enum):
    """资产状态枚举"""
    ACTIVE = "active"         # 可认购
    PAUSED = "paused"         # 已暂停
    SOLD_OUT = "sold_out"     # 已售罄
    CLOSED = "closed"         # 已关闭


class AssetType(str, Enum):
    """资产类型枚举"""
    REAL_ESTATE = "real_estate"   # 房地产
    BOND = "bond"                 # 债券
    COMMODITY = "commodity"       # 大宗商品
    EQUITY = "equity"             # 股权
    OTHER = "other"               # 其他


class Asset(AbstractModel, TimestampMixin):
    """RWA 资产表"""
    
    # 基本信息
    name = fields.CharField(max_length=200, description="资产名称")
    symbol = fields.CharField(max_length=20, description="代币符号")
    description = fields.TextField(null=True, description="资产描述")
    asset_type = fields.CharEnumField(
        AssetType,
        max_length=20,
        default=AssetType.REAL_ESTATE,
        description="资产类型"
    )
    
    # 图片和文档
    image_url = fields.CharField(max_length=500, null=True, description="资产图片URL")
    document_url = fields.CharField(max_length=500, null=True, description="相关文档URL")
    
    # 地理位置 (适用于房地产类)
    location = fields.CharField(max_length=300, null=True, description="资产位置/地址")
    
    # 财务信息
    current_price = fields.DecimalField(
        max_digits=36,
        decimal_places=18,
        default=0,
        description="当前预言机价格 (USD)"
    )
    price_updated_at = fields.DatetimeField(null=True, description="价格最后更新时间")
    
    # 募资信息
    total_supply = fields.DecimalField(
        max_digits=36,
        decimal_places=18,
        default=0,
        description="总募资额 (Token数量)"
    )
    subscribed_amount = fields.DecimalField(
        max_digits=36,
        decimal_places=18,
        default=0,
        description="已认购额"
    )
    min_subscription = fields.DecimalField(
        max_digits=36,
        decimal_places=18,
        default=100,
        description="最小认购金额"
    )
    
    # APY 配置 (年化收益率，以百分比存储，如 10.5 表示 10.5%)
    apy_3m = fields.DecimalField(
        max_digits=10,
        decimal_places=4,
        default=0,
        description="3个月锁定期 APY (%)"
    )
    apy_6m = fields.DecimalField(
        max_digits=10,
        decimal_places=4,
        default=0,
        description="6个月锁定期 APY (%)"
    )
    apy_12m = fields.DecimalField(
        max_digits=10,
        decimal_places=4,
        default=0,
        description="12个月锁定期 APY (%)"
    )
    
    # 合约绑定
    project = fields.CharField(max_length=50, null=True, description="关联的项目标识 (deploy_info.project)")
    # 主合约地址（快速访问，避免每次都查关联表）
    contract_address = fields.CharField(max_length=128, null=True, description="主 RWA Token 合约地址")
    
    # 状态
    status = fields.CharEnumField(
        AssetStatus,
        max_length=20,
        default=AssetStatus.ACTIVE,
        description="资产状态"
    )
    
    # 环境区分
    environment = fields.CharField(max_length=20, default="local", description="环境标识")
    
    # 创建者
    created_by = fields.IntField(null=True, description="创建人ID")
    
    class Meta:
        table = "asset"
        table_description = "RWA 资产表"
        indexes = [
            ("status",),
            ("asset_type",),
            ("environment",),
            ("created_at",)
        ]
    
    def __str__(self):
        return f"Asset(name={self.name}, status={self.status})"
    
    @property
    def remaining_amount(self) -> Decimal:
        """剩余可认购额度"""
        return self.total_supply - self.subscribed_amount
    
    @property
    def subscription_progress(self) -> float:
        """认购进度 (0-100)"""
        if self.total_supply == 0:
            return 0
        return float(self.subscribed_amount / self.total_supply * 100)
    
    @property
    def is_available(self) -> bool:
        """是否可认购"""
        return (
            self.status == AssetStatus.ACTIVE and
            self.remaining_amount > 0
        )


class AssetPriceHistory(AbstractModel, TimestampMixin):
    """资产价格历史记录"""
    
    asset = fields.ForeignKeyField(
        "models.Asset",
        related_name="price_history",
        on_delete=fields.CASCADE,
        description="关联资产"
    )
    price = fields.DecimalField(
        max_digits=36,
        decimal_places=18,
        description="价格 (USD)"
    )
    source = fields.CharField(max_length=100, null=True, description="价格来源")
    
    class Meta:
        table = "asset_price_history"
        table_description = "资产价格历史表"
        indexes = [
            ("asset_id", "created_at"),
        ]
    
    def __str__(self):
        return f"PriceHistory(asset_id={self.asset_id}, price={self.price})"


class AssetContractBinding(AbstractModel, TimestampMixin):
    """
    资产-合约绑定关联表
    
    一个 Asset 可以绑定多个合约（Common + 项目合约）
    支持通过合约地址反查关联的 Asset
    """
    
    asset = fields.ForeignKeyField(
        "models.Asset",
        related_name="contract_bindings",
        on_delete=fields.CASCADE,
        description="关联资产"
    )
    
    # 合约信息
    contract_name = fields.CharField(max_length=100, description="合约名称")
    contract_address = fields.CharField(max_length=128, index=True, description="合约地址")
    contract_type = fields.CharField(
        max_length=20,
        default="project",
        description="合约类型: common / project"
    )
    
    # 是否为主合约（RWA Token）
    is_primary = fields.BooleanField(default=False, description="是否为主合约")
    
    class Meta:
        table = "asset_contract_binding"
        table_description = "资产-合约绑定关联表"
        unique_together = [
            ("asset_id", "contract_name"),  # 同一资产不能重复绑定同名合约
        ]
        indexes = [
            ("contract_address",),  # 支持通过合约地址反查
            ("contract_type",),
        ]
    
    def __str__(self):
        return f"AssetContract(asset_id={self.asset_id}, contract={self.contract_name})"

