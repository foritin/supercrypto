""" """

from enum import Enum


class NetWork(str, Enum):
    """网络类型枚举"""

    ETHEREUM = "mainnet"
    SEPOLIA = "sepolia"
    HARDHAT = "hardhat"
    BSC = "bsc"
    POLYGON = "polygon"
    ARBITRUM = "arbitrum"
    OPTIMISM = "optimism"
    BASE = "base"
    AVALANCHE = "avalanche"
    FANTOM = "fantom"
    GNOSIS = "gnosis"
    MOONBEAM = "moonbeam"
    MOONRIVER = "moonriver"
    POL = "pol"

    @classmethod
    def from_value(cls, value: str) -> "NetWork":
        """从值获取网络类型"""
        return cls(value)

    @classmethod
    def from_value_to_name(cls, value: str) -> str:
        """从值获取网络类型名称"""
        return cls(value).name.lower()
