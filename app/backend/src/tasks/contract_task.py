"""
Contract Provider Sync Task
合约 Provider 同步任务 (纯 Provider 模式)

定期同步 AddressProvider 注册状态到数据库

数据来源: ContractConfig 表获取所有需要同步的合约
"""

import asyncio
from datetime import datetime

from falib.utils.log import get_logger
from tortoise import Tortoise

from src.models.contracts.contract_config import ContractConfig
from src.models.contracts.contract_deployment import ContractDeployment
from src.models.contracts.provider_registry import (
    ZERO_ADDRESS,
    ProviderRegistry,
    compute_key_hash,
)
from src.shared.aerich_redirect import TORTOISE_ORM
from src.shared.common.adapters import get_async_minio_adapter, get_async_web3_adapter
from src.shared.schemas.enums import ChainID, ContractStatus

schedule_logger = get_logger("schedule.contract_task")


async def get_network_chain() -> tuple[str, int]:
    """获取当前网络和链ID"""
    async with get_async_web3_adapter() as adapter:
        chain_id = await adapter.get_chain_id()
        network = ChainID.from_value_to_name(chain_id)
        return str(network), chain_id


async def get_provider_contract(network: str, chain_id: int) -> ContractDeployment | None:
    """
    获取 AddressProvider 合约实例

    Returns:
        AddressProvider 合约记录，或 None
    """
    return await ContractDeployment.filter(
        name="AddressProvider",
        network=network,
        chain_id=chain_id,
        status=ContractStatus.ACTIVE,
    ).first()


async def sync_provider_registry_from_chain(
    provider_address: str,
    chain_id: int,
    network: str,
    provider_abi: list,
) -> list[ProviderRegistry]:
    """
    从链上同步 Provider 注册状态到数据库

    数据来源: ContractConfig 表获取所有有 provider_key 的合约

    Args:
        provider_address: AddressProvider 合约地址
        chain_id: 链 ID
        network: 网络名称
        provider_abi: Provider 合约 ABI

    Returns:
        更新后的注册记录列表
    """
    results = []
    now = datetime.now()

    # 从 ContractConfig 获取所有有 provider_key 的合约
    configs = await ContractConfig.filter(provider_key__not_isnull=True)

    if not configs:
        schedule_logger.warning("No contracts with provider_key found in ContractConfig")
        return results

    async with get_async_web3_adapter() as adapter:
        # 注册合约到 adapter
        adapter.register_contract(provider_address, provider_abi)
        
        for config in configs:
            key = config.provider_key
            key_hash = compute_key_hash(key)

            try:
                # 查询链上注册地址
                registered_addr = await adapter.call_function(
                    provider_address, "get_address", [key_hash]
                )
                schedule_logger.debug(
                    f"Provider key {key} ({key_hash[:10]}...) -> {registered_addr}"
                )
            except Exception as e:
                schedule_logger.warning(f"Failed to query Provider for key {key}: {e}")
                registered_addr = ZERO_ADDRESS

            # 更新或创建注册记录
            registry, created = await ProviderRegistry.update_or_create(
                provider_address=provider_address,
                chain_id=chain_id,
                key=key,
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

            action = "Created" if created else "Updated"
            schedule_logger.debug(
                f"{action} registry: {key} -> {registered_addr[:10]}..."
            )
            results.append(registry)

    return results


async def check_project_status(
    project_name: str, provider_address: str, chain_id: int
) -> dict:
    """
    检查项目状态（所有合约是否已注册到 Provider）

    数据来源: ContractConfig 表获取项目的合约列表

    Args:
        project_name: 项目分类名称，如 "vanke"
        provider_address: Provider 地址
        chain_id: 链 ID

    Returns:
        项目状态字典
    """
    # 从 ContractConfig 获取项目的所有合约
    configs = await ContractConfig.filter(
        project_name=project_name,
        provider_key__not_isnull=True,
    )

    project_keys = [c.provider_key for c in configs]

    if not project_keys:
        return {
            "project": project_name,
            "status": "unknown",
            "message": f"No contracts with provider_key for project: {project_name}",
        }

    # 查询注册状态（排除已删除记录）
    registrations = await ProviderRegistry.filter(
        provider_address=provider_address,
        chain_id=chain_id,
        key__in=project_keys,
        is_deleted=False,
    )

    registered_keys = {r.key for r in registrations if r.is_registered}
    unregistered_keys = set(project_keys) - registered_keys

    # 计算状态
    if len(registered_keys) == len(project_keys):
        status = "ready"
    elif len(registered_keys) > 0:
        status = "partially_ready"
    else:
        status = "not_ready"

    return {
        "project": project_name,
        "status": status,
        "total": len(project_keys),
        "registered": len(registered_keys),
        "registered_keys": list(registered_keys),
        "unregistered_keys": list(unregistered_keys),
    }


async def async_sync_provider_registry():
    """
    主同步任务：同步 AddressProvider 注册状态

    此任务用于定期调度执行，从链上查询 Provider 状态并更新数据库
    """
    await Tortoise.init(config=TORTOISE_ORM)

    network, chain_id = await get_network_chain()
    schedule_logger.info(
        f"Starting Provider sync for network={network}, chain_id={chain_id}"
    )

    # 获取 AddressProvider 合约
    provider_contract = await get_provider_contract(network, chain_id)

    if not provider_contract:
        schedule_logger.warning(
            f"AddressProvider not found for network={network}, chain_id={chain_id}"
        )
        return

    # 加载 ABI (优先从 MinIO，失败则从本地)
    provider_abi = None
    try:
        async with get_async_minio_adapter() as minio:
            provider_abi = await minio.get_json(provider_contract.abi_path)
    except Exception as e:
        schedule_logger.warning(f"Failed to load ABI from MinIO: {e}")

    if not provider_abi:
        # Fallback: 从本地加载
        import json
        from pathlib import Path

        local_abi_path = Path(__file__).parent.parent.parent / ".build" / "abi" / "AddressProvider.json"
        if local_abi_path.exists():
            schedule_logger.info(f"Loading ABI from local: {local_abi_path}")
            with open(local_abi_path) as f:
                provider_abi = json.load(f)
        else:
            schedule_logger.error(f"ABI not found: MinIO path={provider_contract.abi_path}, local={local_abi_path}")
            return

    # 同步注册状态
    registries = await sync_provider_registry_from_chain(
        provider_address=provider_contract.address,
        chain_id=chain_id,
        network=network,
        provider_abi=provider_abi,
    )

    schedule_logger.info(f"Synced {len(registries)} Provider registrations")

    # 检查各项目状态 (从 ContractConfig 获取所有项目)
    project_names = (
        await ContractConfig.all().distinct().values_list("project_name", flat=True)
    )
    for project_name in project_names:
        status = await check_project_status(
            project_name, provider_contract.address, chain_id
        )
        schedule_logger.info(
            f"Project '{project_name}': {status['status']} "
            f"({status['registered']}/{status['total']} registered)"
        )

    return registries


# Legacy alias for backward compatibility
async_chain_contracts_info = async_sync_provider_registry


if __name__ == "__main__":
    asyncio.run(async_sync_provider_registry())
