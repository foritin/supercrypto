"""
KYC Domain - Schema 定义
"""

from datetime import date, datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from src.shared.schemas.enums import IdType, KycStatus, OnChainSyncStatus
from src.shared.schemas.mixins import IDMixin, TimestampMixin


class KycStatusResponse(BaseModel):
    """KYC 状态响应"""

    wallet_address: str = Field(..., description="钱包地址")
    status: KycStatus = Field(..., description="KYC 状态")
    submitted_at: Optional[datetime] = Field(None, description="提交时间")
    reviewed_at: Optional[datetime] = Field(None, description="审核时间")
    reject_reason: Optional[str] = Field(None, description="拒绝原因")
    country_code: Optional[str] = Field(None, description="国家代码")
    is_accredited: bool = Field(False, description="是否为合格投资者")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "wallet_address": "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
                "status": "pending",
                "submitted_at": "2025-12-10T10:00:00Z",
                "reviewed_at": None,
                "reject_reason": None,
                "country_code": "US",
                "is_accredited": False,
            }
        }


# ========== 多证件支持 (2026-02-01) ==========


class KycDocumentInfo(BaseModel):
    """单个证件信息"""

    id_type: IdType = Field(..., description="证件类型")
    id_number: str = Field(
        ..., min_length=6, max_length=30, description="证件号 (明文)"
    )
    document_expiry: date = Field(..., description="证件有效期")
    id_front_url: str = Field(..., max_length=255, description="证件正面照片路径")
    id_back_url: Optional[str] = Field(
        None, max_length=255, description="证件背面照片路径 (护照可为空)"
    )

    @field_validator("id_number")
    @classmethod
    def validate_id_number(cls, v: str) -> str:
        """验证证件号格式"""
        v = v.strip()
        if len(v) < 6:
            raise ValueError("证件号长度不能少于6位")
        return v

    @field_validator("document_expiry")
    @classmethod
    def validate_document_expiry(cls, v: date) -> date:
        """验证证件有效期"""
        from datetime import date as date_type

        today = date_type.today()
        if v <= today:
            raise ValueError("证件已过期")
        return v

    @model_validator(mode="after")
    def validate_back_url(self) -> "KycDocumentInfo":
        """验证背面照片 - 非护照必须提供"""
        if self.id_type != IdType.PASSPORT and not self.id_back_url:
            raise ValueError(f"{self.id_type.value} 类型证件必须提供背面照片")
        return self


class KycApplyRequest(BaseModel):
    """KYC 申请请求 (多证件版本)"""

    wallet_address: str = Field(..., max_length=42, description="钱包地址")
    country_code: Optional[str] = Field(None, max_length=2, description="国家代码")

    # 基本信息
    full_name: str = Field(..., min_length=2, max_length=100, description="证件姓名")
    date_of_birth: date = Field(..., description="出生日期")

    # 多证件信息 (至少提供一种)
    documents: List[KycDocumentInfo] = Field(
        ..., min_length=1, max_length=3, description="证件列表 (1-3 种)"
    )

    # 自拍照片 (可选)
    selfie_url: Optional[str] = Field(
        None, max_length=255, description="手持证件自拍路径"
    )

    @field_validator("wallet_address")
    @classmethod
    def validate_address(cls, v: str) -> str:
        """验证并规范化钱包地址"""
        if not v.startswith("0x") or len(v) != 42:
            raise ValueError("Invalid wallet address format")
        return v.lower()

    @field_validator("country_code")
    @classmethod
    def validate_country_code(cls, v: Optional[str]) -> Optional[str]:
        """验证国家代码格式"""
        if v is not None:
            if len(v) != 2:
                raise ValueError(
                    "Country code must be 2 characters (ISO 3166-1 alpha-2)"
                )
            return v.upper()
        return v

    @field_validator("date_of_birth")
    @classmethod
    def validate_date_of_birth(cls, v: date) -> date:
        """验证出生日期范围"""
        from datetime import date as date_type

        today = date_type.today()
        # 年龄必须在 18-120 岁之间
        min_date = date_type(today.year - 120, 1, 1)
        max_date = date_type(today.year - 18, today.month, today.day)
        if v < min_date or v > max_date:
            raise ValueError("出生日期无效，用户年龄必须在 18-120 岁之间")
        return v

    @field_validator("documents")
    @classmethod
    def validate_documents(cls, v: List[KycDocumentInfo]) -> List[KycDocumentInfo]:
        """验证证件列表 - 不能有重复类型"""
        id_types = [doc.id_type for doc in v]
        if len(id_types) != len(set(id_types)):
            raise ValueError("不能提交重复类型的证件")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
                "country_code": "CN",
                "full_name": "张三",
                "date_of_birth": "1990-01-01",
                "documents": [
                    {
                        "id_type": "passport",
                        "id_number": "E12345678",
                        "document_expiry": "2030-01-01",
                        "id_front_url": "kyc/0x742d35.../passport_front_abc123.jpg",
                    },
                    {
                        "id_type": "id_card",
                        "id_number": "110101199001011234",
                        "document_expiry": "2035-01-01",
                        "id_front_url": "kyc/0x742d35.../id_card_front_def456.jpg",
                        "id_back_url": "kyc/0x742d35.../id_card_back_ghi789.jpg",
                    },
                ],
                "selfie_url": "kyc/0x742d35.../selfie_xyz123.jpg",
            }
        }


