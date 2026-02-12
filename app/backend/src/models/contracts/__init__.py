"""
Contracts Models Package
合约相关模型

模型:
- ContractConfig: 合约配置 (元数据 + 项目配置)
- ContractDeployment: 合约部署记录
- ProviderRegistry: Provider 注册状态
"""

from src.shared.schemas.enums import ContractStatus, NetWork, Network
from src.models.contracts.contract_config import ContractConfig
from src.models.contracts.contract_deployment import ContractDeployment
from src.models.contracts.provider_registry import (
    ZERO_ADDRESS,
    ProviderRegistry,
    check_project_ready,
    compute_key_hash,
    sync_provider_registry,
)

__all__ = [
    # 模型
    "ContractConfig",
    "ContractDeployment",
    # Provider Registry
    "ProviderRegistry",
    # Enums
    "Network",
    "NetWork",  # 向后兼容别名
    "ContractStatus",
    # Constants
    "ZERO_ADDRESS",
    # Functions
    "compute_key_hash",
    "sync_provider_registry",
    "check_project_ready",
]
