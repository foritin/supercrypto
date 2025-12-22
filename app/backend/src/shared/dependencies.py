"""
共享依赖模块
数据库适配器等通用依赖
"""

from falib.adapter.postgresql import PostgresqlAdapterSync
from falib.adapter.redis import RedisAdapter
from fastapi.security import OAuth2PasswordBearer

TOKEN_URL = "api/v1/auth/token"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=TOKEN_URL)


def get_db_adapter() -> PostgresqlAdapterSync:
    """获取数据库适配器"""
    return PostgresqlAdapterSync()


def get_redis_adapter() -> RedisAdapter:
    """获取 Redis 适配器"""
    return RedisAdapter()
