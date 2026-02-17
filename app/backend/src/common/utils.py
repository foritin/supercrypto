"""
共享工具函数
提供跨领域的通用工具方法
"""

import math

from tortoise import Tortoise


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


def is_db_available() -> bool:
    """
    检查 Tortoise ORM 连接池是否可用 (未关闭)

    用于定时任务在执行前检查数据库连接池状态，
    避免在热重载或应用关闭期间执行数据库操作。

    Returns:
        bool: 连接池是否可用
    """
    try:
        conn = Tortoise.get_connection("default")
        # asyncpg pool 关闭后 _pool 会是 None 或处于 closing 状态
        pool = getattr(conn, "_pool", None)
        if pool is None:
            return False
        if getattr(pool, "_closing", False) or getattr(pool, "_closed", False):
            return False
        return True
    except Exception:
        return False
