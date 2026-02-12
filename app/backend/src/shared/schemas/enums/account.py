"""
账户相关枚举

注意: NetType 和 NetworkType 已废弃，统一使用 base.py 中的 Network 枚举
此处保留向后兼容别名
"""

from .base import Network

# 向后兼容别名 (已废弃，请使用 Network)
NetType = Network
NetworkType = Network
