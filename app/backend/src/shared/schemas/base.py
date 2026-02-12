"""
基础Schema模型 - 可复用混入类的向后兼容导出
"""

# 从 mixins 导入，保持向后兼容
from .mixins import IDMixin, TimestampMixin

# 保持向后兼容的导出
__all__ = [
    "TimestampMixin",
    "IDMixin",
]
