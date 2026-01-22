from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "project_contract_configs" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "project_name" VARCHAR(64) NOT NULL,
    "contract_name" VARCHAR(64) NOT NULL,
    "description" TEXT,
    "dependency_type" VARCHAR(8) NOT NULL DEFAULT 'business',
    "is_primary" BOOL NOT NULL DEFAULT False,
    "module" VARCHAR(128),
    "required_deps" JSONB NOT NULL,
    "optional_deps" JSONB NOT NULL,
    "deploy_order" INT NOT NULL DEFAULT 100,
    "allow_zero_address" BOOL NOT NULL DEFAULT False,
    "environments" JSONB NOT NULL,
    "production_address" VARCHAR(64),
    CONSTRAINT "uid_project_con_project_a4c93a" UNIQUE ("project_name", "contract_name")
);
CREATE INDEX IF NOT EXISTS "idx_project_con_project_a93d54" ON "project_contract_configs" ("project_name");
CREATE INDEX IF NOT EXISTS "idx_project_con_contrac_2f1d51" ON "project_contract_configs" ("contract_name");
COMMENT ON COLUMN "project_contract_configs"."project_name" IS '项目名称';
COMMENT ON COLUMN "project_contract_configs"."contract_name" IS '合约名称';
COMMENT ON COLUMN "project_contract_configs"."description" IS '合约描述';
COMMENT ON COLUMN "project_contract_configs"."dependency_type" IS '依赖类型: primary/required/business/optional';
COMMENT ON COLUMN "project_contract_configs"."is_primary" IS '是否为项目主合约';
COMMENT ON COLUMN "project_contract_configs"."module" IS '合约模块路径';
COMMENT ON COLUMN "project_contract_configs"."required_deps" IS '必须依赖列表';
COMMENT ON COLUMN "project_contract_configs"."optional_deps" IS '可选依赖列表';
COMMENT ON COLUMN "project_contract_configs"."deploy_order" IS '部署顺序权重';
COMMENT ON COLUMN "project_contract_configs"."allow_zero_address" IS '是否允许零地址绑定';
COMMENT ON COLUMN "project_contract_configs"."environments" IS '支持的环境列表: [local, test, production]';
COMMENT ON COLUMN "project_contract_configs"."production_address" IS '生产环境固定地址';
COMMENT ON TABLE "project_contract_configs" IS '项目合约配置';
        CREATE TABLE IF NOT EXISTS "contract_deployment_status" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "network" VARCHAR(32) NOT NULL,
    "address" VARCHAR(64),
    "status" VARCHAR(14) NOT NULL DEFAULT 'registered',
    "bindings" JSONB,
    "deploy_tx_hash" VARCHAR(128),
    "deploy_block" BIGINT,
    "config_id" INT NOT NULL REFERENCES "project_contract_configs" ("id") ON DELETE CASCADE,
    CONSTRAINT "uid_contract_de_config__cd3c75" UNIQUE ("config_id", "network")
);
CREATE INDEX IF NOT EXISTS "idx_contract_de_network_5c6780" ON "contract_deployment_status" ("network");
COMMENT ON COLUMN "contract_deployment_status"."network" IS '网络名称: local/sepolia/mainnet';
COMMENT ON COLUMN "contract_deployment_status"."address" IS '部署地址';
COMMENT ON COLUMN "contract_deployment_status"."status" IS '部署状态';
COMMENT ON COLUMN "contract_deployment_status"."bindings" IS '依赖绑定信息';
COMMENT ON COLUMN "contract_deployment_status"."deploy_tx_hash" IS '部署交易哈希';
COMMENT ON COLUMN "contract_deployment_status"."deploy_block" IS '部署区块号';
COMMENT ON COLUMN "contract_deployment_status"."config_id" IS '关联的合约配置';
COMMENT ON TABLE "contract_deployment_status" IS '合约部署状态';"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS "contract_deployment_status";
        DROP TABLE IF EXISTS "project_contract_configs";"""


MODELS_STATE = (
    "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"
    "1g=="
)