# ========== 响应 Schema ==========


class KycDocumentResponse(BaseModel):
    """证件信息响应"""

    id_type: str = Field(..., description="证件类型")
    id_number_last4: Optional[str] = Field(None, description="证件号后4位")
    document_expiry: Optional[date] = Field(None, description="证件有效期")
    has_front: bool = Field(False, description="是否上传正面")
    has_back: bool = Field(False, description="是否上传背面")

    class Config:
        from_attributes = True


class KycFullResponse(KycStatusResponse, IDMixin, TimestampMixin):
    """KYC 完整响应 (包含 ID 和时间戳)"""

    environment: str = Field(..., description="环境")
    reviewer_address: Optional[str] = Field(None, description="审核人钱包地址")
    external_kyc_id: Optional[str] = Field(None, description="第三方 KYC ID")

    # 基本信息
    full_name: Optional[str] = Field(None, description="证件姓名")
    date_of_birth: Optional[date] = Field(None, description="出生日期")

    # 多证件信息
    documents: List[KycDocumentResponse] = Field(
        default_factory=list, description="证件列表"
    )

    # 自拍照片
    has_selfie: bool = Field(False, description="是否上传手持自拍")

    # 旧字段 (向后兼容)
    id_type: Optional[str] = Field(None, description="[已废弃] 主证件类型")
    id_number_last4: Optional[str] = Field(None, description="[已废弃] 主证件号后4位")
    has_id_front: bool = Field(False, description="[已废弃] 是否上传证件正面")
    has_id_back: bool = Field(False, description="[已废弃] 是否上传证件背面")

    # 链上同步状态
    on_chain_sync_status: Optional[OnChainSyncStatus] = Field(
        None, description="链上同步状态"
    )
    on_chain_tx_hash: Optional[str] = Field(None, description="链上交易哈希")

    class Config:
        from_attributes = True


# ========== Story 2.9: 拒绝原因预设 ==========


class RejectReasonCode(str, Enum):
    """拒绝原因代码枚举"""

    BLURRY_PHOTO = "blurry_photo"  # 证件照片模糊
    EXPIRED_ID = "expired_id"  # 证件已过期
    UNCLEAR_SELFIE = "unclear_selfie"  # 手持照片不清晰
    INFO_MISMATCH = "info_mismatch"  # 信息不匹配
    INCOMPLETE_DOCS = "incomplete_docs"  # 文件不完整
    UNDERAGE = "underage"  # 未满 18 岁
    OTHER = "other"  # 其他原因


