"""
Contract Registry Service - Provider 注册服务
_Requirements: 3.1_

负责合约在 AddressProvider 上的注册和注销操作
"""

from datetime import datetime
from typing import Any, Dict, Optional

from falib.utils.config import SETTINGS
from falib.utils.log import get_logger

from src.models.contracts.contract_config import ContractConfig
from src.models.contracts.contract_deployment import ContractDeployment
from src.models.contracts.provider_registry import (
    ZERO_ADDRESS,
    ProviderRegistry,
    compute_key_hash,
)
from src.shared.common.adapters import get_async_minio_adapter, get_async_web3_adapter
from src.shared.schemas.enums import ContractStatus

logger = get_logger("contract.registry_service")

# set_address 函数 ABI
SET_ADDRESS_ABI = [{
    "name": "set_address", "type": "function", "stateMutability": "nonpayable",
    "inputs": [{"name": "_key", "type": "bytes32"}, {"name": "_address", "type": "address"}],
    "outputs": [],
}]


class ContractRegistryService:
    """Provider 注册服务"""

    def __init__(self, network: Optional[str] = None):
        self.network = network or SETTINGS.NETWORK

    async def _get_provider_contract(self) -> ContractDeployment:
        """获取 AddressProvider 合约"""
        provider = await ContractDeployment.filter(
            name="AddressProvider", network=self.network, status=ContractStatus.ACTIVE,
        ).first()
        if not provider or not provider.address:
            raise Exception("AddressProvider not found or not deployed")
        return provider

    async def _get_config_and_key(self, contract_name: str, provider_key: Optional[str]) -> tuple:
        """获取合约配置和 provider_key"""
        config = await ContractConfig.filter(contract_name=contract_name).first()
        if not config:
            raise Exception(f"Contract '{contract_name}' not found in ContractConfig")
        key = provider_key or config.provider_key
        if not key:
            raise Exception(f"No provider_key for contract '{contract_name}'")
        return config, key

    async def prepare_register(self, contract_name: str, provider_key: Optional[str] = None) -> Dict[str, Any]:
        """
        准备注册调用参数 (前端钱包签名模式)

        Args:
            contract_name: 合约名称
            provider_key: Provider Key (可选，不传则从 ContractConfig 获取)

        Returns:
            调用参数 dict
        """
        config, key = await self._get_config_and_key(contract_name, provider_key)

        # 验证合约已部署
        contract = await ContractDeployment.filter(name=contract_name, network=self.network).first()
        if not contract:
            raise Exception(f"Contract '{contract_name}' not found in ContractDeployment")
        if not contract.address:
            raise Exception(f"Contract '{contract_name}' not deployed (no address)")

        provider = await self._get_provider_contract()
        key_hash = compute_key_hash(key)

        return {
            "provider_address": provider.address, "function_name": "set_address",
            "key_hash": key_hash, "contract_address": contract.address,
            "contract_name": contract_name, "provider_key": key, "abi": SET_ADDRESS_ABI,
        }

    async def confirm_register(self, contract_name: str, provider_key: str, tx_hash: str) -> Dict[str, Any]:
        """
        确认注册完成，更新数据库缓存

        如果合约之前被 unregister (soft delete)，重新注册时会恢复

        Args:
            contract_name: 合约名称
            provider_key: Provider Key
            tx_hash: 交易哈希

        Returns:
            确认结果
        """
        contract = await ContractDeployment.filter(name=contract_name, network=self.network).first()
        if not contract:
            raise Exception(f"Contract '{contract_name}' not found")

        provider = await self._get_provider_contract()
        config = await ContractConfig.filter(contract_name=contract_name).first()
        key_hash = compute_key_hash(provider_key)
        now = datetime.now()

        # 查找现有记录（包括已删除的）
        existing = await ProviderRegistry.filter(
            provider_address=provider.address, chain_id=provider.chain_id, key=provider_key,
        ).first()

        if existing:
            existing.network = self.network
            existing.key_hash = key_hash
            existing.registered_address = contract.address
            existing.category = config.project_name if config else "unknown"
            existing.contract_name = contract_name
            existing.is_registered = True
            existing.last_synced_at = now
            # 恢复已删除的记录
            if existing.is_deleted:
                existing.is_deleted = False
                existing.deleted_at = None
                existing.deleted_by = None
                logger.info(f"Restored previously unregistered contract: {contract_name}")
            await existing.save()
        else:
            await ProviderRegistry.create(
                provider_address=provider.address, chain_id=provider.chain_id,
                key=provider_key, network=self.network, key_hash=key_hash,
                registered_address=contract.address,
                category=config.project_name if config else "unknown",
                contract_name=contract_name, is_registered=True, is_deleted=False,
                last_synced_at=now,
            )

        logger.info(f"Confirmed registration: {contract_name} -> {provider_key}, tx: {tx_hash}")
        return {
            "status": "registered", "contract_name": contract_name,
            "provider_key": provider_key, "address": contract.address, "tx_hash": tx_hash,
        }

    async def prepare_unregister(self, contract_name: str, provider_key: Optional[str] = None) -> Dict[str, Any]:
        """
        准备解除注册调用参数 (前端钱包签名模式)

        Args:
            contract_name: 合约名称
            provider_key: Provider Key (可选)

        Returns:
            调用参数 dict (target_address 为零地址)
        """
        config, key = await self._get_config_and_key(contract_name, provider_key)
        provider = await self._get_provider_contract()

        # 验证合约已注册
        registry = await ProviderRegistry.filter(
            provider_address=provider.address, chain_id=provider.chain_id,
            key=key, is_deleted=False,
        ).first()
        if not registry or not registry.is_registered:
            raise Exception(f"Contract '{contract_name}' is not registered")

        key_hash = compute_key_hash(key)
        return {
            "provider_address": provider.address, "function_name": "set_address",
            "key_hash": key_hash, "contract_address": ZERO_ADDRESS,
            "contract_name": contract_name, "provider_key": key, "abi": SET_ADDRESS_ABI,
        }

    async def confirm_unregister(self, contract_name: str, provider_key: str, tx_hash: str) -> Dict[str, Any]:
        """
        确认解除注册完成，更新数据库缓存

        Args:
            contract_name: 合约名称
            provider_key: Provider Key
            tx_hash: 交易哈希

        Returns:
            确认结果
        """
        provider = await self._get_provider_contract()

        registry = await ProviderRegistry.filter(
            provider_address=provider.address, chain_id=provider.chain_id,
            key=provider_key, is_deleted=False,
        ).first()
        if not registry:
            raise Exception(f"ProviderRegistry record not found for key '{provider_key}'")

        # 更新记录
        now = datetime.now()
        registry.is_registered = False
        registry.registered_address = ZERO_ADDRESS
        registry.last_synced_at = now
        await registry.save()

        # 软删除记录
        await registry.soft_delete(deleted_by=f"unregister_tx:{tx_hash[:10]}")

        logger.info(f"Confirmed unregistration: {contract_name} -> {provider_key}, tx: {tx_hash}")
        return {
            "success": True, "contract_name": contract_name,
            "provider_key": provider_key, "tx_hash": tx_hash,
            "message": "Contract unregistered successfully",
        }

    async def sync_from_provider(self) -> Dict[str, Any]:
        """
        从链上 Provider 同步状态到 ProviderRegistry

        Returns:
            同步结果统计 {updated, created, total}
        """
        provider = await self._get_provider_contract()

        # 加载 ABI
        async with get_async_minio_adapter() as minio:
            provider_abi = await minio.get_json(provider.abi_path)

        # 获取所有有 provider_key 的合约
        configs = await ContractConfig.filter(provider_key__not_isnull=True)

        updated_count = 0
        created_count = 0
        now = datetime.now()

        async with get_async_web3_adapter() as adapter:
            # 注册合约到 adapter
            adapter.register_contract(provider.address, provider_abi)
            
            for config in configs:
                key = config.provider_key
                key_hash = compute_key_hash(key)

                try:
                    registered_addr = await adapter.call_function(
                        provider.address, "getAddress", [key_hash]
                    )
                except Exception as e:
                    logger.warning(f"Failed to query Provider for key {key}: {e}")
                    registered_addr = ZERO_ADDRESS

                # 更新或创建 ProviderRegistry 记录
                _, created = await ProviderRegistry.update_or_create(
                    provider_address=provider.address, chain_id=provider.chain_id, key=key,
                    defaults={
                        "network": self.network, "key_hash": key_hash,
                        "registered_address": registered_addr, "category": config.project_name,
                        "contract_name": config.contract_name,
                        "is_registered": registered_addr != ZERO_ADDRESS,
                        "last_synced_at": now,
                    },
                )

                if created:
                    created_count += 1
                else:
                    updated_count += 1

                logger.debug(f"{'Created' if created else 'Updated'} registry: {key} -> {registered_addr[:10]}...")

        return {"updated": updated_count, "created": created_count, "total": len(configs)}


def get_contract_registry_service(network: Optional[str] = None) -> ContractRegistryService:
    """获取 Provider 注册服务实例"""
    return ContractRegistryService(network)
