from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "asset_contract_binding" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "contract_name" VARCHAR(100) NOT NULL,
    "contract_address" VARCHAR(128) NOT NULL,
    "contract_type" VARCHAR(20) NOT NULL DEFAULT 'project',
    "is_primary" BOOL NOT NULL DEFAULT False,
    "asset_id" INT NOT NULL REFERENCES "asset" ("id") ON DELETE CASCADE,
    CONSTRAINT "uid_asset_contr_asset_i_0846bc" UNIQUE ("asset_id", "contract_name")
);
CREATE INDEX IF NOT EXISTS "idx_asset_contr_contrac_b9ed1e" ON "asset_contract_binding" ("contract_address");
CREATE INDEX IF NOT EXISTS "idx_asset_contr_contrac_9deefc" ON "asset_contract_binding" ("contract_type");
COMMENT ON COLUMN "asset_contract_binding"."contract_name" IS '合约名称';
COMMENT ON COLUMN "asset_contract_binding"."contract_address" IS '合约地址';
COMMENT ON COLUMN "asset_contract_binding"."contract_type" IS '合约类型: common / project';
COMMENT ON COLUMN "asset_contract_binding"."is_primary" IS '是否为主合约';
COMMENT ON COLUMN "asset_contract_binding"."asset_id" IS '关联资产';
COMMENT ON TABLE "asset_contract_binding" IS '资产-合约绑定关联表';
        ALTER TABLE "asset" DROP COLUMN "bound_contracts";"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "asset" ADD "bound_contracts" JSONB;
        COMMENT ON COLUMN "asset"."bound_contracts" IS '绑定的合约地址 {contract_name: address}';
        DROP TABLE IF EXISTS "asset_contract_binding";"""


MODELS_STATE = (
    "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"
    "5a//Aq9zrzQ="
)
