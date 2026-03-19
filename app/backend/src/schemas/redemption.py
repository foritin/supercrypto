"""
Redemption Domain - Pydantic Schemas
 Treasury Multisig Redemption schemas
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from src.schemas.base import IDMixin, PaginationParams, TimestampMixin
from src.schemas.enums.redemption import RedemptionEventType, RedemptionStatus

# ============ Request Schemas ============


class RedemptionRequestCreate(BaseModel):
    """创建赎回请求"""

    subscription_id: int = Field(..., description="认购ID")


class RedemptionSignatureRequest(BaseModel):
    """提交签名请求"""

    tx_hash: str = Field(..., min_length=10, description="签名交易哈希")


class RedemptionRejectRequest(BaseModel):
    """拒绝赎回请求"""

    reason: Optional[str] = Field(None, max_length=500, description="拒绝原因")


class RedemptionListQuery(PaginationParams):
    """赎回列表查询参数"""

    status: Optional[RedemptionStatus] = Field(None, description="状态筛选")


# ============ Response Schemas ============


class RedemptionSignatureResponse(BaseModel):
    """签名记录响应"""

    id: int
    signer_address: str
    signed_at: datetime
    tx_hash: str

    model_config = ConfigDict(from_attributes=True)


class RedemptionRequestResponse(BaseModel, IDMixin, TimestampMixin):
    """赎回请求响应"""

    subscription_id: int
    wallet_address: str
    asset_id: int
    asset_name: Optional[str] = None
    asset_symbol: Optional[str] = None
    principal: float
    interest: float
    total_amount: float
    proposal_id: Optional[int] = None
    proposal_tx_hash: Optional[str] = None
    status: RedemptionStatus
    executed_at: Optional[datetime] = None
    execute_tx_hash: Optional[str] = None
    environment: str
    signatures: List[RedemptionSignatureResponse] = []
    signature_count: int = 0
    required_signatures: int = 2  # Default 2/3 threshold

    model_config = ConfigDict(from_attributes=True)


class PaginatedRedemptionResponse(BaseModel):
    """分页赎回响应"""

    items: List[RedemptionRequestResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class RedemptionQueueItemResponse(BaseModel):
    """赎回队列项响应 (Admin view)"""

    id: int
    subscription_id: int
    wallet_address: str
    asset_name: Optional[str] = None
    asset_symbol: Optional[str] = None
    principal: float
    interest: float
    total_amount: float
    status: RedemptionStatus
    proposal_id: Optional[int] = None
    created_at: datetime
    signature_count: int
    required_signatures: int

    model_config = ConfigDict(from_attributes=True)


class PaginatedRedemptionQueueResponse(BaseModel):
    """分页赎回队列响应"""

    items: List[RedemptionQueueItemResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class SignerInfoResponse(BaseModel):
    """签名者信息响应"""

    address: str
    has_signed: bool
    signed_at: Optional[datetime] = None
    tx_hash: Optional[str] = None


class RedemptionEventResponse(BaseModel):
    """赎回事件响应"""

    id: int
    event_type: RedemptionEventType
    status: Optional[RedemptionStatus] = None
    actor_address: Optional[str] = None
    tx_hash: Optional[str] = None
    message: Optional[str] = None
    metadata: Optional[dict] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RedemptionDetailResponse(BaseModel):
    """赎回详情响应"""

    id: int
    subscription_id: int
    wallet_address: str
    asset_id: int
    asset_name: Optional[str] = None
    asset_symbol: Optional[str] = None
    principal: float
    interest: float
    total_amount: float
    proposal_id: Optional[int] = None
    proposal_tx_hash: Optional[str] = None
    status: RedemptionStatus
    executed_at: Optional[datetime] = None
    execute_tx_hash: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    environment: str
    signers: List[SignerInfoResponse] = []
    signature_count: int
    required_signatures: int
    rejection_reason: Optional[str] = None
    events: List[RedemptionEventResponse] = []

    model_config = ConfigDict(from_attributes=True)


# ============ Treasury/Dev Tools Schemas ============


class TreasuryInitRequest(BaseModel):
    """初始化 TreasuryMultisig 请求"""

    signer_addresses: List[str] = Field(
        ..., min_length=3, max_length=10, description="多签成员地址列表 (至少3个)"
    )
    required_signatures: int = Field(
        default=2, ge=2, le=10, description="所需签名数阈值"
    )


class TreasuryInitPrepareResponse(BaseModel):
    """初始化 TreasuryMultisig prepare 响应（前端钱包签名）"""

    contract_address: str
    function_name: str
    abi: list
    signer_addresses: List[str]
    required_signatures: int


class TreasuryInitConfirmRequest(BaseModel):
    """初始化 TreasuryMultisig confirm 请求"""

    signer_addresses: List[str] = Field(
        ..., min_length=3, max_length=10, description="多签成员地址列表 (至少3个)"
    )
    required_signatures: int = Field(
        default=2, ge=2, le=10, description="所需签名数阈值"
    )
    tx_hash: str = Field(..., min_length=10, description="链上交易哈希")


class TreasuryInitResponse(BaseModel):
    """初始化 TreasuryMultisig 响应"""

    contract_address: str
    tx_hash: str
    signer_count: int
    required_signatures: int


class TreasuryConfigResponse(BaseModel):
    """Treasury 配置响应"""

    contract_address: Optional[str] = None
    signers: List[str] = []
    required_signatures: int = 0
    threshold_ratio: str = "0/0"
    is_initialized: bool = False


class UpdateSignersRequest(BaseModel):
    """更新签名者请求"""

    signer_addresses: List[str] = Field(
        ..., min_length=3, max_length=10, description="新的多签成员地址列表"
    )
    required_signatures: int = Field(
        default=2, ge=2, le=10, description="新的所需签名数阈值"
    )


class SignerUpdateResponse(BaseModel):
    """更新签名者响应"""

    success: bool
    tx_hash: str
    signers: List[str]
    required_signatures: int


class MultisigStatusResponse(BaseModel):
    """多签状态响应"""

    contract_address: Optional[str] = None
    signers: List[SignerInfoResponse] = []
    signer_count: int
    required_signatures: int
    is_initialized: bool = False


class TreasuryStatsResponse(BaseModel):
    """国库统计响应"""

    total_requests: int
    pending_count: int
    approved_count: int
    executed_count: int
    rejected_count: int
    total_redeemed_amount: float
    average_signature_time_hours: Optional[float] = None


class TreasurySignRequest(BaseModel):
    """国库签名请求"""

    tx_hash: str = Field(..., description="链上签名交易哈希")


class TreasuryExecuteRequest(BaseModel):
    """国库执行请求"""

    tx_hash: str = Field(..., description="链上执行交易哈希")
