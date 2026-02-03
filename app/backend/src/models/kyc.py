"""
KYC 认证模型

重构说明 (2026-01-29):
- 表名从 user_kyc 改为 account_kyc
- 字段 wallet_address 改为 address (与 Account 模型保持一致)
- 唯一约束从 wallet_address 改为 (address, network) 组合

重构说明 (2026-02-01):
- 新增 AccountKycDocument 模型，支持多证件上传
- AccountKyc 与 AccountKycDocument 为一对多关系
"""

from tortoise import fields

from src.models.base import AbstractModel, TimestampMixin
from src.shared.schemas.enums import IdType, KycStatus, NetWork, OnChainSyncStatus


class AccountKycDocument(AbstractModel, TimestampMixin):
    """KYC 证件文档表 - 支持多证件上传"""

    kyc = fields.ForeignKeyField(
        "models.AccountKyc",
        related_name="documents",
        on_delete=fields.CASCADE,
        description="关联的 KYC 记录",
    )
    id_type = fields.CharEnumField(
        IdType,
        max_length=20,
        description="证件类型 (id_card/passport/driver_license)",
    )
    # 证件信息 (ADR-1: SHA256 + 后4位明文)
    id_number_hash = fields.CharField(
        max_length=64, null=True, description="证件号 SHA256 哈希"
    )
    id_number_last4 = fields.CharField(
        max_length=4, null=True, description="证件号后4位 (明文，便于核对)"
    )
    document_expiry = fields.DateField(null=True, description="证件有效期")

    # 证件照片 (MinIO 路径)
    id_front_url = fields.CharField(
        max_length=255, null=True, description="证件正面照片 MinIO 路径"
    )
    id_back_url = fields.CharField(
        max_length=255, null=True, description="证件背面照片 MinIO 路径 (护照可为空)"
    )

    class Meta:
        table = "account_kyc_document"
        table_description = "KYC 证件文档表"
        unique_together = (("kyc_id", "id_type"),)  # 每种证件类型只能有一条记录

    def __str__(self):
        return f"AccountKycDocument(id={self.id}, kyc_id={self.kyc_id}, id_type={self.id_type})"


class AccountKyc(AbstractModel, TimestampMixin):
    """账户 KYC 认证表"""

    address = fields.CharField(max_length=42, description="钱包地址 (小写)")
    network = fields.CharEnumField(
        NetWork, max_length=20, default=NetWork.HARDHAT, description="网络类型"
    )
    status = fields.CharEnumField(
        KycStatus, max_length=20, default=KycStatus.NOT_STARTED, description="KYC 状态"
    )
    submitted_at = fields.DatetimeField(null=True, description="提交时间")
    reviewed_at = fields.DatetimeField(null=True, description="审核时间")
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

    # ========== 基本信息字段 ==========
    full_name = fields.CharField(max_length=100, null=True, description="证件姓名")
    date_of_birth = fields.DateField(null=True, description="出生日期")

    # 自拍照片 (所有证件共用)
    selfie_url = fields.CharField(
        max_length=255, null=True, description="手持证件自拍 MinIO 路径"
    )

    # ========== 链上同步状态 (ADR-3) ==========
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

    # documents: ReverseRelation["AccountKycDocument"]  # 由 ForeignKeyField 自动创建

    class Meta:
        table = "account_kyc"
        table_description = "账户 KYC 认证表"
        unique_together = (("address", "network"),)
        indexes = [
            ("status",),
        ]

    def __str__(self):
        return f"AccountKyc(id={self.id}, address={self.address[:10]}..., network={self.network}, status={self.status})"


# 向后兼容别名 (deprecated, 将在未来版本移除)
UserKyc = AccountKyc
