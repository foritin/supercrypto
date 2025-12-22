from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "asset" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "name" VARCHAR(200) NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "asset_type" VARCHAR(20) NOT NULL DEFAULT 'real_estate',
    "image_url" VARCHAR(500),
    "document_url" VARCHAR(500),
    "location" VARCHAR(300),
    "current_price" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "price_updated_at" TIMESTAMPTZ,
    "total_supply" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "subscribed_amount" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "min_subscription" DECIMAL(36,18) NOT NULL DEFAULT 100,
    "apy_3m" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "apy_6m" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "apy_12m" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "contract_address" VARCHAR(128),
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "environment" VARCHAR(20) NOT NULL DEFAULT 'local',
    "created_by" INT
);
CREATE INDEX IF NOT EXISTS "idx_asset_status_11b0a0" ON "asset" ("status");
CREATE INDEX IF NOT EXISTS "idx_asset_asset_t_a0fc44" ON "asset" ("asset_type");
CREATE INDEX IF NOT EXISTS "idx_asset_environ_b47b9c" ON "asset" ("environment");
CREATE INDEX IF NOT EXISTS "idx_asset_created_a09321" ON "asset" ("created_at");
COMMENT ON COLUMN "asset"."name" IS '资产名称';
COMMENT ON COLUMN "asset"."symbol" IS '代币符号';
COMMENT ON COLUMN "asset"."description" IS '资产描述';
COMMENT ON COLUMN "asset"."asset_type" IS '资产类型';
COMMENT ON COLUMN "asset"."image_url" IS '资产图片URL';
COMMENT ON COLUMN "asset"."document_url" IS '相关文档URL';
COMMENT ON COLUMN "asset"."location" IS '资产位置/地址';
COMMENT ON COLUMN "asset"."current_price" IS '当前预言机价格 (USD)';
COMMENT ON COLUMN "asset"."price_updated_at" IS '价格最后更新时间';
COMMENT ON COLUMN "asset"."total_supply" IS '总募资额 (Token数量)';
COMMENT ON COLUMN "asset"."subscribed_amount" IS '已认购额';
COMMENT ON COLUMN "asset"."min_subscription" IS '最小认购金额';
COMMENT ON COLUMN "asset"."apy_3m" IS '3个月锁定期 APY (%)';
COMMENT ON COLUMN "asset"."apy_6m" IS '6个月锁定期 APY (%)';
COMMENT ON COLUMN "asset"."apy_12m" IS '12个月锁定期 APY (%)';
COMMENT ON COLUMN "asset"."contract_address" IS 'RWA Token 合约地址';
COMMENT ON COLUMN "asset"."status" IS '资产状态';
COMMENT ON COLUMN "asset"."environment" IS '环境标识';
COMMENT ON COLUMN "asset"."created_by" IS '创建人ID';
COMMENT ON TABLE "asset" IS 'RWA 资产表';
        CREATE TABLE IF NOT EXISTS "asset_price_history" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "price" DECIMAL(36,18) NOT NULL,
    "source" VARCHAR(100),
    "asset_id" INT NOT NULL REFERENCES "asset" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_asset_price_asset_i_c020cb" ON "asset_price_history" ("asset_id", "created_at");
