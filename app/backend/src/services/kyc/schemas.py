"""
KYC Domain - Schema 定义
"""

import base64
import re
from datetime import date, datetime
from enum import Enum
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from src.shared.schemas.enums import IdType, KycStatus, OnChainSyncStatus
from src.shared.schemas.mixins import IDMixin, TimestampMixin

# ========== Email 验证正则表达式 ==========
# 简化的 RFC 5322 兼容邮箱验证
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


class KycStatusResponse(BaseModel):
    """KYC 状态响应"""

    wallet_address: str = Field(..., description="钱包地址")
    status: KycStatus = Field(..., description="KYC 状态")
    submitted_at: Optional[datetime] = Field(None, description="提交时间")
    reviewed_at: Optional[datetime] = Field(None, description="审核时间")
    reject_reason: Optional[str] = Field(None, description="拒绝原因")
    country_code: Optional[str] = Field(None, description="国家代码")
    is_accredited: bool = Field(False, description="是否为合格投资者")
    on_chain_sync_status: Optional[OnChainSyncStatus] = Field(
        None, description="链上同步状态"
    )

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
                "on_chain_sync_status": "pending",
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
    """KYC 申请请求 (多证件版本) - 扩展版"""

    # wallet_address 由路由层从 JWT 注入，前端无需传递
    wallet_address: Optional[str] = Field(
        None, max_length=42, description="钱包地址 (由后端从JWT获取)"
    )
    country_code: Optional[str] = Field(
        None, max_length=2, description="国家代码 (国籍)"
    )

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

    # ========== 新增: 联系信息字段 (Requirements 5.1, 5.2) ==========
    email: Optional[str] = Field(None, max_length=255, description="邮箱地址")
    phone: Optional[str] = Field(
        None, max_length=20, description="电话号码 (E.164 格式, 如 +1234567890)"
    )

    # ========== 新增: 居住地址字段 (Requirements 5.3) ==========
    address_line1: Optional[str] = Field(None, max_length=255, description="地址行1")
    address_line2: Optional[str] = Field(
        None, max_length=255, description="地址行2 (可选)"
    )
    city: Optional[str] = Field(None, max_length=100, description="城市")
    state: Optional[str] = Field(None, max_length=100, description="州/省")
    postal_code: Optional[str] = Field(None, max_length=20, description="邮政编码")
    residence_country: Optional[str] = Field(
        None, max_length=2, description="居住国家代码 (ISO 3166-1 alpha-2)"
    )

    # ========== 新增: 活体检测字段 (Requirements 5.4, 5.5) ==========
    liveness_verified: Optional[bool] = Field(None, description="活体检测是否通过")
    face_image_url: Optional[str] = Field(
        None, max_length=255, description="人脸图片 MinIO 路径"
    )
    liveness_video_url: Optional[str] = Field(
        None, max_length=255, description="活体检测视频 MinIO 路径"
    )

    @field_validator("wallet_address")
    @classmethod
    def validate_address(cls, v: Optional[str]) -> Optional[str]:
        """验证并规范化钱包地址 (可选，由路由层注入)"""
        if v is None:
            return v
        if not v.startswith("0x") or len(v) != 42:
            raise ValueError("Invalid wallet address format")
        return v.lower()

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        """验证邮箱格式 (Requirements 5.1)

        使用简化的 RFC 5322 兼容正则表达式验证邮箱格式。
        """
        if v is None:
            return v

        v = v.strip()
        if not v:
            return None

        if not EMAIL_REGEX.match(v):
            raise ValueError("Invalid email format")

        return v.lower()

    @field_validator("country_code")
    @classmethod
    def validate_country_code(cls, v: Optional[str]) -> Optional[str]:
        """验证国家代码格式 (国籍)"""
        if v is not None:
            if len(v) != 2:
                raise ValueError(
                    "Country code must be 2 characters (ISO 3166-1 alpha-2)"
                )
            return v.upper()
        return v

    @field_validator("residence_country")
    @classmethod
    def validate_residence_country(cls, v: Optional[str]) -> Optional[str]:
        """验证居住国家代码格式"""
        if v is not None:
            if len(v) != 2:
                raise ValueError(
                    "Residence country code must be 2 characters (ISO 3166-1 alpha-2)"
                )
            return v.upper()
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        """验证电话号码格式 (E.164: +[country_code][number])

        E.164 格式规范:
        - 必须以 + 开头
        - 后跟 1-15 位数字
        - 第一位数字不能为 0
        - 示例: +1234567890, +861381234567
        """
        if v is None:
            return v

        v = v.strip()
        if not v:
            return None

        # E.164 格式: +[1-9][0-9]{1,14}
        e164_pattern = r"^\+[1-9][0-9]{1,14}$"
        if not re.match(e164_pattern, v):
            raise ValueError("Invalid phone format, must be E.164 (e.g., +1234567890)")
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
                "country_code": "CN",
                "full_name": "张三",
                "date_of_birth": "1990-01-01",
                "email": "zhangsan@example.com",
                "phone": "+8613812345678",
                "address_line1": "北京市朝阳区建国路88号",
                "address_line2": "SOHO现代城A座1001室",
                "city": "北京",
                "state": "北京市",
                "postal_code": "100022",
                "residence_country": "CN",
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
                "liveness_verified": True,
                "face_image_url": "kyc/0x742d35.../face_abc123.jpg",
                "liveness_video_url": "kyc/0x742d35.../liveness_video_abc123.webm",
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
    """KYC 完整响应 (包含 ID 和时间戳) - 扩展版"""

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

    # ========== 新增: 联系信息字段 (Requirements 6.1) ==========
    email: Optional[str] = Field(None, description="邮箱地址")
    phone: Optional[str] = Field(None, description="电话号码 (E.164 格式)")

    # ========== 新增: 居住地址字段 (Requirements 6.2) ==========
    address_line1: Optional[str] = Field(None, description="地址行1")
    address_line2: Optional[str] = Field(None, description="地址行2")
    city: Optional[str] = Field(None, description="城市")
    state: Optional[str] = Field(None, description="州/省")
    postal_code: Optional[str] = Field(None, description="邮政编码")
    residence_country: Optional[str] = Field(None, description="居住国家代码")

    # ========== 新增: 活体检测字段 (Requirements 6.3, 6.4) ==========
    liveness_verified: bool = Field(False, description="活体检测是否通过")
    has_face_image: bool = Field(False, description="是否上传人脸图片")
    has_liveness_video: bool = Field(False, description="是否上传活体检测视频")

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


