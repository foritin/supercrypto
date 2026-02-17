"""
Contracts Models Package
合约相关模型

模型:
- ContractConfig: 合约配置 (元数据 + 项目配置)
- ContractDeployment: 合约部署记录
- ProviderRegistry: Provider 注册状态
"""

from src.models.contracts.contract_config import ContractConfig
from src.models.contracts.contract_deployment import ContractDeployment
from src.models.contracts.provider_registry import (
    ZERO_ADDRESS,
    ProviderRegistry,
    compute_key_hash,
)
from src.schemas.enums import ContractStatus, NetWork, Network

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
]
