"""
开发工具路由依赖

提供统一的环境检查依赖，确保 dev 端点仅在 dev/test 环境可用。
"""

from falib.utils.config import SETTINGS

from src.common.exceptions import ForbiddenException


async def require_dev_environment():
    """
    开发环境检查依赖

    仅允许在 dev 或 test 环境下访问开发工具端点。
    在 production 环境下返回 403。

    双重保护机制:
    1. router.py 中通过条件判断控制路由注册（静态保护）
    2. 本依赖在运行时进行环境检查（动态保护）
    """
    if SETTINGS.environment not in ("dev", "test"):
        raise ForbiddenException(
            message="Developer tools only available in dev/test environment"
        )
