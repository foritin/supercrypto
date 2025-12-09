"""
部署信息记录
"""
from enum import Enum
from tortoise import fields
from src.models.base import AbstractModel, TimestampMixin


class DeployInfo(AbstractModel, TimestampMixin):
    """
    部署信息记录
    """
    address = fields.CharField(max_length=128, description="部署账户地址")
    private_key = fields.CharField(max_length=256, description="部署账户私钥")
    contract_address = fields.CharField(max_length=128, description="合约地址")
    network = fields.CharField(max_length=128, description="部署网络")
    created_at = fields.DatetimeField(auto_now_add=True, description="创建时间")
    updated_at = fields.DatetimeField(auto_now=True, description="更新时间")

    class Meta:
        table = "deploy_info"
        table_description = "部署信息记录"