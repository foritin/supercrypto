from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "contract_deployment" DROP COLUMN IF EXISTS "symbol";
    """


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "contract_deployment" ADD COLUMN IF NOT EXISTS "symbol" VARCHAR(20);
        COMMENT ON COLUMN "contract_deployment"."symbol" IS 'Token Symbol，用于标识代币符号';
    """
