"""
用户模型
"""

from tortoise import fields

from src.models.base import (
    AbstractModel,
    BlockableMixin,
    SoftDeleteMixin,
    TimestampMixin,
)
from src.schemas.enums import Network


class Account(AbstractModel, TimestampMixin, BlockableMixin, SoftDeleteMixin):
    """
    账户表 - 支持封禁和删除两种状态，整合钱包功能

    - is_blocked: 临时封禁（违规、风控、冻结） - 可解封
    - is_deleted: 永久删除（用户注销、停用） - 可恢复但不建议

    钱包字段 (来自原 Wallet 模型):
    - encrypted_private_key: 加密的私钥
    - balance: 余额（Wei单位）
    - is_active: 是否激活
    """

    # === 原有字段 ===
    address = fields.CharField(max_length=128, description="钱包地址")
    private_key = fields.CharField(max_length=256, description="私钥")
    roles = fields.JSONField(default=list, description="账户角色列表: admin, treasury, multisig_signer, contract_owner")
    network = fields.CharEnumField(
        Network, max_length=20, default=Network.HARDHAT, description="网络类型"
    )
    last_login_dt = fields.DatetimeField(null=True, description="最后登录时间(UTC)")

    # === 新增字段 (来自 Wallet 模型) - Requirements 4.1, 4.5 ===
    encrypted_private_key = fields.CharField(
        max_length=512, null=True, description="加密的私钥"
    )
    balance = fields.DecimalField(
        max_digits=36, decimal_places=18, default=0, description="余额（Wei单位）"
    )
    is_active = fields.BooleanField(default=True, description="是否激活")

    class Meta:
        table = "account"
        table_description = "账户表"
        unique_together = (("address", "network"),)

    def __str__(self):
        status = "active"
        if self.is_blocked:
            status = "blocked"
        elif self.is_deleted:
            status = "deleted"
        return f"Account(id={self.id}, address={self.address}, network={self.network}, status={status})"
