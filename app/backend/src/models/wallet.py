"""
钱包模型
"""

from tortoise import fields

from src.models.base import AbstractModel, TimestampMixin
from src.shared.schemas.enums import NetWork


class Wallet(AbstractModel, TimestampMixin):
    """钱包表"""

    address = fields.CharField(max_length=128, unique=True, description="钱包地址")
    encrypted_private_key = fields.CharField(max_length=512, description="加密的私钥")
    network = fields.CharEnumField(
        NetWork, max_length=20, default=NetWork.HARDHAT, description="网络类型"
    )
    balance = fields.DecimalField(
        max_digits=36, decimal_places=18, default=0, description="余额（Wei单位）"
    )
    tag = fields.CharField(max_length=255, null=True, description="标签")
    account_id = fields.IntField(null=True, description="关联的账户ID")
    is_active = fields.BooleanField(default=True, description="是否激活")

    class Meta:
        table = "wallet"
        table_description = "钱包表"

    def __str__(self):
        return f"Wallet(id={self.id}, address={self.address}, network={self.network})"
