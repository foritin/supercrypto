from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "audit_log" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "operator_address" VARCHAR(128) NOT NULL,
    "action" VARCHAR(21) NOT NULL,
    "target_type" VARCHAR(64),
    "target_id" VARCHAR(128),
    "details" JSONB,
    "success" BOOL NOT NULL DEFAULT True,
    "error_message" TEXT,
    "tx_hash" VARCHAR(128),
    "ip_address" VARCHAR(64),
    "user_agent" TEXT,
    "environment" VARCHAR(32) NOT NULL DEFAULT 'local'
);
CREATE INDEX IF NOT EXISTS "idx_audit_log_operato_73759a" ON "audit_log" ("operator_address");
CREATE INDEX IF NOT EXISTS "idx_audit_log_action_286eba" ON "audit_log" ("action");
CREATE INDEX IF NOT EXISTS "idx_audit_log_target__d6105b" ON "audit_log" ("target_type");
CREATE INDEX IF NOT EXISTS "idx_audit_log_target__71654c" ON "audit_log" ("target_id");
CREATE INDEX IF NOT EXISTS "idx_audit_log_success_0a6af3" ON "audit_log" ("success");
CREATE INDEX IF NOT EXISTS "idx_audit_log_tx_hash_2068f3" ON "audit_log" ("tx_hash");
CREATE INDEX IF NOT EXISTS "idx_audit_log_environ_003827" ON "audit_log" ("environment");
COMMENT ON COLUMN "audit_log"."operator_address" IS '操作者钱包地址';
COMMENT ON COLUMN "audit_log"."action" IS '操作类型';
COMMENT ON COLUMN "audit_log"."target_type" IS '目标类型';
COMMENT ON COLUMN "audit_log"."target_id" IS '目标 ID';
COMMENT ON COLUMN "audit_log"."details" IS '操作详情，包含参数、前后值等';
COMMENT ON COLUMN "audit_log"."success" IS '操作是否成功';
COMMENT ON COLUMN "audit_log"."error_message" IS '错误信息（如果失败）';
COMMENT ON COLUMN "audit_log"."tx_hash" IS '交易哈希';
COMMENT ON COLUMN "audit_log"."ip_address" IS '操作者 IP 地址';
COMMENT ON COLUMN "audit_log"."user_agent" IS '浏览器 User Agent';
COMMENT ON COLUMN "audit_log"."environment" IS '环境: local/test/main';
COMMENT ON TABLE "audit_log" IS '审计日志';"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS "audit_log";"""


MODELS_STATE = (
    "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"
)
