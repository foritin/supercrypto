"""
Tortoise ORM / Aerich 配置

根据 SETTINGS.DB.BACKEND 选择数据库后端:
- "sqlite" (默认): 使用本地 SQLite 文件
- "postgresql": 使用 PostgreSQL (需要 asyncpg)
"""

from falib.utils.config import SETTINGS


def _get_sqlite_config() -> dict:
    """构建 SQLite Tortoise ORM 配置"""
    db_config = getattr(SETTINGS, "SQLITE", None)
    db_path = getattr(db_config, "PATH", "E:/cryptoplatform-data/py_backend.db") if db_config else "E:/cryptoplatform-data/py_backend.db"
    models_path = getattr(db_config, "MODELS", "src.models") if db_config else "src.models"

    # 确保 data 目录存在
    from pathlib import Path
    db_file = Path(db_path)
    db_file.parent.mkdir(parents=True, exist_ok=True)

    return {
        "connections": {"default": f"sqlite://{db_path}"},
        "apps": {
            "models": {
                "models": [models_path, "aerich.models"],
                "default_connection": "default",
            }
        },
    }


def _get_postgresql_config() -> dict:
    """构建 PostgreSQL Tortoise ORM 配置 (兼容旧配置)"""
    from falib.adapter.postgresql import get_async_postgresql_adapter
    return get_async_postgresql_adapter().get_config()


# 根据配置选择数据库后端
_backend = getattr(getattr(SETTINGS, "DB", None), "BACKEND", "sqlite").lower()

if _backend == "postgresql":
    TORTOISE_ORM = _get_postgresql_config()
else:
    TORTOISE_ORM = _get_sqlite_config()
