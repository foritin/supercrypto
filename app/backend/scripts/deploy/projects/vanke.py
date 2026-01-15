#!/usr/bin/env python3
"""
Vanke 项目部署配置
==================

万科房地产 RWA 项目的合约部署配置。

项目合约:
    - VankeRWAToken: RWA 证券型代币 (ERC1404)
    - VankePlatformToken: 平台治理代币
    - VankeSubscription: 代币认购合约
    - VankeStaking: 代币质押合约
    - VankeLiquidityMining: 流动性挖矿合约

Usage:
    ape run deploy_vanke --network ethereum:hardhat
"""

from deploy.base import ZERO_ADDRESS, ContractConfig, ProjectConfig, ProviderKey

# ============================================
# Vanke Provider Key 定义
# ============================================


class VankeProviderKey:
    """Vanke 项目在 AddressProvider 中的 Key"""

    RWA_TOKEN = ProviderKey.VANKE_RWA_TOKEN
    PLATFORM_TOKEN = ProviderKey.VANKE_PLATFORM_TOKEN
    SUBSCRIPTION = ProviderKey.VANKE_SUBSCRIPTION
    STAKING = ProviderKey.VANKE_STAKING
    LIQUIDITY_MINING = ProviderKey.VANKE_LIQUIDITY_MINING


# ============================================
# Vanke 项目配置 (纯 Provider 模式)
# ============================================

VANKE_PROJECT = ProjectConfig(
    name="vanke",
    display_name="Vanke Real Estate",
    contracts=[
        # 1. RWA 代币 - TOKEN 类型
        ContractConfig(
            name="VankeRWAToken",
            contract_class_name="VankeRWAToken",
            scope="project",
            contract_type="token",
            constructor_args={
                "_address_provider": "$PROVIDER",
            },
            provider_deps=["KYC_MANAGER"],
            register_to_provider=True,
            provider_key=VankeProviderKey.RWA_TOKEN,
        ),
        # 2. 平台代币 - TOKEN 类型
        ContractConfig(
            name="VankePlatformToken",
            contract_class_name="VankePlatformToken",
            scope="project",
            contract_type="token",
            constructor_args={},
            register_to_provider=True,
            provider_key=VankeProviderKey.PLATFORM_TOKEN,
        ),
        # 3. 认购合约 - DEFI 类型
        ContractConfig(
            name="VankeSubscription",
            contract_class_name="VankeSubscription",
            scope="project",
            contract_type="defi",
            constructor_args={
                "_address_provider": "$PROVIDER",
            },
            provider_deps=["KYC_MANAGER", "USDT", "VANKE_RWA_TOKEN"],
            register_to_provider=True,
            provider_key=VankeProviderKey.SUBSCRIPTION,
        ),
        # 4. 质押合约 - DEFI 类型
        ContractConfig(
            name="VankeStaking",
            contract_class_name="VankeStaking",
            scope="project",
            contract_type="defi",
            constructor_args={
                "_address_provider": "$PROVIDER",
            },
            provider_deps=[
                "KYC_MANAGER",
                "VANKE_RWA_TOKEN",
                "VANKE_PLATFORM_TOKEN",
                "VANKE_SUBSCRIPTION",
            ],
            register_to_provider=True,
            provider_key=VankeProviderKey.STAKING,
        ),
        # 5. 流动性挖矿 - DEFI 类型
        ContractConfig(
            name="VankeLiquidityMining",
            contract_class_name="VankeLiquidityMining",
            scope="project",
            contract_type="defi",
            constructor_args={
                "_address_provider": "$PROVIDER",
                "_lp_token": ZERO_ADDRESS,  # 外部 LP token，后续设置
            },
            provider_deps=["KYC_MANAGER", "VANKE_PLATFORM_TOKEN"],
            register_to_provider=True,
            provider_key=VankeProviderKey.LIQUIDITY_MINING,
        ),
    ],
)


__all__ = [
    "VANKE_PROJECT",
    "VankeProviderKey",
]
