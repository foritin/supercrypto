"""
Asset Domain - Pydantic Schemas
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field

from src.shared.schemas.enums import AssetStatus, AssetType


class AssetBase(BaseModel):
    """资产基础信息"""

    name: str = Field(..., max_length=200, description="资产名称")
    symbol: str = Field(..., max_length=20, description="代币符号")
    description: Optional[str] = Field(None, description="资产描述")
    asset_type: AssetType = Field(default=AssetType.REAL_ESTATE, description="资产类型")
    image_url: Optional[str] = Field(None, max_length=500, description="资产图片URL")
    document_url: Optional[str] = Field(None, max_length=500, description="文档URL")
    location: Optional[str] = Field(None, max_length=300, description="资产位置")


class AssetCreateRequest(AssetBase):
    """创建资产请求"""

    total_supply: Decimal = Field(..., ge=0, description="总募资额")
    min_subscription: Decimal = Field(default=100, ge=0, description="最小认购金额")
    current_price: Decimal = Field(default=0, ge=0, description="当前价格")
    apy_3m: Decimal = Field(default=0, ge=0, le=100, description="3个月APY(%)")
    apy_6m: Decimal = Field(default=0, ge=0, le=100, description="6个月APY(%)")
    apy_12m: Decimal = Field(default=0, ge=0, le=100, description="12个月APY(%)")
    # 合约绑定（支持多选）
    project: Optional[str] = Field(None, max_length=50, description="项目标识")
    bound_contracts: Optional[List[dict]] = Field(
        None,
        description="绑定的合约列表 [{name, address, type, is_primary}]",
    )
    contract_address: Optional[str] = Field(
        None, max_length=128, description="主 RWA Token 合约地址"
    )


class AssetUpdateRequest(BaseModel):
    """更新资产请求"""

    name: Optional[str] = Field(None, max_length=200)
    symbol: Optional[str] = Field(None, max_length=20)
    description: Optional[str] = None
    asset_type: Optional[AssetType] = None
    image_url: Optional[str] = None
    document_url: Optional[str] = None
    location: Optional[str] = None
    total_supply: Optional[Decimal] = Field(None, ge=0)
    min_subscription: Optional[Decimal] = Field(None, ge=0)
    current_price: Optional[Decimal] = Field(None, ge=0)
    apy_3m: Optional[Decimal] = Field(None, ge=0, le=100)
    apy_6m: Optional[Decimal] = Field(None, ge=0, le=100)
    apy_12m: Optional[Decimal] = Field(None, ge=0, le=100)
    # 合约绑定（支持多选）
    project: Optional[str] = None
    bound_contracts: Optional[List[dict]] = None
    contract_address: Optional[str] = None


class AssetStatusUpdateRequest(BaseModel):
    """更新资产状态请求"""

    status: AssetStatus = Field(..., description="新状态")


class AssetListItem(BaseModel):
    """资产列表项"""

    id: int
    name: str
    symbol: str
    asset_type: AssetType
    image_url: Optional[str]
    cover_image_url: Optional[str] = Field(
        None, description="封面图预签名 URL（从 AssetMedia 获取）"
    )
    current_price: float
    apy_3m: float
    apy_6m: float
    apy_12m: float
    status: AssetStatus
    total_supply: float
    subscribed_amount: float
    subscription_progress: float
    is_available: bool

    class Config:
        from_attributes = True


class AssetDetailResponse(BaseModel):
    """资产详情响应"""

    id: int
    name: str
    symbol: str
    description: Optional[str]
    asset_type: AssetType
    image_url: Optional[str]
    document_url: Optional[str]
    location: Optional[str]

    # 财务信息
    current_price: float
    price_updated_at: Optional[datetime]
    total_supply: float
    subscribed_amount: float
    min_subscription: float
    remaining_amount: float
    subscription_progress: float

    # APY
    apy_3m: float
    apy_6m: float
    apy_12m: float

    # 合约绑定
    project: Optional[str]
    bound_contracts: Optional[List[dict]] = None
    contract_address: Optional[str]

    # 状态
    status: AssetStatus
    is_available: bool
    environment: str

    # 可见性状态（Admin API）
    is_visible: Optional[bool] = Field(
        None, description="是否对用户可见（仅 Admin API 返回）"
    )
    visibility_issues: Optional[List[str]] = Field(
        None, description="不可见原因列表（仅 Admin API 返回）"
    )

    # 时间
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AssetPriceHistoryItem(BaseModel):
    """价格历史项"""

    id: int
    price: float
    source: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AssetListQuery(BaseModel):
    """资产列表查询参数"""

    status: Optional[AssetStatus] = None
    asset_type: Optional[AssetType] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=10, ge=1, le=100)


class ContractBindingItem(BaseModel):
    """合约绑定项"""

    contract_name: str = Field(..., description="合约名称")
    contract_address: str = Field(..., max_length=128, description="合约地址")
    contract_type: str = Field(
        default="project", description="合约类型: common / project"
    )
    is_primary: bool = Field(default=False, description="是否为主合约")


class ContractBindingResponse(BaseModel):
    """合约绑定响应"""

    id: int
    contract_name: str
    contract_address: str
    contract_type: str
    is_primary: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ============ 项目绑定相关 Schema ============


class BindProjectRequest(BaseModel):
    """
    按项目绑定合约请求（简化版）

    变更说明:
    - 移除 set_primary 参数，主合约由 Contract 表的 is_primary 字段决定
    - 只绑定 PROJECT scope 合约，不绑定 GLOBAL scope 合约
    - 绑定时自动从主合约获取 symbol 和 address 填充到 Asset
    """

    project: str = Field(..., description="项目标识 (如 vanke, common)")
    contract_names: Optional[List[str]] = Field(
        None, description="要绑定的合约名称列表，为空则绑定该项目下所有可用的 PROJECT scope 合约"
    )


class UnbindContractsRequest(BaseModel):
    """解绑合约请求"""

    contract_names: Optional[List[str]] = Field(
        None, description="要解绑的合约名称列表"
    )
    project: Optional[str] = Field(None, description="要解绑的项目标识")
    unbind_all: bool = Field(default=False, description="是否解绑所有合约")


class ContractBindingStatus(BaseModel):
    """合约绑定状态"""

    contract_name: str
    contract_address: str
    contract_type: str  # common, mock, exclusive
    is_available: bool  # 是否可绑定
    bound_to_asset: Optional[str] = None  # 如果已被绑定，显示资产名称
    bound_to_asset_id: Optional[int] = None


class ProjectContractInfo(BaseModel):
    """项目合约信息（含主合约和就绪状态）"""

    project: str
    contract_count: int
    contracts: List[ContractBindingStatus]  # 改为详细合约信息

    # 主合约信息 (Requirements 3.1, 3.2)
    has_primary: bool = Field(default=False, description="是否有主合约")
    primary_contract_symbol: Optional[str] = Field(
        None, description="主合约 Symbol"
    )

    # 就绪状态 (Requirements 7.3, 7.4, 7.7)
    is_ready: bool = Field(default=False, description="项目是否就绪")


class ProjectListResponse(BaseModel):
    """可绑定项目列表响应"""

    projects: List[ProjectContractInfo]
