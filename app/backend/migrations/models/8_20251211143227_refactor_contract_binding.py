from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "contract_binding" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "contract_name" VARCHAR(100) NOT NULL,
    "contract_address" VARCHAR(100) NOT NULL,
    "dependency_name" VARCHAR(100) NOT NULL,
    "bound_address" VARCHAR(100) NOT NULL,
    "set_function" VARCHAR(100) NOT NULL,
    "network" VARCHAR(50) NOT NULL,
    "last_updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_updated_tx" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uid_contract_bi_contrac_988f95" UNIQUE ("contract_name", "dependency_name", "network")
);
COMMENT ON COLUMN "contract_binding"."contract_name" IS '主合约名称，如 Subscription';
COMMENT ON COLUMN "contract_binding"."contract_address" IS '主合约地址';
COMMENT ON COLUMN "contract_binding"."dependency_name" IS '依赖合约名称，如 KYCManager';
COMMENT ON COLUMN "contract_binding"."bound_address" IS '实际绑定的依赖合约地址';
COMMENT ON COLUMN "contract_binding"."set_function" IS '用于更新地址的 set 函数名，如 setKYCManager';
COMMENT ON COLUMN "contract_binding"."network" IS '网络类型：local/sepolia/mainnet';
COMMENT ON COLUMN "contract_binding"."last_updated_at" IS '最后更新时间';
COMMENT ON COLUMN "contract_binding"."last_updated_tx" IS '最后更新的交易哈希';
COMMENT ON TABLE "contract_binding" IS '合约绑定关系表';
        DROP TABLE IF EXISTS "contract_dependency_sync";"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS "contract_binding";"""


MODELS_STATE = (
    "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"
    "Aax7UDxa4exJl5e//wvUzITr"
)
