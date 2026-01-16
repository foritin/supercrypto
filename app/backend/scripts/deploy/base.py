#!/usr/bin/env python3
"""
部署配置基础类
==============

定义部署配置的基础数据类和常量。

包含:
    - ContractConfig: 单个合约的部署配置
    - ProjectConfig: 项目部署配置
    - ProviderKey: AddressProvider 中的 Key 定义
    - 公共合约配置 (COMMON_CONTRACTS, STABLECOIN_CONTRACTS)
"""

from dataclasses import dataclass, field
from typing import Optional

from eth_utils import keccak

# ============================================
# 常量定义
# ============================================

ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"


# ============================================
# Provider Key 定义
# ============================================


class ProviderKey:
    """
    AddressProvider 中的合约类型标识

    与 contracts/common/AddressProvider.vy 中的常量保持一致
    """

    # 公共合约
    KYC_MANAGER = keccak(text="KYC_MANAGER")
    USDT = keccak(text="USDT")
    USDC = keccak(text="USDC")
    TIMELOCK = keccak(text="TIMELOCK")
    MULTI_SIG = keccak(text="MULTI_SIG")

    # Vanke 项目合约
    VANKE_RWA_TOKEN = keccak(text="VANKE_RWA_TOKEN")
    VANKE_PLATFORM_TOKEN = keccak(text="VANKE_PLATFORM_TOKEN")
    VANKE_SUBSCRIPTION = keccak(text="VANKE_SUBSCRIPTION")
    VANKE_STAKING = keccak(text="VANKE_STAKING")
    VANKE_LIQUIDITY_MINING = keccak(text="VANKE_LIQUIDITY_MINING")


# ============================================
# 部署配置数据类
# ============================================


@dataclass
class ContractConfig:
    """
    单个合约的部署配置 (纯 Provider 模式)

    Attributes:
        name: 合约名称 (如 "VankeRWAToken")
        contract_class_name: Ape project 中的类名
        scope: 作用域 (global/project)
        contract_type: 功能类型 (registry/kyc/stablecoin/token/defi/...)
        constructor_args: 构造函数参数
        provider_deps: 从 Provider 获取的依赖 Key 列表
        skip_if_exists: 已存在时是否跳过
        register_to_provider: 部署后是否注册到 Provider
        provider_key: Provider 中的 key (bytes32)
        description: 合约描述
    """

    name: str
    contract_class_name: str

    # 分类 (双维度)
    scope: str = "global"
    contract_type: str = "unknown"

    # 构造函数参数
    constructor_args: dict = field(default_factory=dict)

    # 依赖配置 (纯 Provider 模式)
    provider_deps: list[str] = field(default_factory=list)

    # 部署选项
    skip_if_exists: bool = True
    register_to_provider: bool = False
    provider_key: Optional[bytes] = None

    # 元数据
    description: str = ""

    def get_constructor_args(self, deployed: dict, provider=None) -> list:
        """
        解析构造函数参数 (纯 Provider 模式)

        Args:
            deployed: 已部署合约地址字典 {name: address}
            provider: AddressProvider 实例（可选）

        Returns:
            构造函数参数列表
        """
        args = []
        for key, value in self.constructor_args.items():
            if isinstance(value, str) and value == "$PROVIDER":
                # Provider 地址
                args.append(deployed.get("AddressProvider", ZERO_ADDRESS))
            elif isinstance(value, str) and value.startswith("$"):
                # 引用其他已部署合约地址
                ref_name = value[1:]
                args.append(deployed.get(ref_name, ZERO_ADDRESS))
            else:
                args.append(value)
        return args


@dataclass
class ProjectConfig:
    """
    项目部署配置

    Attributes:
        name: 项目名称 (如 "vanke")
        display_name: 显示名称 (如 "Vanke Real Estate")
        contracts: 合约配置列表 (部署顺序由列表顺序决定)
    """

    name: str
    display_name: str
    contracts: list[ContractConfig]


# ============================================
# 公共合约配置 (单独拆分便于独立部署)
# ============================================

# AddressProvider - 中心注册表，必须最先部署
PROVIDER_CONTRACT = ContractConfig(
    name="AddressProvider",
    contract_class_name="AddressProvider",
    scope="global",
    contract_type="registry",
    constructor_args={},
    skip_if_exists=True,
)

# KYC - 身份验证
KYC_CONTRACT = ContractConfig(
    name="KYC",
    contract_class_name="KYC",
    scope="global",
    contract_type="kyc",
    constructor_args={},
    skip_if_exists=True,
    register_to_provider=True,
    provider_key=ProviderKey.KYC_MANAGER,
)

# 公共合约列表 (兼容旧代码)
COMMON_CONTRACTS = [PROVIDER_CONTRACT, KYC_CONTRACT]


# ============================================
# 稳定币合约配置 (GLOBAL)
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
    ),
]


__all__ = [
    # 常量
    "ZERO_ADDRESS",
    "ProviderKey",
    # 数据类
    "ContractConfig",
    "ProjectConfig",
    # 单独合约配置
    "PROVIDER_CONTRACT",
    "KYC_CONTRACT",
    # 合约列表
    "COMMON_CONTRACTS",
    "STABLECOIN_CONTRACTS",
]
