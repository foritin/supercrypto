"""
账户相关枚举
"""
from enum import Enum


class NetType(str, Enum):
    """网络类型枚举 (账户)"""
    LOCAL = "local"
    TEST = "test"
    MAIN = "main"


class NetworkType(str, Enum):
    """网络类型枚举 (钱包)"""
    ETHEREUM = "ethereum"
    BSC = "bsc"
    POLYGON = "polygon"
    ARBITRUM = "arbitrum"
    OPTIMISM = "optimism"

