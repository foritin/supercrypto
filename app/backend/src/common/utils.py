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
    检查 Tortoise ORM 连接是否可用

    用于定时任务在执行前检查数据库连接状态，
    避免在热重载或应用关闭期间执行数据库操作。

    Returns:
        bool: 连接是否可用
    """
    try:
        conn = Tortoise.get_connection("default")
        # SQLite: 检查连接对象是否存在且未关闭
        # asyncpg: 检查连接池状态 (兼容旧代码)
        pool = getattr(conn, "_pool", None)
        if pool is not None:
            # asyncpg pool 路径
            if getattr(pool, "_closing", False) or getattr(pool, "_closed", False):
                return False
        # SQLite 连接总是可用（文件-based，无连接池）
        return True
    except Exception:
        return False
