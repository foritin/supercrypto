"""
合约服务 - 组合模式门面
_Requirements: 3.1, 3.2_

数据来源:
- ContractConfig 表: 合约配置、依赖关系
- ContractDeployment 表: 合约部署信息
- ProviderRegistry 表: Provider 注册状态

本服务作为门面，通过组合模式委托给子服务:
- ContractStatusService: 状态查询
- ContractRegistryService: Provider 注册
- ContractSyncService: 同步与主合约管理
"""

from typing import Any, Dict, Optional

from falib.utils.config import SETTINGS
from falib.utils.log import get_logger

from src.models.contracts.contract_deployment import ContractDeployment
from src.services.contract.registry_service import (
    ContractRegistryService,
    get_contract_registry_service,
)
from src.services.contract.status_service import (
    ContractStatusService,
    get_contract_status_service,
)
from src.services.contract.sync_service import (
    ContractSyncService,
    get_contract_sync_service,
)

logger = get_logger("business.contract.service")


class ContractService:
    """
    合约服务 (组合模式门面)

    通过延迟加载的属性访问子服务，保持向后兼容的 API。
    """

    def __init__(self, network: Optional[str] = None):
        self.network = network or SETTINGS.network
        self._status_service: Optional[ContractStatusService] = None
        self._registry_service: Optional[ContractRegistryService] = None
        self._sync_service: Optional[ContractSyncService] = None

    # ========== 子服务属性 (延迟加载) ==========

    @property
    def status(self) -> ContractStatusService:
        """状态查询子服务"""
        if self._status_service is None:
            self._status_service = get_contract_status_service(self.network)
        return self._status_service

    @property
    def registry(self) -> ContractRegistryService:
        """Provider 注册子服务"""
        if self._registry_service is None:
            self._registry_service = get_contract_registry_service(self.network)
        return self._registry_service

    @property
    def sync(self) -> ContractSyncService:
        """同步与主合约管理子服务"""
        if self._sync_service is None:
            self._sync_service = get_contract_sync_service(self.network)
        return self._sync_service

    # ========== 状态查询方法 (委托给 status_service) ==========

    async def get_contract_address(
        self, project_name: str, contract_name: str
    ) -> Optional[str]:
        """获取单个合约地址"""
        return await self.status.get_contract_address(project_name, contract_name)

    async def get_public_contract_address(
        self, contract_name: str
    ) -> Optional[Dict[str, Any]]:
        """获取公开合约地址（供 Public Router 使用）_Requirements: 1.3_"""
        return await self.status.get_public_contract_address(contract_name)

    async def get_contract_status(self) -> dict:
        """获取合约状态列表（纯 Provider 模式）Requirements: 4.1, 4.6, 7.3, 7.4"""
        return await self.status.get_contract_status()

    async def get_provider_status(self, category: Optional[str] = None) -> dict:
        """获取 Provider 注册状态详情"""
        return await self.status.get_provider_status(category)

    async def get_dependency_graph(self) -> dict:
        """获取合约依赖关系图数据（纯 Provider 模式）"""
        return await self.status.get_dependency_graph()

    async def get_project_primary_contract(
        self, project_name: str
    ) -> Optional[ContractDeployment]:
        """获取项目的主合约 Validates: Requirements 5.5"""
        return await self.status.get_project_primary_contract(project_name)

    async def get_all_contracts(self) -> list:
        """获取所有合约列表"""
        return await self.status.get_all_contracts()

    # ========== Provider 注册方法 (委托给 registry_service) ==========

    async def prepare_register(
        self,
        contract_name: str,
        provider_key: Optional[str] = None,
    ) -> dict:
        """准备注册调用参数 (前端钱包签名模式)"""
        return await self.registry.prepare_register(contract_name, provider_key)

    async def confirm_register(
        self,
        contract_name: str,
        provider_key: str,
        tx_hash: str,
    ) -> dict:
        """确认注册完成，更新数据库缓存"""
        return await self.registry.confirm_register(contract_name, provider_key, tx_hash)

    async def prepare_unregister(
        self,
        contract_name: str,
        provider_key: Optional[str] = None,
    ) -> dict:
        """准备解除注册调用参数 (前端钱包签名模式)"""
        return await self.registry.prepare_unregister(contract_name, provider_key)

    async def confirm_unregister(
        self,
        contract_name: str,
        provider_key: str,
        tx_hash: str,
    ) -> dict:
        """确认解除注册完成，更新数据库缓存"""
        return await self.registry.confirm_unregister(contract_name, provider_key, tx_hash)

    async def sync_from_provider(self) -> Dict[str, Any]:
        """从链上 Provider 同步状态到 ProviderRegistry"""
        return await self.registry.sync_from_provider()

    # ========== 同步与主合约管理方法 (委托给 sync_service) ==========

    async def update_registry_record(self, contract_name: str, address: str):
        """手动更新本地合约记录"""
        return await self.sync.update_registry_record(contract_name, address)

    async def set_primary(self, contract_id: int) -> ContractDeployment:
        """设置合约为主合约"""
        return await self.sync.set_primary(contract_id)

    async def unset_primary(self, contract_id: int) -> ContractDeployment:
        """取消合约的主合约标记"""
        return await self.sync.unset_primary(contract_id)


def get_contract_service(network: Optional[str] = None) -> ContractService:
    """获取合约服务实例"""
    return ContractService(network)
