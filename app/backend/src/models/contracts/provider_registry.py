"""
Provider Registry Model
Provider 注册记录模型

追踪 AddressProvider 中的合约注册状态，用于：
1. 后端缓存 Provider 注册信息
2. Admin UI 展示注册状态
3. 项目就绪检查
"""

from tortoise import fields

from src.constants.definitions.contract import ZERO_ADDRESS
from src.models.base import AbstractModel, SoftDeleteMixin, TimestampMixin
from src.schemas.enums import Network


class ProviderRegistry(AbstractModel, TimestampMixin, SoftDeleteMixin):
    """
    Provider 注册记录表

    追踪 AddressProvider 中的合约注册状态
    """

    # Provider 信息
    provider_address = fields.CharField(
        max_length=42, description="AddressProvider 合约地址"
    )
    chain_id = fields.IntField(description="链 ID")
    network = fields.CharEnumField(Network, max_length=20, description="网络类型")

    # 注册信息
    key = fields.CharField(
        max_length=100, description="Provider Key，如 VANKE_RWA_TOKEN"
    )
    key_hash = fields.CharField(max_length=66, description="keccak256(key) 的 hex 值")
    registered_address = fields.CharField(
        max_length=42,
        default="0x0000000000000000000000000000000000000000",
        description="当前注册的合约地址",
    )

    # 分类与合约信息
    category = fields.CharField(
        max_length=50, description="分类: common, mock, vanke 等"
    )
    contract_name = fields.CharField(
        max_length=100, description="合约名称，如 VankeRWAToken"
    )

    # 状态
    is_registered = fields.BooleanField(
        default=False, description="是否已注册 (地址非零)"
    )

    # 链上同步时间
    last_synced_at = fields.DatetimeField(
        null=True, description="最后同步链上状态的时间"
    )

    class Meta:
        table = "provider_registry"
        unique_together = [("provider_address", "chain_id", "key")]

    def __str__(self):
        status = "✅" if self.is_registered else "⚠️"
        return f"{status} {self.key} -> {self.registered_address[:10]}..."

    @property
    def is_zero_address(self) -> bool:
        """检查是否为零地址"""
        return self.registered_address == ZERO_ADDRESS


# ============ 工具函数 ============


def compute_key_hash(key: str) -> str:
    """
    计算 Provider Key 的 keccak256 hash

    Args:
        key: Provider Key 字符串，如 "VANKE_RWA_TOKEN"

    Returns:
        hex 格式的 hash 值
    """
    from eth_utils import keccak

    return "0x" + keccak(text=key).hex()
