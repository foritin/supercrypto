"""
合约类型和链ID枚举
"""

from enum import Enum


class ContractModule(str, Enum):
    """合约模块枚举"""

    STABLECOIN = "stablecoin"
    BUSINESS = "business"
    ORACLE = "oracle"
    KYC = "kyc"
    LP = "lp"


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