class ReviewStepsData(BaseModel):
    """审核步骤确认数据 - 记录审核员在各步骤的确认状态"""

    basic_info_confirmed: bool = Field(..., description="基本信息确认状态")
    documents_confirmed: bool = Field(..., description="证件审核确认状态")
    risk_assessment_confirmed: bool = Field(..., description="风险评估确认状态")
    confirmed_at: str = Field(..., description="确认时间 (ISO 时间戳)")


class ReviewProgressRequest(BaseModel):
    """审核步骤进度请求 - 保存审核员的中间步骤进度"""

    current_step: int = Field(..., ge=0, le=3, description="当前步骤索引 (0-3)")
    confirmed_steps: List[bool] = Field(
        ..., description="各步骤确认状态 (长度为4的布尔数组)"
    )

    @field_validator("confirmed_steps")
    @classmethod
    def validate_confirmed_steps(cls, v: List[bool]) -> List[bool]:
        """确认步骤数组长度必须为 4"""
        if len(v) != 4:
            raise ValueError("confirmed_steps 长度必须为 4")
        return v


class KycReviewRequest(BaseModel):
    """KYC 审核请求 (管理员用) - Story 2.9 增强版"""

    approved: bool = Field(..., description="是否通过")
    reject_reason_code: Optional[RejectReasonCode] = Field(
        None, description="拒绝原因代码"
    )
    reject_reason: Optional[str] = Field(None, max_length=500, description="拒绝原因")
    is_accredited: bool = Field(False, description="是否为合格投资者")
    review_steps: Optional[ReviewStepsData] = Field(
        None, description="审核步骤确认轨迹"
    )

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


