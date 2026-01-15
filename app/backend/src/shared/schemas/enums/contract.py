"""
合约类型和链ID枚举
"""

from enum import Enum

# ===== 合约分类枚举 (双维度) =====


class ContractScope(str, Enum):
    """合约作用域枚举 - 维度1"""

    GLOBAL = "global"  # 全局共享合约
    PROJECT = "project"  # 项目专属合约


class ContractType(str, Enum):
    """合约功能类型枚举 - 维度2"""

    REGISTRY = "registry"  # 注册表 (AddressProvider)
    KYC = "kyc"  # 身份验证 (KYC)
    STABLECOIN = "stablecoin"  # 稳定币 (USDT, USDC)
    GOVERNANCE = "governance"  # 治理 (Timelock, MultiSig)
    TOKEN = "token"  # 代币 (RWA Token, Platform Token)
    DEFI = "defi"  # DeFi (Subscription, Staking, Mining)
    ORACLE = "oracle"  # 预言机 (RWAOracle)
    UNKNOWN = "unknown"  # 未知


class ChainID(int, Enum):
    """链ID枚举"""

    HARDHAT = 31337
    ETHEREUM = 1
    SEPOLIA = 11155111
    BSC = 56
    POLYGON = 137
    ARBITRUM = 42161
    OPTIMISM = 10
    BASE = 8453
    AVALANCHE = 43114
    FANTOM = 250
    GNOSIS = 100
    MOONBEAM = 1284
    MOONRIVER = 1285
    POL = 1313161554

    @classmethod
    def from_value(cls, value: int) -> "ChainID":
        """从值获取链ID"""
        try:
            return cls(value)
        except ValueError:
            raise ValueError(f"Invalid chain ID: {value}")

    @classmethod
    def from_value_to_name(cls, value: int) -> str:
        """从值获取链名称（小写）"""
        try:
            return cls(value).name.lower()
        except ValueError:
            raise ValueError(f"Invalid chain ID: {value}")


class ContractStatus(str, Enum):
    """合约状态枚举"""

    ACTIVE = "active"
    PAUSED = "paused"
    DEPRECATED = "deprecated"
    FROZEN = "frozen"


# ===== 项目合约注册表枚举 (Epic 10) =====


class DependencyType(str, Enum):
    """依赖类型枚举"""

    PRIMARY = "primary"  # 主合约 - 项目入口
    REQUIRED = "required"  # 必须依赖 - 核心基础设施
    BUSINESS = "business"  # 业务合约 - 核心业务逻辑
    OPTIONAL = "optional"  # 可选依赖 - 增强功能


class ContractRegistryStatus(str, Enum):
    """合约注册表状态枚举"""

    NOT_REGISTERED = "not_registered"  # 未注册
    REGISTERED = "registered"  # 已注册配置
    DEPLOYED = "deployed"  # 已部署，依赖未绑定
    BOUND = "bound"  # 依赖已绑定
    ACTIVE = "active"  # 已激活使用
    DEPRECATED = "deprecated"  # 已废弃


class ProjectReadiness(str, Enum):
    """项目就绪状态枚举"""

    NOT_READY = "not_ready"  # 不可用 - 主合约或 REQUIRED 未就绪
    PARTIALLY_READY = "partially_ready"  # 部分可用 - BUSINESS 部分未就绪
    FULLY_READY = "fully_ready"  # 完全可用 - 所有必要合约已就绪
