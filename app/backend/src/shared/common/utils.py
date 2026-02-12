"""
共享工具函数
提供跨领域的通用工具方法
"""
import math


def calculate_total_pages(total: int, page_size: int) -> int:
    """
    计算总页数

    Args:
        total: 总记录数
        page_size: 每页数量

    Returns:
        int: 总页数
    """
    if page_size <= 0:
        return 0
    return math.ceil(total / page_size)
