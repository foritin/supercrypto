from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP INDEX IF EXISTS "idx_user_kyc_environ_533c4a";
        ALTER TABLE "user_kyc" DROP CONSTRAINT IF EXISTS "uid_user_kyc_wallet__f44b5b";
        ALTER TABLE "user_kyc" ADD COLUMN IF NOT EXISTS "on_chain_sync_status" VARCHAR(20) NOT NULL DEFAULT 'pending';
        ALTER TABLE "user_kyc" ADD COLUMN IF NOT EXISTS "id_type" VARCHAR(20);
        ALTER TABLE "user_kyc" ADD COLUMN IF NOT EXISTS "id_number_hash" VARCHAR(64);
        ALTER TABLE "user_kyc" ADD COLUMN IF NOT EXISTS "selfie_url" VARCHAR(255);
        ALTER TABLE "user_kyc" ADD COLUMN IF NOT EXISTS "date_of_birth" DATE;
        ALTER TABLE "user_kyc" ADD COLUMN IF NOT EXISTS "id_front_url" VARCHAR(255);
        ALTER TABLE "user_kyc" ADD COLUMN IF NOT EXISTS "id_number_last4" VARCHAR(4);
        ALTER TABLE "user_kyc" ADD COLUMN IF NOT EXISTS "wallet" VARCHAR(20) NOT NULL DEFAULT 'local';
        ALTER TABLE "user_kyc" ADD COLUMN IF NOT EXISTS "id_back_url" VARCHAR(255);
        ALTER TABLE "user_kyc" ADD COLUMN IF NOT EXISTS "on_chain_tx_hash" VARCHAR(66);
        ALTER TABLE "user_kyc" ADD COLUMN IF NOT EXISTS "full_name" VARCHAR(100);
        ALTER TABLE "user_kyc" ADD COLUMN IF NOT EXISTS "on_chain_error" TEXT;
        ALTER TABLE "user_kyc" ADD COLUMN IF NOT EXISTS "on_chain_synced_at" TIMESTAMPTZ;
        ALTER TABLE "user_kyc" DROP COLUMN IF EXISTS "environment";
        COMMENT ON COLUMN "user_kyc"."on_chain_sync_status" IS '链上同步状态';
COMMENT ON COLUMN "user_kyc"."id_type" IS '证件类型 (id_card/passport/driver_license)';
COMMENT ON COLUMN "user_kyc"."id_number_hash" IS '证件号 SHA256 哈希';
COMMENT ON COLUMN "user_kyc"."selfie_url" IS '手持证件自拍 MinIO 路径';
COMMENT ON COLUMN "user_kyc"."date_of_birth" IS '出生日期';
COMMENT ON COLUMN "user_kyc"."id_front_url" IS '证件正面照片 MinIO 路径';
COMMENT ON COLUMN "user_kyc"."id_number_last4" IS '证件号后4位 (明文，便于核对)';
COMMENT ON COLUMN "user_kyc"."wallet" IS '钱包类型';
COMMENT ON COLUMN "user_kyc"."id_back_url" IS '证件背面照片 MinIO 路径';
COMMENT ON COLUMN "user_kyc"."on_chain_tx_hash" IS '链上同步交易哈希';
COMMENT ON COLUMN "user_kyc"."full_name" IS '证件姓名';
COMMENT ON COLUMN "user_kyc"."on_chain_error" IS '链上同步失败原因';
COMMENT ON COLUMN "user_kyc"."on_chain_synced_at" IS '链上同步成功时间';
        CREATE UNIQUE INDEX IF NOT EXISTS "uid_subscriptio_tx_hash_42acc7" ON "subscription" ("tx_hash", "environment");
        CREATE UNIQUE INDEX IF NOT EXISTS "uid_user_kyc_wallet__86f747" ON "user_kyc" ("wallet_address");"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP INDEX IF EXISTS "uid_subscriptio_tx_hash_42acc7";
        ALTER TABLE "user_kyc" DROP CONSTRAINT IF EXISTS "user_kyc_wallet_address_key";
        DROP INDEX IF EXISTS "uid_user_kyc_wallet__86f747";
        ALTER TABLE "user_kyc" ADD "environment" VARCHAR(10) NOT NULL;
        ALTER TABLE "user_kyc" DROP COLUMN "on_chain_sync_status";
        ALTER TABLE "user_kyc" DROP COLUMN "id_type";
        ALTER TABLE "user_kyc" DROP COLUMN "id_number_hash";
        ALTER TABLE "user_kyc" DROP COLUMN "selfie_url";
        ALTER TABLE "user_kyc" DROP COLUMN "date_of_birth";
        ALTER TABLE "user_kyc" DROP COLUMN "id_front_url";
        ALTER TABLE "user_kyc" DROP COLUMN "id_number_last4";
        ALTER TABLE "user_kyc" DROP COLUMN "wallet";
        ALTER TABLE "user_kyc" DROP COLUMN "id_back_url";
        ALTER TABLE "user_kyc" DROP COLUMN "on_chain_tx_hash";
        ALTER TABLE "user_kyc" DROP COLUMN "full_name";
        ALTER TABLE "user_kyc" DROP COLUMN "on_chain_error";
        ALTER TABLE "user_kyc" DROP COLUMN "on_chain_synced_at";
        COMMENT ON COLUMN "user_kyc"."environment" IS '环境 (local/test/main)';
        CREATE UNIQUE INDEX IF NOT EXISTS "uid_user_kyc_wallet__f44b5b" ON "user_kyc" ("wallet_address", "environment");
        CREATE INDEX IF NOT EXISTS "idx_user_kyc_environ_533c4a" ON "user_kyc" ("environment", "status");"""


MODELS_STATE = (
    "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"
    "M="
)
