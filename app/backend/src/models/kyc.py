"""
KYC 认证模型
"""

from tortoise import fields

from src.models.base import AbstractModel, TimestampMixin
from src.shared.schemas.enums import IdType, KycStatus, OnChainSyncStatus, WalletType


class UserKyc(AbstractModel, TimestampMixin):
    """用户 KYC 认证表"""

    wallet_address = fields.CharField(
        max_length=42, unique=True, description="钱包地址 (小写)"
    )
    wallet = fields.CharEnumField(
        WalletType, max_length=20, default=WalletType.LOCAL, description="钱包类型"
    )
    status = fields.CharEnumField(
        KycStatus, max_length=20, default=KycStatus.NOT_STARTED, description="KYC 状态"
    )
    submitted_at = fields.DatetimeField(null=True, description="提交时间")
    reviewed_at = fields.DatetimeField(null=True, description="审核时间")
    reviewer_id = fields.IntField(
        null=True, description="审核人 ID (deprecated, use reviewer_address)"
    )
    reviewer_address = fields.CharField(
        max_length=42, null=True, description="审核人钱包地址"
    )
    reject_reason = fields.TextField(null=True, description="拒绝原因")
    # 第三方 KYC 服务相关字段 (预留)
    external_kyc_id = fields.CharField(
        max_length=100, null=True, description="第三方 KYC 服务 ID"
    )
    country_code = fields.CharField(
        max_length=2, null=True, description="国家代码 (ISO 3166-1 alpha-2)"
    )
    is_accredited = fields.BooleanField(default=False, description="是否为合格投资者")

    # ========== KYC 增强字段 (Story 2.6) ==========

    # 证件类型
    id_type = fields.CharEnumField(
        IdType,
        max_length=20,
        null=True,
        description="证件类型 (id_card/passport/driver_license)",
    )

    # 证件信息 (ADR-1: SHA256 + 后4位明文)
    id_number_hash = fields.CharField(
        max_length=64, null=True, description="证件号 SHA256 哈希"
    )
    id_number_last4 = fields.CharField(
        max_length=4, null=True, description="证件号后4位 (明文，便于核对)"
    )
    full_name = fields.CharField(max_length=100, null=True, description="证件姓名")
    date_of_birth = fields.DateField(null=True, description="出生日期")

    # 证件照片 (MinIO 路径)
    id_front_url = fields.CharField(
        max_length=255, null=True, description="证件正面照片 MinIO 路径"
    )
    id_back_url = fields.CharField(
        max_length=255, null=True, description="证件背面照片 MinIO 路径"
    )
    selfie_url = fields.CharField(
        max_length=255, null=True, description="手持证件自拍 MinIO 路径"
    )

    # 链上同步状态 (ADR-3: 合约调用失败处理)
    on_chain_sync_status = fields.CharEnumField(
        OnChainSyncStatus,
        max_length=20,
        default=OnChainSyncStatus.PENDING,
        description="链上同步状态",
    )
    on_chain_tx_hash = fields.CharField(
        max_length=66, null=True, description="链上同步交易哈希"
    )
    on_chain_synced_at = fields.DatetimeField(null=True, description="链上同步成功时间")
    on_chain_error = fields.TextField(null=True, description="链上同步失败原因")

    class Meta:
        table = "user_kyc"
        table_description = "用户 KYC 认证表"
        indexes = [
            ("status",),
        ]

    def __str__(self):
        return f"UserKyc(id={self.id}, wallet={self.wallet_address[:10]}..., status={self.status})"
