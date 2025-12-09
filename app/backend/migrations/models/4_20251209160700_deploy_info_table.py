from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "deploy_info" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "address" VARCHAR(128) NOT NULL,
    "private_key" VARCHAR(256) NOT NULL,
    "contract_address" VARCHAR(128) NOT NULL,
    "network" VARCHAR(128) NOT NULL
);
COMMENT ON COLUMN "deploy_info"."created_at" IS '创建时间';
COMMENT ON COLUMN "deploy_info"."updated_at" IS '更新时间';
COMMENT ON COLUMN "deploy_info"."address" IS '部署账户地址';
COMMENT ON COLUMN "deploy_info"."private_key" IS '部署账户私钥';
COMMENT ON COLUMN "deploy_info"."contract_address" IS '合约地址';
COMMENT ON COLUMN "deploy_info"."network" IS '部署网络';
COMMENT ON TABLE "deploy_info" IS '部署信息记录';"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS "deploy_info";"""


MODELS_STATE = (
    "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"
)
