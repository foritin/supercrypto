from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "redemption_event" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "event_type" VARCHAR(32) NOT NULL,
    "status" VARCHAR(20),
    "actor_address" VARCHAR(128),
    "tx_hash" VARCHAR(128),
    "message" TEXT,
    "metadata" JSONB,
    "redemption_id" INT NOT NULL REFERENCES "redemption_request" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_redemption_event_redemp_5f2bc1" ON "redemption_event" ("redemption_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_redemption_event_event__3c1882" ON "redemption_event" ("event_type");
CREATE INDEX IF NOT EXISTS "idx_redemption_event_status_a1dd63" ON "redemption_event" ("status");
COMMENT ON COLUMN "redemption_event"."event_type" IS '事件类型';
COMMENT ON COLUMN "redemption_event"."status" IS '事件对应赎回状态';
COMMENT ON COLUMN "redemption_event"."actor_address" IS '事件操作人地址';
COMMENT ON COLUMN "redemption_event"."tx_hash" IS '相关交易哈希';
COMMENT ON COLUMN "redemption_event"."message" IS '事件说明';
COMMENT ON COLUMN "redemption_event"."metadata" IS '扩展元数据';
COMMENT ON COLUMN "redemption_event"."redemption_id" IS '关联赎回请求';
COMMENT ON TABLE "redemption_event" IS '赎回事件表';
    """


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS "redemption_event";
    """
