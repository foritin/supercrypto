"""
共享依赖模块
数据库适配器等通用依赖
"""

from falib.adapter.minio import AsyncMinIOAdapter, SyncMinIOAdapter
from falib.adapter.postgresql import SyncPostgresqlAdapter
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


def get_db_adapter() -> SyncPostgresqlAdapter:
    """获取数据库适配器"""
    host = SETTINGS.POSTGRESQL.HOST
    port = SETTINGS.POSTGRESQL.PORT
    user = SETTINGS.POSTGRESQL.USER
    password = SETTINGS.POSTGRESQL.PASSWORD
    database = SETTINGS.POSTGRESQL.DATABASE
    models = SETTINGS.POSTGRESQL.MODELS
    pool_size = SETTINGS.POSTGRESQL.POOL_SIZE
    echo = SETTINGS.POSTGRESQL.ECHO

    return SyncPostgresqlAdapter(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        models=models,
        pool_size=pool_size,
        echo=echo,
    )


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


def get_minio_adapter() -> SyncMinIOAdapter:
    """获取 MinIO 适配器"""
    endpoint = SETTINGS.MINIO.ENDPOINT
    access_key = SETTINGS.MINIO.ACCESS_KEY
    secret_key = SETTINGS.MINIO.SECRET_KEY
    bucket = SETTINGS.MINIO.BUCKET
    secure = SETTINGS.MINIO.SECURE
    return SyncMinIOAdapter(
        endpoint=endpoint,
        access_key=access_key,
        secret_key=secret_key,
        default_bucket_name=bucket,
        secure=secure,
    )


def get_async_minio_adapter() -> AsyncMinIOAdapter:
    """获取异步 MinIO 适配器"""
    endpoint = SETTINGS.MINIO.ENDPOINT
    access_key = SETTINGS.MINIO.ACCESS_KEY
    secret_key = SETTINGS.MINIO.SECRET_KEY
    bucket = SETTINGS.MINIO.BUCKET
    secure = SETTINGS.MINIO.SECURE
    return AsyncMinIOAdapter(
        endpoint=endpoint,
        access_key=access_key,
        secret_key=secret_key,
        default_bucket_name=bucket,
        secure=secure,
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
