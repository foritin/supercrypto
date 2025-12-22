"""
添加 subscription 表 tx_hash + environment 唯一约束
防止并发请求导致的重复认购记录

Migration: 18_20251215120000_add_subscription_tx_hash_unique
"""

from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE UNIQUE INDEX IF NOT EXISTS 
        idx_subscription_tx_hash_env_unique 
        ON subscription(tx_hash, environment) 
        WHERE tx_hash IS NOT NULL;"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP INDEX IF EXISTS idx_subscription_tx_hash_env_unique;"""