class Base64UploadRequest(BaseModel):
    """Base64 图片上传请求 (Requirements 4.1)

    用于活体检测等场景，前端直接提交 base64 编码的图片数据。
    支持 data URI 格式和纯 base64 字符串。
    """

    image_data: str = Field(
        ..., description="Base64 编码的图片数据 (支持 data URI 格式或纯 base64)"
    )
    document_type: Literal["face_image", "selfie"] = Field(
        ..., description="文档类型: face_image (活体检测人脸) 或 selfie (手持证件自拍)"
    )

    @field_validator("image_data")
    @classmethod
    def validate_base64(cls, v: str) -> str:
        """验证 base64 格式

        支持两种格式:
        1. Data URI: data:image/jpeg;base64,/9j/4AAQSkZJRg...
        2. 纯 Base64: /9j/4AAQSkZJRg...

        验证规则:
        - 必须是有效的 base64 编码
        - 解码后必须是有效的图片数据
        """
        if not v or not v.strip():
            raise ValueError("Invalid base64 image data: empty string")

        v = v.strip()

        # 提取纯 base64 数据 (去除 data URI 前缀)
        base64_data = v
        if v.startswith("data:"):
            # 格式: data:image/jpeg;base64,xxxxx
            try:
                # 查找 base64, 标记
                if ";base64," in v:
                    base64_data = v.split(";base64,", 1)[1]
                elif ",base64," in v:
                    base64_data = v.split(",base64,", 1)[1]
                elif "," in v:
                    # 简化格式: data:image/jpeg,xxxxx
                    base64_data = v.split(",", 1)[1]
                else:
                    raise ValueError("Invalid data URI format")
            except IndexError:
                raise ValueError("Invalid data URI format")

        # 验证 base64 编码是否有效
        try:
            # 添加必要的 padding
            padding = 4 - len(base64_data) % 4
            if padding != 4:
                base64_data += "=" * padding

            # 尝试解码
            decoded = base64.b64decode(base64_data, validate=True)

            if len(decoded) == 0:
                raise ValueError("Invalid base64 image data: decoded to empty bytes")

        except Exception as e:
            if "Invalid base64" in str(e):
                raise
            raise ValueError(f"Invalid base64 image data: {str(e)}")

        return v

    class Config:
        json_schema_extra = {
            "example": {
                "image_data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
                "document_type": "face_image",
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


# ========== KYC 链上准入相关 Schema ==========


class RecordAdmissionRequest(BaseModel):
    """链上准入记录请求 - 前端钱包交易确认后调用"""

    tx_hash: str = Field(..., description="链上交易哈希 (0x + 64 hex chars)")

    @field_validator("tx_hash")
    @classmethod
    def validate_tx_hash_format(cls, v: str) -> str:
        from src.shared.common.validators import validate_tx_hash

        return validate_tx_hash(v)


class RecordRevocationRequest(BaseModel):
    """链上解除准入记录请求 - 前端钱包交易确认后调用"""

    tx_hash: str = Field(..., description="链上交易哈希 (0x + 64 hex chars)")
    reason: str = Field(..., description="解除准入原因")

    @field_validator("tx_hash")
    @classmethod
    def validate_tx_hash_format(cls, v: str) -> str:
        from src.shared.common.validators import validate_tx_hash

        return validate_tx_hash(v)


class ContractInfoResponse(BaseModel):
    """KYC 合约信息响应 - 用于前端验证钱包地址"""

    contract_address: str = Field(..., description="KYC 合约地址")
    deployer_address: str = Field(..., description="合约部署者地址 (verifier)")
