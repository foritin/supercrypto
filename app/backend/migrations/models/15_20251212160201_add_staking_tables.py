from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "staking_record" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "wallet_address" VARCHAR(128) NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL,
    "period" INT NOT NULL,
    "multiplier" DECIMAL(10,2) NOT NULL,
    "start_date" TIMESTAMPTZ NOT NULL,
    "end_date" TIMESTAMPTZ NOT NULL,
    "expected_rewards" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "claimed_rewards" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "status" VARCHAR(9) NOT NULL DEFAULT 'active',
    "stake_tx_hash" VARCHAR(128),
    "unstake_tx_hash" VARCHAR(128),
    "environment" VARCHAR(32) NOT NULL DEFAULT 'local',
    "subscription_id" INT REFERENCES "subscription" ("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "idx_staking_rec_wallet__f14228" ON "staking_record" ("wallet_address");
CREATE INDEX IF NOT EXISTS "idx_staking_rec_status_83c7ee" ON "staking_record" ("status");
CREATE INDEX IF NOT EXISTS "idx_staking_rec_environ_d48ccc" ON "staking_record" ("environment");
COMMENT ON COLUMN "staking_record"."wallet_address" IS '用户钱包地址';
COMMENT ON COLUMN "staking_record"."amount" IS '质押的 RWA Token 数量';
COMMENT ON COLUMN "staking_record"."period" IS '质押周期（天）: 15/30/45/60';
COMMENT ON COLUMN "staking_record"."multiplier" IS '奖励倍数: 1.0/2.5/4.5/7.0';
COMMENT ON COLUMN "staking_record"."start_date" IS '质押开始时间';
COMMENT ON COLUMN "staking_record"."end_date" IS '质押到期时间';
COMMENT ON COLUMN "staking_record"."expected_rewards" IS '预期 PLT 奖励';
COMMENT ON COLUMN "staking_record"."claimed_rewards" IS '已领取的 PLT 奖励';
COMMENT ON COLUMN "staking_record"."status" IS '质押状态';
COMMENT ON COLUMN "staking_record"."stake_tx_hash" IS '质押交易哈希';
COMMENT ON COLUMN "staking_record"."unstake_tx_hash" IS '解押交易哈希';
COMMENT ON COLUMN "staking_record"."environment" IS '环境: local/test/main';
COMMENT ON COLUMN "staking_record"."subscription_id" IS '关联的认购记录';
COMMENT ON TABLE "staking_record" IS '质押记录';
        CREATE TABLE IF NOT EXISTS "reward_claim" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "wallet_address" VARCHAR(128) NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL,
    "tx_hash" VARCHAR(128),
    "environment" VARCHAR(32) NOT NULL DEFAULT 'local',
    "staking_record_id" INT NOT NULL REFERENCES "staking_record" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_reward_clai_wallet__20a61b" ON "reward_claim" ("wallet_address");
CREATE INDEX IF NOT EXISTS "idx_reward_clai_environ_ea06d2" ON "reward_claim" ("environment");
COMMENT ON COLUMN "reward_claim"."wallet_address" IS '用户钱包地址';
COMMENT ON COLUMN "reward_claim"."amount" IS '领取的 PLT 数量';
COMMENT ON COLUMN "reward_claim"."tx_hash" IS '领取交易哈希';
COMMENT ON COLUMN "reward_claim"."environment" IS '环境: local/test/main';
COMMENT ON COLUMN "reward_claim"."staking_record_id" IS '关联的质押记录';
COMMENT ON TABLE "reward_claim" IS '奖励领取记录';
        CREATE TABLE IF NOT EXISTS "staking_limit" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "date" DATE NOT NULL,
    "base_limit" DECIMAL(36,18) NOT NULL,
    "carried_limit" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "used_limit" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "environment" VARCHAR(32) NOT NULL DEFAULT 'local',
    CONSTRAINT "uid_staking_lim_date_d65845" UNIQUE ("date", "environment")
);
CREATE INDEX IF NOT EXISTS "idx_staking_lim_date_8c946a" ON "staking_limit" ("date");
CREATE INDEX IF NOT EXISTS "idx_staking_lim_environ_8bea2d" ON "staking_limit" ("environment");
COMMENT ON COLUMN "staking_limit"."date" IS '日期';
COMMENT ON COLUMN "staking_limit"."base_limit" IS '当日基础限额';
COMMENT ON COLUMN "staking_limit"."carried_limit" IS '累积的未用限额';
COMMENT ON COLUMN "staking_limit"."used_limit" IS '已使用限额';
COMMENT ON COLUMN "staking_limit"."environment" IS '环境: local/test/main';
COMMENT ON TABLE "staking_limit" IS '质押限额';"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS "staking_record";
        DROP TABLE IF EXISTS "staking_limit";
        DROP TABLE IF EXISTS "reward_claim";"""


MODELS_STATE = (
    "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"
    "8s//u/stA47Q=="
)