# 拒绝原因标签映射
REJECT_REASON_LABELS = {
    RejectReasonCode.BLURRY_PHOTO: "证件照片模糊，请重新上传清晰照片",
    RejectReasonCode.EXPIRED_ID: "证件已过期，请使用有效证件",
    RejectReasonCode.UNCLEAR_SELFIE: "手持证件照不清晰，请确保面部和证件信息可见",
    RejectReasonCode.INFO_MISMATCH: "提交的信息与证件不一致",
    RejectReasonCode.INCOMPLETE_DOCS: "缺少必要的证件文件",
    RejectReasonCode.UNDERAGE: "根据您的出生日期，您未满 18 岁",
    RejectReasonCode.OTHER: "其他原因",
}


class KycReviewRequest(BaseModel):
    """KYC 审核请求 (管理员用) - Story 2.9 增强版"""

    approved: bool = Field(..., description="是否通过")
    reject_reason_code: Optional[RejectReasonCode] = Field(
        None, description="拒绝原因代码"
    )
    reject_reason: Optional[str] = Field(None, max_length=500, description="拒绝原因")
    is_accredited: bool = Field(False, description="是否为合格投资者")

    @field_validator("reject_reason")
    @classmethod
    def validate_reject_reason(cls, v: Optional[str], info) -> Optional[str]:
        """拒绝时必须提供原因 (Code Review M4: 保留用户补充说明)"""
        values = info.data
        approved = values.get("approved", True)
        reject_code = values.get("reject_reason_code")

        if not approved:
            # 如果有预设原因代码且不是 OTHER
            if reject_code and reject_code != RejectReasonCode.OTHER:
                preset_reason = REJECT_REASON_LABELS.get(reject_code, "")
                # 如果用户提供了额外说明，附加在预设原因后面
                if v and v.strip():
                    return f"{preset_reason} (补充: {v.strip()})"
                return preset_reason
            # 如果是 OTHER 或没有预设，必须提供自定义原因
            if not v:
                raise ValueError("Reject reason is required when rejecting")
        return v

    class Config:
        json_schema_extra = {
            "example": {"approved": True, "reject_reason": None, "is_accredited": True}
        }


class KycListQuery(BaseModel):
    """KYC 列表查询参数"""

    status: Optional[KycStatus] = Field(None, description="按状态筛选")
    page: int = Field(1, ge=1, description="页码")
    page_size: int = Field(10, ge=1, le=100, description="每页数量")


# ========== Story 2.7: 文件上传相关 Schema ==========


class KycUploadResponse(BaseModel):
    """KYC 文件上传响应"""

    file_path: str = Field(..., description="文件路径 (MinIO 对象名)")
    document_type: str = Field(..., description="文档类型")

    class Config:
        json_schema_extra = {
            "example": {
                "file_path": "kyc/0x742d35.../passport_front_abc123.jpg",
                "document_type": "passport_front",
            }
        }


# ========== Story 2.8: 合约状态相关 Schema ==========


class ContractKycStatus(BaseModel):
    """合约中的 KYC 状态"""

    verified: bool = Field(..., description="是否已验证")
    country: Optional[str] = Field(None, description="国家代码")
    accredited_investor: Optional[bool] = Field(None, description="是否为合格投资者")
    added_time: Optional[int] = Field(None, description="添加时间戳")
    verification_time: Optional[int] = Field(None, description="验证时间戳")
    expiry_time: Optional[int] = Field(None, description="过期时间戳")
    frozen: Optional[bool] = Field(None, description="是否被冻结")


class KycContractComparisonResponse(BaseModel):
    """KYC 数据库与合约状态对比响应"""

    wallet_address: str = Field(..., description="钱包地址")

    # 数据库状态
    db_status: str = Field(..., description="数据库 KYC 状态")
    db_is_accredited: bool = Field(False, description="数据库合格投资者状态")
    db_sync_status: Optional[str] = Field(None, description="链上同步状态")

    # 合约状态
    contract_verified: Optional[bool] = Field(None, description="合约验证状态")
    contract_info: Optional[ContractKycStatus] = Field(None, description="合约完整信息")
    contract_error: Optional[str] = Field(None, description="查询合约时的错误")

    # 状态一致性
    is_consistent: bool = Field(False, description="数据库与合约状态是否一致")