COMMENT ON COLUMN "asset_price_history"."price" IS '价格 (USD)';
COMMENT ON COLUMN "asset_price_history"."source" IS '价格来源';
COMMENT ON COLUMN "asset_price_history"."asset_id" IS '关联资产';
COMMENT ON TABLE "asset_price_history" IS '资产价格历史表';
        CREATE TABLE IF NOT EXISTS "contract_dependency_sync" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "dependent_contract" VARCHAR(100) NOT NULL,
    "dependent_deploy_step" VARCHAR(50) NOT NULL,
    "dependency_contract" VARCHAR(100) NOT NULL,
    "dependency_deploy_step" VARCHAR(50) NOT NULL,
    "set_function" VARCHAR(100) NOT NULL,
    "last_synced_at" TIMESTAMPTZ,
    "last_synced_address" VARCHAR(100),
    "last_synced_tx" VARCHAR(100),
    "network" VARCHAR(50) NOT NULL,
    "is_active" BOOL NOT NULL DEFAULT True,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uid_contract_de_depende_34645c" UNIQUE ("dependent_contract", "dependency_contract", "network")
);
COMMENT ON COLUMN "contract_dependency_sync"."dependent_contract" IS '依赖方合约名称，如 Subscription';
COMMENT ON COLUMN "contract_dependency_sync"."dependent_deploy_step" IS '依赖方部署阶段，如 3_sto_business';
COMMENT ON COLUMN "contract_dependency_sync"."dependency_contract" IS '被依赖方合约名称，如 KYCManager';
COMMENT ON COLUMN "contract_dependency_sync"."dependency_deploy_step" IS '被依赖方部署阶段，如 2_sto_base';
COMMENT ON COLUMN "contract_dependency_sync"."set_function" IS '用于更新地址的 set 函数名，如 setKYCManager';
COMMENT ON COLUMN "contract_dependency_sync"."last_synced_at" IS '上次调用 set 函数的时间';
COMMENT ON COLUMN "contract_dependency_sync"."last_synced_address" IS '上次同步的合约地址';
COMMENT ON COLUMN "contract_dependency_sync"."last_synced_tx" IS '上次同步的交易哈希';
COMMENT ON COLUMN "contract_dependency_sync"."network" IS '网络类型：local/sepolia/mainnet';
COMMENT ON COLUMN "contract_dependency_sync"."is_active" IS '是否激活';
COMMENT ON TABLE "contract_dependency_sync" IS '合约依赖同步记录表';
        CREATE TABLE IF NOT EXISTS "subscription" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "wallet_address" VARCHAR(128) NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL,
    "token_type" VARCHAR(10) NOT NULL DEFAULT 'USDT',
    "lock_period" INT NOT NULL,
    "apy" DECIMAL(10,4) NOT NULL,
    "rwa_token_amount" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "start_date" TIMESTAMPTZ,
    "end_date" TIMESTAMPTZ,
    "original_end_date" TIMESTAMPTZ,
    "redeemed_at" TIMESTAMPTZ,
    "expected_interest" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "actual_interest" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "tx_hash" VARCHAR(128),
    "redeem_tx_hash" VARCHAR(128),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "environment" VARCHAR(20) NOT NULL DEFAULT 'local',
    "asset_id" INT NOT NULL REFERENCES "asset" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_subscriptio_wallet__e68830" ON "subscription" ("wallet_address");
CREATE INDEX IF NOT EXISTS "idx_subscriptio_wallet__f6f50c" ON "subscription" ("wallet_address", "environment");
CREATE INDEX IF NOT EXISTS "idx_subscriptio_asset_i_142c4d" ON "subscription" ("asset_id", "environment");
CREATE INDEX IF NOT EXISTS "idx_subscriptio_status_ee5b1e" ON "subscription" ("status");
CREATE INDEX IF NOT EXISTS "idx_subscriptio_end_dat_e58acf" ON "subscription" ("end_date");
COMMENT ON COLUMN "subscription"."wallet_address" IS '用户钱包地址';
COMMENT ON COLUMN "subscription"."amount" IS '认购金额 (稳定币)';
COMMENT ON COLUMN "subscription"."token_type" IS '支付代币类型';
COMMENT ON COLUMN "subscription"."lock_period" IS '锁定期 (月)';
COMMENT ON COLUMN "subscription"."apy" IS '认购时的 APY (%)';
COMMENT ON COLUMN "subscription"."rwa_token_amount" IS '获得的 RWA Token 数量';
COMMENT ON COLUMN "subscription"."start_date" IS '认购开始时间';
COMMENT ON COLUMN "subscription"."end_date" IS '锁定期结束时间';
COMMENT ON COLUMN "subscription"."original_end_date" IS '原始到期时间 (质押可能延期)';
COMMENT ON COLUMN "subscription"."redeemed_at" IS '赎回时间';
COMMENT ON COLUMN "subscription"."expected_interest" IS '预期利息';
COMMENT ON COLUMN "subscription"."actual_interest" IS '实际利息 (赎回时计算)';
COMMENT ON COLUMN "subscription"."tx_hash" IS '认购交易哈希';
COMMENT ON COLUMN "subscription"."redeem_tx_hash" IS '赎回交易哈希';
COMMENT ON COLUMN "subscription"."status" IS '认购状态';
COMMENT ON COLUMN "subscription"."environment" IS '环境标识';
COMMENT ON COLUMN "subscription"."asset_id" IS '关联资产';
COMMENT ON TABLE "subscription" IS '认购记录表';"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS "subscription";
        DROP TABLE IF EXISTS "asset_price_history";
        DROP TABLE IF EXISTS "contract_dependency_sync";
        DROP TABLE IF EXISTS "asset";"""


MODELS_STATE = (
    "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"
)
