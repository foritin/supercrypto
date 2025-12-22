from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "user_kyc" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "wallet_address" VARCHAR(42) NOT NULL,
    "environment" VARCHAR(10) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'not_started',
    "submitted_at" TIMESTAMPTZ,
    "reviewed_at" TIMESTAMPTZ,
    "reviewer_id" INT,
    "reject_reason" TEXT,
    "external_kyc_id" VARCHAR(100),
    "country_code" VARCHAR(2),
    "is_accredited" BOOL NOT NULL DEFAULT False,
    CONSTRAINT "uid_user_kyc_wallet__f44b5b" UNIQUE ("wallet_address", "environment")
);
CREATE INDEX IF NOT EXISTS "idx_user_kyc_status_727560" ON "user_kyc" ("status");
CREATE INDEX IF NOT EXISTS "idx_user_kyc_environ_533c4a" ON "user_kyc" ("environment", "status");
COMMENT ON COLUMN "user_kyc"."wallet_address" IS '钱包地址 (小写)';
COMMENT ON COLUMN "user_kyc"."environment" IS '环境 (local/test/main)';
COMMENT ON COLUMN "user_kyc"."status" IS 'KYC 状态';
COMMENT ON COLUMN "user_kyc"."submitted_at" IS '提交时间';
COMMENT ON COLUMN "user_kyc"."reviewed_at" IS '审核时间';
COMMENT ON COLUMN "user_kyc"."reviewer_id" IS '审核人 ID';
COMMENT ON COLUMN "user_kyc"."reject_reason" IS '拒绝原因';
COMMENT ON COLUMN "user_kyc"."external_kyc_id" IS '第三方 KYC 服务 ID';
COMMENT ON COLUMN "user_kyc"."country_code" IS '国家代码 (ISO 3166-1 alpha-2)';
COMMENT ON COLUMN "user_kyc"."is_accredited" IS '是否为合格投资者';
COMMENT ON TABLE "user_kyc" IS '用户 KYC 认证表';"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS "user_kyc";"""


MODELS_STATE = (
    "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"
    "WRPWxx3AOsW1Dc297EvQ4v3/8Hmdjujw=="
)
