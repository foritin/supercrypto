"""
共享工具函数
提供跨领域的通用工具方法
"""
import math
from datetime import datetime
from typing import Any, Dict, List, Optional


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


def format_datetime(dt: Optional[datetime], format_str: str = "%Y-%m-%d %H:%M:%S") -> Optional[str]:
    """
    格式化日期时间

    Args:
        dt: datetime对象
        format_str: 格式字符串

    Returns:
        Optional[str]: 格式化后的字符串或None
    """
    if dt is None:
        return None
    return dt.strftime(format_str)


def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
    """
    安全除法（避免除零错误）

    Args:
        numerator: 分子
        denominator: 分母
        default: 默认值（当分母为0时）

    Returns:
        float: 计算结果或默认值
    """
    if denominator == 0:
        return default
    return numerator / denominator


def truncate_string(text: str, max_length: int, suffix: str = "...") -> str:
    """
    截断字符串

    Args:
        text: 原始字符串
        max_length: 最大长度
        suffix: 后缀

    Returns:
        str: 截断后的字符串
    """
    if len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)] + suffix


def mask_sensitive_data(data: str, show_first: int = 4, show_last: int = 4, mask_char: str = "*") -> str:
    """
    遮蔽敏感数据（如地址、私钥）

    Args:
        data: 敏感数据
        show_first: 显示前几位
        show_last: 显示后几位
        mask_char: 遮蔽字符

    Returns:
        str: 遮蔽后的数据

    Example:
        mask_sensitive_data("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", 6, 4)
        # 输出: "0x742d****bEb"
    """
    if len(data) <= show_first + show_last:
        return data

    masked_length = len(data) - show_first - show_last
    return data[:show_first] + (mask_char * min(masked_length, 8)) + data[-show_last:]


def remove_none_values(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    移除字典中值为None的项

    Args:
        data: 原始字典

    Returns:
        Dict: 清理后的字典
    """
    return {k: v for k, v in data.items() if v is not None}


def chunk_list(items: List[Any], chunk_size: int) -> List[List[Any]]:
    """
    将列表分块

    Args:
        items: 原始列表
        chunk_size: 每块大小

    Returns:
        List[List]: 分块后的列表

    Example:
        chunk_list([1, 2, 3, 4, 5], 2)
        # 输出: [[1, 2], [3, 4], [5]]
    """
    return [items[i:i + chunk_size] for i in range(0, len(items), chunk_size)]

