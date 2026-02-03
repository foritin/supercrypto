from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "provider_registry" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "provider_address" VARCHAR(42) NOT NULL,
    "chain_id" INT NOT NULL,
    "network" VARCHAR(20) NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "key_hash" VARCHAR(66) NOT NULL,
    "registered_address" VARCHAR(42) NOT NULL DEFAULT '0x0000000000000000000000000000000000000000',
    "category" VARCHAR(50) NOT NULL,
    "contract_name" VARCHAR(100) NOT NULL,
    "is_registered" BOOL NOT NULL DEFAULT False,
    "last_synced_at" TIMESTAMPTZ,
    CONSTRAINT "uid_provider_re_provide_be731d" UNIQUE ("provider_address", "chain_id", "key")
);
COMMENT ON COLUMN "provider_registry"."provider_address" IS 'AddressProvider 合约地址';
COMMENT ON COLUMN "provider_registry"."chain_id" IS '链 ID';
COMMENT ON COLUMN "provider_registry"."network" IS '网络类型';
COMMENT ON COLUMN "provider_registry"."key" IS 'Provider Key，如 VANKE_RWA_TOKEN';
COMMENT ON COLUMN "provider_registry"."key_hash" IS 'keccak256(key) 的 hex 值';
COMMENT ON COLUMN "provider_registry"."registered_address" IS '当前注册的合约地址';
COMMENT ON COLUMN "provider_registry"."category" IS '分类: common, mock, vanke 等';
COMMENT ON COLUMN "provider_registry"."contract_name" IS '合约名称，如 VankeRWAToken';
COMMENT ON COLUMN "provider_registry"."is_registered" IS '是否已注册 (地址非零)';
COMMENT ON COLUMN "provider_registry"."last_synced_at" IS '最后同步链上状态的时间';
COMMENT ON TABLE "provider_registry" IS 'Provider 注册记录表';
        ALTER TABLE "contractdependency" ADD COLUMN IF NOT EXISTS "provider_key" VARCHAR(100);
        ALTER TABLE "contractdependency" DROP COLUMN IF EXISTS "set_function";
        ALTER TABLE "contractdependency" DROP COLUMN IF EXISTS "source";
        ALTER TABLE "contractdependency" DROP COLUMN IF EXISTS "constraint";
        ALTER TABLE "contractdependency" DROP COLUMN IF EXISTS "bound_at";
        ALTER TABLE "contractdependency" DROP COLUMN IF EXISTS "is_binded";
        COMMENT ON COLUMN "contractdependency"."is_deployed" IS '依赖合约是否已部署';
        COMMENT ON COLUMN "contractdependency"."provider_key" IS 'Provider Key，如 VANKE_RWA_TOKEN';
        CREATE UNIQUE INDEX IF NOT EXISTS "uid_contract_de_contrac_d5db33" ON "contractdependency" ("contract_id", "dependency_id");"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP INDEX IF EXISTS "uid_contract_de_contrac_d5db33";
        ALTER TABLE "contractdependency" ADD "set_function" VARCHAR(100);
        ALTER TABLE "contractdependency" ADD "source" VARCHAR(8) NOT NULL DEFAULT 'setter';
        ALTER TABLE "contractdependency" ADD "constraint" VARCHAR(16) NOT NULL DEFAULT 'rebindable';
        ALTER TABLE "contractdependency" ADD "bound_at" TIMESTAMPTZ;
        ALTER TABLE "contractdependency" ADD "is_binded" BOOL NOT NULL DEFAULT False;
        ALTER TABLE "contractdependency" DROP COLUMN "provider_key";
        COMMENT ON COLUMN "contractdependency"."is_deployed" IS '是否已部署';
        COMMENT ON COLUMN "contractdependency"."set_function" IS 'Setter函数名 (仅source=setter时有效)';
COMMENT ON COLUMN "contractdependency"."source" IS '依赖来源: provider=从AddressProvider获取, setter=通过Setter设置';
COMMENT ON COLUMN "contractdependency"."constraint" IS '绑定约束: rebindable=可重复绑定, once_per_project=项目内一次性, immutable=不可更改';
COMMENT ON COLUMN "contractdependency"."bound_at" IS '绑定时间';
COMMENT ON COLUMN "contractdependency"."is_binded" IS '是否已绑定';
        DROP TABLE IF EXISTS "provider_registry";"""


MODELS_STATE = (
    "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"
    "Dvoejv/wcVTgl6"
)
