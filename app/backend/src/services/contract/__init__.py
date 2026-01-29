"""
Contract Domain
合约管理领域

子服务:
- ContractStatusService: 状态查询
- ContractRegistryService: Provider 注册
- ContractSyncService: 同步与主合约管理

主服务:
- ContractService: 组合门面，委托给子服务
"""

from src.services.contract.registry_service import (
    ContractRegistryService,
    get_contract_registry_service,
)
from src.services.contract.service import ContractService, get_contract_service
from src.services.contract.status_service import (
    ContractStatusService,
    get_contract_status_service,
)
from src.services.contract.sync_service import (
    ContractSyncService,
    get_contract_sync_service,
)

__all__ = [
    # 主服务 (组合门面)
    "ContractService",
    "get_contract_service",
    # 子服务
    "ContractStatusService",
    "get_contract_status_service",
    "ContractRegistryService",
    "get_contract_registry_service",
    "ContractSyncService",
    "get_contract_sync_service",
]
