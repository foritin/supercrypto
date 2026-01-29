#!/usr/bin/env python3
"""
公共合约部署配置
================

公共合约（AddressProvider, KYC, 稳定币）的部署配置。

包含:
    - AddressProvider: 中心注册表
    - KYC: 身份验证
    - USDT/USDC: 测试稳定币

Usage:
    ape run deploy_common --network ethereum:hardhat
"""

from ..base import ContractConfig, ProjectConfig, ProviderKey

# ============================================
# AddressProvider - 中心注册表，必须最先部署
# ============================================

PROVIDER_CONTRACT = ContractConfig(
    name="AddressProvider",
    contract_class_name="AddressProvider",
    scope="global",
    contract_type="registry",
    constructor_args={},
    skip_if_exists=True,
    description="地址提供者合约 - 所有合约地址的注册中心",
    dependency_type="primary",
    is_primary=True,
    deploy_order=0,
)

# ============================================
# KYC - 身份验证
# ============================================

KYC_CONTRACT = ContractConfig(
    name="KYC",
    contract_class_name="KYC",
    scope="global",
    contract_type="kyc",
    constructor_args={},
    skip_if_exists=True,
    register_to_provider=True,
    provider_key=ProviderKey.KYC_MANAGER,
    description="KYC 管理合约 - 用户身份验证",
    dependency_type="required",
    deploy_order=1,
)

# ============================================
# 稳定币合约
# ============================================

STABLECOIN_CONTRACTS = [
    ContractConfig(
        name="USDT",
        contract_class_name="USDT",
        scope="global",
        contract_type="stablecoin",
        constructor_args={},
        skip_if_exists=True,
        register_to_provider=True,
        provider_key=ProviderKey.USDT,
        description="USDT 稳定币 (Mock)",
        dependency_type="required",
        deploy_order=2,
    ),
    ContractConfig(
        name="USDC",
        contract_class_name="USDC",
        scope="global",
        contract_type="stablecoin",
        constructor_args={},
        skip_if_exists=True,
        register_to_provider=True,
        provider_key=ProviderKey.USDC,
        description="USDC 稳定币 (Mock)",
        dependency_type="required",
        deploy_order=3,
    ),
]

# ============================================
# Common 项目配置 (合并所有公共合约)
# ============================================

COMMON_PROJECT = ProjectConfig(
    name="common",
    display_name="Common Contracts",
    description="公共基础设施合约",
    version="1.0.0",
    primary_contract="AddressProvider",  # AddressProvider 作为公共合约的主入口
    contracts=[
        PROVIDER_CONTRACT,
        KYC_CONTRACT,
        *STABLECOIN_CONTRACTS,
    ],
)


__all__ = [
    "PROVIDER_CONTRACT",
    "KYC_CONTRACT",
    "STABLECOIN_CONTRACTS",
    "COMMON_PROJECT",
]
