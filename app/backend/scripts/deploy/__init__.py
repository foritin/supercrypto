#!/usr/bin/env python3
"""
SuperCrypto 合约部署框架
========================

统一的部署工具和配置管理。

目录结构:
    scripts/
    ├── deploy/
    │   ├── __init__.py          # 包入口
    │   ├── base.py              # 基础类和配置
    │   ├── executor.py          # 部署执行器
    │   └── projects/            # 项目配置
    │       ├── __init__.py
    │       └── vanke.py
    │
    ├── deploy_provider.py       # 部署 AddressProvider
    ├── deploy_kyc.py            # 部署 KYC
    ├── deploy_stablecoins.py    # 部署稳定币 (USDT, USDC)
    └── deploy_vanke.py          # 部署 Vanke 项目

Usage:
    # 1. 部署 AddressProvider (必须最先)
    ape run deploy_provider --network ethereum:hardhat

    # 2. 部署 KYC
    ape run deploy_kyc --network ethereum:hardhat

    # 3. 部署稳定币 (USDT, USDC)
    ape run deploy_stablecoins --network ethereum:hardhat

    # 4. 部署 Vanke 项目
    ape run deploy_vanke --network ethereum:hardhat

新增项目:
    1. 在 deploy/projects/ 下创建配置文件 (如 greenland.py)
    2. 在 deploy/projects/__init__.py 中注册
    3. 创建 deploy_greenland.py 脚本
"""

from .base import (
    COMMON_CONTRACTS,
    KYC_CONTRACT,
    PROVIDER_CONTRACT,
    STABLECOIN_CONTRACTS,
    ZERO_ADDRESS,
    ContractConfig,
    ProjectConfig,
    ProviderKey,
)
from .executor import (
    deploy_contract,
    get_all_deployed,
    get_chain_id,
    get_current_network,
    get_deployed_contract,
    get_deployer,
    get_global_and_project_deployed,
    get_network_enum,
    record_dependencies,
)
from .projects import (
    PROJECTS,
    get_project_config,
    list_projects,
)

__all__ = [
    # 数据类
    "ContractConfig",
    "ProjectConfig",
    # 单独合约配置
    "PROVIDER_CONTRACT",
    "KYC_CONTRACT",
    # 合约列表
    "COMMON_CONTRACTS",
    "STABLECOIN_CONTRACTS",
    # 项目配置
    "PROJECTS",
    "get_project_config",
    "list_projects",
    # 常量
    "ProviderKey",
    "ZERO_ADDRESS",
    # 执行器
    "get_current_network",
    "get_chain_id",
    "get_network_enum",
    "get_deployer",
    "deploy_contract",
    "get_deployed_contract",
    "get_all_deployed",
    "get_global_and_project_deployed",
    "record_dependencies",
]
