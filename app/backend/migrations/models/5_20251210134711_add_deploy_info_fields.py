from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "deploy_info" ADD "deployer_address" VARCHAR(128) NOT NULL;
        ALTER TABLE "deploy_info" ADD "is_active" BOOL NOT NULL DEFAULT True;
        ALTER TABLE "deploy_info" ADD "contract_version" VARCHAR(32) DEFAULT '1.0.0';
        ALTER TABLE "deploy_info" ADD "contract_name" VARCHAR(64) NOT NULL;
        ALTER TABLE "deploy_info" ADD "dependencies" JSONB;
        ALTER TABLE "deploy_info" ADD "deploy_step" VARCHAR(32) NOT NULL;
        ALTER TABLE "deploy_info" ADD "tx_hash" VARCHAR(128);
        ALTER TABLE "deploy_info" DROP COLUMN "address";
        ALTER TABLE "deploy_info" DROP COLUMN "private_key";
        ALTER TABLE "deploy_info" ALTER COLUMN "created_at" DROP NOT NULL;
        ALTER TABLE "deploy_info" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at"::TIMESTAMPTZ;
        COMMENT ON COLUMN "deploy_info"."created_at" IS NULL;
        ALTER TABLE "deploy_info" ALTER COLUMN "network" TYPE VARCHAR(32) USING "network"::VARCHAR(32);
        COMMENT ON COLUMN "deploy_info"."network" IS '部署网络: local, sepolia, mainnet';
        ALTER TABLE "deploy_info" ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ USING "updated_at"::TIMESTAMPTZ;
        ALTER TABLE "deploy_info" ALTER COLUMN "updated_at" DROP NOT NULL;
        COMMENT ON COLUMN "deploy_info"."updated_at" IS NULL;
        COMMENT ON COLUMN "deploy_info"."deployer_address" IS '部署者地址';
COMMENT ON COLUMN "deploy_info"."is_active" IS '是否为当前活跃部署';
COMMENT ON COLUMN "deploy_info"."contract_version" IS '合约版本';
COMMENT ON COLUMN "deploy_info"."contract_name" IS '合约名称: MockUSDT, KYCManager, RWATokenSTO...';
COMMENT ON COLUMN "deploy_info"."dependencies" IS '依赖的合约地址, 如 {''KYCManager'': ''0x...''}';
COMMENT ON COLUMN "deploy_info"."deploy_step" IS '部署阶段: 1_mocks, 2_sto_base, 3_sto_business, 4_oracle';
COMMENT ON COLUMN "deploy_info"."tx_hash" IS '部署交易哈希';
        CREATE UNIQUE INDEX IF NOT EXISTS "uid_deploy_info_deploy__7fcba5" ON "deploy_info" ("deploy_step", "contract_name", "network", "is_active");
        CREATE INDEX IF NOT EXISTS "idx_deploy_info_is_acti_d675d4" ON "deploy_info" ("is_active");
        CREATE INDEX IF NOT EXISTS "idx_deploy_info_contrac_abc985" ON "deploy_info" ("contract_name");
        CREATE INDEX IF NOT EXISTS "idx_deploy_info_deploy__7fe8be" ON "deploy_info" ("deploy_step");
        CREATE INDEX IF NOT EXISTS "idx_deploy_info_network_703aed" ON "deploy_info" ("network");"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP INDEX IF EXISTS "idx_deploy_info_network_703aed";
        DROP INDEX IF EXISTS "idx_deploy_info_deploy__7fe8be";
        DROP INDEX IF EXISTS "idx_deploy_info_contrac_abc985";
        DROP INDEX IF EXISTS "idx_deploy_info_is_acti_d675d4";
        DROP INDEX IF EXISTS "uid_deploy_info_deploy__7fcba5";
        ALTER TABLE "deploy_info" ADD "address" VARCHAR(128) NOT NULL;
        ALTER TABLE "deploy_info" ADD "private_key" VARCHAR(256) NOT NULL;
        ALTER TABLE "deploy_info" DROP COLUMN "deployer_address";
        ALTER TABLE "deploy_info" DROP COLUMN "is_active";
        ALTER TABLE "deploy_info" DROP COLUMN "contract_version";
        ALTER TABLE "deploy_info" DROP COLUMN "contract_name";
        ALTER TABLE "deploy_info" DROP COLUMN "dependencies";
        ALTER TABLE "deploy_info" DROP COLUMN "deploy_step";
        ALTER TABLE "deploy_info" DROP COLUMN "tx_hash";
        ALTER TABLE "deploy_info" ALTER COLUMN "created_at" SET NOT NULL;
        COMMENT ON COLUMN "deploy_info"."created_at" IS '创建时间';
        ALTER TABLE "deploy_info" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at"::TIMESTAMPTZ;
        COMMENT ON COLUMN "deploy_info"."network" IS '部署网络';
        ALTER TABLE "deploy_info" ALTER COLUMN "network" TYPE VARCHAR(128) USING "network"::VARCHAR(128);
        ALTER TABLE "deploy_info" ALTER COLUMN "updated_at" SET NOT NULL;
        COMMENT ON COLUMN "deploy_info"."updated_at" IS '更新时间';
        ALTER TABLE "deploy_info" ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ USING "updated_at"::TIMESTAMPTZ;
        COMMENT ON COLUMN "deploy_info"."address" IS '部署账户地址';
COMMENT ON COLUMN "deploy_info"."private_key" IS '部署账户私钥';"""


MODELS_STATE = (
    "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"
    "PXrbBpPrwip7KDcyt6gHUfB070Orz8+geXU+FC"
)
