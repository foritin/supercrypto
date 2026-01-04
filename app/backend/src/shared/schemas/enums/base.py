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
