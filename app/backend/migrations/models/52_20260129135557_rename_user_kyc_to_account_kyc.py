from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "account_kyc" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "address" VARCHAR(42) NOT NULL,
    "network" VARCHAR(20) NOT NULL DEFAULT 'hardhat',
    "status" VARCHAR(20) NOT NULL DEFAULT 'not_started',
    "submitted_at" TIMESTAMPTZ,
    "reviewed_at" TIMESTAMPTZ,
    "reviewer_address" VARCHAR(42),
    "reject_reason" TEXT,
    "external_kyc_id" VARCHAR(100),
    "country_code" VARCHAR(2),
    "is_accredited" BOOL NOT NULL DEFAULT False,
    "id_type" VARCHAR(20),
    "id_number_hash" VARCHAR(64),
    "id_number_last4" VARCHAR(4),
    "full_name" VARCHAR(100),
    "date_of_birth" DATE,
    "id_front_url" VARCHAR(255),
    "id_back_url" VARCHAR(255),
    "selfie_url" VARCHAR(255),
    "on_chain_sync_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "on_chain_tx_hash" VARCHAR(66),
    "on_chain_synced_at" TIMESTAMPTZ,
    "on_chain_error" TEXT,
    CONSTRAINT "uid_account_kyc_address_753e4a" UNIQUE ("address", "network")
);
CREATE INDEX IF NOT EXISTS "idx_account_kyc_status_df10a2" ON "account_kyc" ("status");
COMMENT ON COLUMN "account_kyc"."address" IS '钱包地址 (小写)';
COMMENT ON COLUMN "account_kyc"."network" IS '网络类型';
COMMENT ON COLUMN "account_kyc"."status" IS 'KYC 状态';
COMMENT ON COLUMN "account_kyc"."submitted_at" IS '提交时间';
COMMENT ON COLUMN "account_kyc"."reviewed_at" IS '审核时间';
COMMENT ON COLUMN "account_kyc"."reviewer_address" IS '审核人钱包地址';
COMMENT ON COLUMN "account_kyc"."reject_reason" IS '拒绝原因';
COMMENT ON COLUMN "account_kyc"."external_kyc_id" IS '第三方 KYC 服务 ID';
COMMENT ON COLUMN "account_kyc"."country_code" IS '国家代码 (ISO 3166-1 alpha-2)';
COMMENT ON COLUMN "account_kyc"."is_accredited" IS '是否为合格投资者';
COMMENT ON COLUMN "account_kyc"."id_type" IS '证件类型 (id_card/passport/driver_license)';
COMMENT ON COLUMN "account_kyc"."id_number_hash" IS '证件号 SHA256 哈希';
COMMENT ON COLUMN "account_kyc"."id_number_last4" IS '证件号后4位 (明文，便于核对)';
COMMENT ON COLUMN "account_kyc"."full_name" IS '证件姓名';
COMMENT ON COLUMN "account_kyc"."date_of_birth" IS '出生日期';
COMMENT ON COLUMN "account_kyc"."id_front_url" IS '证件正面照片 MinIO 路径';
COMMENT ON COLUMN "account_kyc"."id_back_url" IS '证件背面照片 MinIO 路径';
COMMENT ON COLUMN "account_kyc"."selfie_url" IS '手持证件自拍 MinIO 路径';
COMMENT ON COLUMN "account_kyc"."on_chain_sync_status" IS '链上同步状态';
COMMENT ON COLUMN "account_kyc"."on_chain_tx_hash" IS '链上同步交易哈希';
COMMENT ON COLUMN "account_kyc"."on_chain_synced_at" IS '链上同步成功时间';
COMMENT ON COLUMN "account_kyc"."on_chain_error" IS '链上同步失败原因';
COMMENT ON TABLE "account_kyc" IS '账户 KYC 认证表';
        DROP TABLE IF EXISTS "user_kyc";"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS "account_kyc";"""


MODELS_STATE = (
    "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"
)
