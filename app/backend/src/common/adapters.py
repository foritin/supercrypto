"""
共享依赖模块
数据库适配器等通用依赖
"""

import sqlite3
from pathlib import Path

from falib.adapter.redis import AsyncRedisAdapter, SyncRedisAdapter
from falib.adapter.web3 import AsyncWeb3Adapter
from falib.utils.config import SETTINGS
from falib.utils.log import get_logger
from fastapi.security import OAuth2PasswordBearer

TOKEN_URL = "api/v1/public/auth/token"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=TOKEN_URL)

# Redis 单例适配器
_async_redis_adapter: AsyncRedisAdapter | None = None
_redis_logger = get_logger("system.adapter.redis")


def get_db_adapter() -> sqlite3.Connection:
    """获取 SQLite 数据库连接（同步）

    用于脚本等同步场景。返回的连接需由调用方关闭。
    """
    db_config = getattr(SETTINGS, "SQLITE", None)
    db_path = getattr(db_config, "PATH", "E:/cryptoplatform-data/py_backend.db") if db_config else "E:/cryptoplatform-data/py_backend.db"

    # 确保目录存在
    db_file = Path(db_path)
    db_file.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(str(db_file))
    conn.row_factory = sqlite3.Row
    # 开启 WAL 模式提升并发读性能
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def get_redis_adapter() -> SyncRedisAdapter:
    """获取 Redis 适配器"""
    host = SETTINGS.REDIS.HOST
    port = SETTINGS.REDIS.PORT
    db = SETTINGS.REDIS.DB
    password = SETTINGS.REDIS.PASSWORD
    return SyncRedisAdapter(
        host=host,
        port=port,
        db=db,
        password=password,
    )


def get_async_web3_adapter() -> AsyncWeb3Adapter:
    """获取异步 Web3 适配器"""
    rpc_url = SETTINGS.CRYPTO.MAINNET_URL
    return AsyncWeb3Adapter(
        rpc_url=rpc_url,
    )


def get_async_redis_adapter() -> AsyncRedisAdapter:
    """
    获取异步 Redis 适配器（单例模式）

    复用同一个连接池，避免每次请求创建新连接。
    适配器内部使用引用计数管理连接生命周期。

    Returns:
        AsyncRedisAdapter: 单例 Redis 适配器实例
    """
    global _async_redis_adapter
    if _async_redis_adapter is None:
        _redis_logger.info("🔧 Creating singleton AsyncRedisAdapter instance")
        _async_redis_adapter = AsyncRedisAdapter(
            host=SETTINGS.REDIS.HOST,
            port=SETTINGS.REDIS.PORT,
            db=SETTINGS.REDIS.DB,
            password=SETTINGS.REDIS.PASSWORD,
            logger=_redis_logger,
        )
    return _async_redis_adapter


async def close_async_redis_adapter() -> None:
    """
    关闭异步 Redis 适配器（应用关闭时调用）
    """
    global _async_redis_adapter
    if _async_redis_adapter is not None:
        _redis_logger.info("🔌 Closing singleton AsyncRedisAdapter instance")
        # 强制断开连接
        await _async_redis_adapter._disconnect()
        _async_redis_adapter = None
