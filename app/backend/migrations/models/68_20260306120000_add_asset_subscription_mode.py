from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE \"asset\"
        ADD COLUMN IF NOT EXISTS \"subscription_mode\" VARCHAR(10) NOT NULL DEFAULT 'both';"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE \"asset\"
        DROP COLUMN IF EXISTS \"subscription_mode\";"""


MODELS_STATE = ""
