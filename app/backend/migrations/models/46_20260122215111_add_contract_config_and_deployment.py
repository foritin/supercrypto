from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "contract_config" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "contract_name" VARCHAR(100) NOT NULL UNIQUE,
    "project_name" VARCHAR(100) NOT NULL,
    "provider_key" VARCHAR(100),
    "provider_key_hash" VARCHAR(66),
    "dependencies" JSONB NOT NULL,
    "contract_type" VARCHAR(50),
    "scope" VARCHAR(20) NOT NULL DEFAULT 'project',
    "description" TEXT,
    "display_name" VARCHAR(200),
    "version" VARCHAR(20),
    "dependency_type" VARCHAR(20) NOT NULL DEFAULT 'business',
    "is_primary" BOOL NOT NULL DEFAULT False,
    "module" VARCHAR(128),
    "required_deps" JSONB NOT NULL,
    "optional_deps" JSONB NOT NULL,
    "deploy_order" INT NOT NULL DEFAULT 100,
    "allow_zero_address" BOOL NOT NULL DEFAULT False,
    "environments" JSONB NOT NULL,
    "production_address" VARCHAR(64)
);
CREATE INDEX IF NOT EXISTS "idx_contract_co_project_ffb2d4" ON "contract_config" ("project_name");
CREATE INDEX IF NOT EXISTS "idx_contract_co_provide_bdceda" ON "contract_config" ("provider_key");
COMMENT ON COLUMN "contract_config"."contract_name" IS '合约名称，如 VankeRWAToken';
COMMENT ON COLUMN "contract_config"."project_name" IS '项目名称: common, stablecoin, vanke, mock 等';
COMMENT ON COLUMN "contract_config"."provider_key" IS '对应的 Provider Key 名称，如 VANKE_RWA_TOKEN';
COMMENT ON COLUMN "contract_config"."provider_key_hash" IS 'keccak256(provider_key) 的 hex 值';
COMMENT ON COLUMN "contract_config"."dependencies" IS '依赖的 Provider Key 列表 (JSON Array)';
COMMENT ON COLUMN "contract_config"."contract_type" IS '合约类型: registry, kyc, stablecoin, token, defi';
COMMENT ON COLUMN "contract_config"."scope" IS '作用域: global (公共) / project (项目私有)';
COMMENT ON COLUMN "contract_config"."description" IS '合约描述';
COMMENT ON COLUMN "contract_config"."display_name" IS '显示名称';
COMMENT ON COLUMN "contract_config"."version" IS '合约版本';
COMMENT ON COLUMN "contract_config"."dependency_type" IS '依赖类型: primary, required, business, optional';
COMMENT ON COLUMN "contract_config"."is_primary" IS '是否为项目主合约 (入口合约)';
COMMENT ON COLUMN "contract_config"."module" IS '合约所属模块，如 token, defi';
COMMENT ON COLUMN "contract_config"."required_deps" IS '必须依赖的 Provider Key 列表';
COMMENT ON COLUMN "contract_config"."optional_deps" IS '可选依赖的 Provider Key 列表';
COMMENT ON COLUMN "contract_config"."deploy_order" IS '部署顺序，数值越小越先部署';
COMMENT ON COLUMN "contract_config"."allow_zero_address" IS '是否允许零地址依赖 (用于可选依赖)';
COMMENT ON COLUMN "contract_config"."environments" IS '支持的环境列表，如 [''local'', ''sepolia'', ''mainnet'']';
COMMENT ON COLUMN "contract_config"."production_address" IS '生产环境预设地址 (如有)';
COMMENT ON TABLE "contract_config" IS '合约配置表 - 整合元数据和项目配置';
        CREATE TABLE IF NOT EXISTS "contract_deployment" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "name" VARCHAR(255) NOT NULL,
    "address" VARCHAR(255) NOT NULL UNIQUE,
    "deployer_address" VARCHAR(255) NOT NULL,
    "network" VARCHAR(255) NOT NULL,
    "chain_id" BIGINT NOT NULL,
    "scope" VARCHAR(50) NOT NULL DEFAULT 'global',
    "contract_type" VARCHAR(50) NOT NULL DEFAULT 'unknown',
    "project_name" VARCHAR(255) NOT NULL,
    "tx_hash" VARCHAR(255) NOT NULL,
    "abi_path" VARCHAR(255),
    "status" VARCHAR(255) NOT NULL DEFAULT 'active',
    "is_primary" BOOL NOT NULL DEFAULT False,
    "symbol" VARCHAR(20),
    "bindings" JSONB,
    "deploy_block" BIGINT,
    "config_id" INT REFERENCES "contract_config" ("id") ON DELETE CASCADE,
    CONSTRAINT "uid_contract_de_name_a95877" UNIQUE ("name", "chain_id")
);
COMMENT ON COLUMN "contract_deployment"."name" IS '合约名称';
COMMENT ON COLUMN "contract_deployment"."address" IS '合约地址';
COMMENT ON COLUMN "contract_deployment"."deployer_address" IS '部署者地址';
COMMENT ON COLUMN "contract_deployment"."network" IS '网络类型';
COMMENT ON COLUMN "contract_deployment"."chain_id" IS '链ID (EIP-155)';
COMMENT ON COLUMN "contract_deployment"."scope" IS '作用域: global (公共) / project (项目私有)';
COMMENT ON COLUMN "contract_deployment"."contract_type" IS '功能类型: registry, kyc, stablecoin, token, defi 等';
COMMENT ON COLUMN "contract_deployment"."project_name" IS '项目名称';
COMMENT ON COLUMN "contract_deployment"."tx_hash" IS '部署交易哈希';
COMMENT ON COLUMN "contract_deployment"."abi_path" IS 'ABI 文件路径';
COMMENT ON COLUMN "contract_deployment"."status" IS '合约状态: active, paused, deprecated, frozen';
COMMENT ON COLUMN "contract_deployment"."is_primary" IS '是否为项目主合约（RWA Token），每个项目只能有一个主合约';
COMMENT ON COLUMN "contract_deployment"."symbol" IS 'Token Symbol，用于标识代币符号';
COMMENT ON COLUMN "contract_deployment"."bindings" IS '依赖绑定状态，格式: {provider_key: bound_address}';
COMMENT ON COLUMN "contract_deployment"."deploy_block" IS '部署区块号';
COMMENT ON COLUMN "contract_deployment"."config_id" IS '关联的合约配置';
COMMENT ON TABLE "contract_deployment" IS '合约部署记录表';
        ALTER TABLE "account" ADD "is_active" BOOL NOT NULL DEFAULT True;
        ALTER TABLE "account" ADD "encrypted_private_key" VARCHAR(512);
        ALTER TABLE "account" ADD "balance" DECIMAL(36,18) NOT NULL DEFAULT 0;
        ALTER TABLE "user_kyc" DROP COLUMN "reviewer_id";
        COMMENT ON COLUMN "account"."is_active" IS '是否激活';
COMMENT ON COLUMN "account"."encrypted_private_key" IS '加密的私钥';
COMMENT ON COLUMN "account"."balance" IS '余额（Wei单位）';
        DROP TABLE IF EXISTS "transaction";"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "account" DROP COLUMN "is_active";
        ALTER TABLE "account" DROP COLUMN "encrypted_private_key";
        ALTER TABLE "account" DROP COLUMN "balance";
        ALTER TABLE "user_kyc" ADD "reviewer_id" INT;
        COMMENT ON COLUMN "user_kyc"."reviewer_id" IS '审核人 ID (deprecated, use reviewer_address)';
        DROP TABLE IF EXISTS "contract_deployment";
        DROP TABLE IF EXISTS "contract_config";"""


MODELS_STATE = (
    "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"
)
