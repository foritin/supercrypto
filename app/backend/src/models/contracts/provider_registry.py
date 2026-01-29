"""
Provider Registry Model
Provider 注册记录模型

追踪 AddressProvider 中的合约注册状态，用于：
1. 后端缓存 Provider 注册信息
2. Admin UI 展示注册状态
3. 项目就绪检查
"""

from tortoise import fields

from src.models.base import AbstractModel, SoftDeleteMixin, TimestampMixin
from src.shared.schemas.enums import NetWork


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
    network = fields.CharEnumField(NetWork, max_length=20, description="网络类型")

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
        return self.registered_address == "0x0000000000000000000000000000000000000000"


# ============ 工具函数 ============

ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"


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


async def sync_provider_registry(
    provider_address: str, chain_id: int, network: NetWork, web3_provider
) -> list[ProviderRegistry]:
    """
    从链上同步 Provider 注册状态

    Args:
        provider_address: AddressProvider 合约地址
        chain_id: 链 ID
        network: 网络类型
        web3_provider: Web3 provider 实例

    Returns:
        更新后的注册记录列表
    """
    from datetime import datetime

    from src.models.contracts.contract_config import ContractConfig

    results = []
    now = datetime.now()

    # 从 ContractConfig 获取所有合约配置
    all_configs = await ContractConfig.all()

    for config in all_configs:
        if not config.provider_key:
            continue

        key_hash = config.provider_key_hash or compute_key_hash(config.provider_key)

        # 查询链上地址
        # registered_addr = provider_contract.functions.get_address(key_hash).call()
        # 临时: 使用零地址
        registered_addr = ZERO_ADDRESS

        # 更新或创建记录
        registry, _ = await ProviderRegistry.update_or_create(
            provider_address=provider_address,
            chain_id=chain_id,
            key=config.provider_key,
            defaults={
                "network": network,
                "key_hash": key_hash,
                "registered_address": registered_addr,
                "category": config.project_name,
                "contract_name": config.contract_name,
                "is_registered": registered_addr != ZERO_ADDRESS,
                "last_synced_at": now,
            },
        )
        results.append(registry)

    return results


async def check_project_ready(
    project_name: str, provider_address: str, chain_id: int
) -> dict:
    """
    检查项目是否就绪（所有依赖已注册）

    Args:
        project_name: 项目名称，如 "vanke"
        provider_address: Provider 地址
        chain_id: 链 ID

    Returns:
        项目状态字典
    """
    from src.models.contracts.contract_config import ContractConfig

    # 从 ContractConfig 获取项目的所有合约
    project_configs = await ContractConfig.filter(project_name=project_name).all()
    project_keys = [c.provider_key for c in project_configs if c.provider_key]

    # 查询注册状态（排除已删除记录）
    registrations = await ProviderRegistry.filter(
        provider_address=provider_address,
        chain_id=chain_id,
        key__in=project_keys,
        is_deleted=False,
    )

    registered_keys = {r.key for r in registrations if r.is_registered}

    result = {
        "project": project_name,
        "status": "ready",
        "registered": len(registered_keys),
        "total": len(project_keys),
        "contracts": [],
        "missing_registrations": [],
    }

    for config in project_configs:
        if not config.provider_key:
            continue

        deps = config.dependencies or []

        # 检查合约本身是否注册
        self_registered = config.provider_key in registered_keys

        # 检查依赖是否注册
        missing_deps = [dep for dep in deps if dep not in registered_keys]

        contract_status = {
            "name": config.contract_name,
            "key": config.provider_key,
            "ready": self_registered and len(missing_deps) == 0,
            "registered": self_registered,
            "missing_deps": missing_deps,
        }
        result["contracts"].append(contract_status)

        if not self_registered:
            result["missing_registrations"].append(config.provider_key)

        if not contract_status["ready"]:
            result["status"] = "partially_ready"

    if len(result["missing_registrations"]) == len(project_keys):
        result["status"] = "not_ready"

    return result
