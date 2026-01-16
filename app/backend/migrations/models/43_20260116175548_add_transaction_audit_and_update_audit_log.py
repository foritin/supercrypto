from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP INDEX IF EXISTS "idx_audit_log_operato_73759a";
        DROP INDEX IF EXISTS "idx_audit_log_success_0a6af3";
        CREATE TABLE IF NOT EXISTS "transaction_audit" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "tx_hash" VARCHAR(128) NOT NULL UNIQUE,
    "chain_id" INT NOT NULL,
    "network" VARCHAR(32) NOT NULL,
    "from_address" VARCHAR(128) NOT NULL,
    "to_address" VARCHAR(128),
    "value" VARCHAR(78) NOT NULL DEFAULT '0',
    "tx_type" VARCHAR(32) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "token_address" VARCHAR(128),
    "token_symbol" VARCHAR(32),
    "token_decimals" INT,
    "token_amount" VARCHAR(78),
    "contract_name" VARCHAR(128),
    "function_name" VARCHAR(128),
    "function_args" JSONB,
    "gas_price" VARCHAR(64),
    "gas_limit" BIGINT,
    "gas_used" BIGINT,
    "effective_gas_price" VARCHAR(64),
    "gas_cost" VARCHAR(78),
    "block_number" BIGINT,
    "block_timestamp" TIMESTAMPTZ,
    "nonce" INT,
    "operator_id" INT,
    "related_audit_id" INT,
    "description" TEXT,
    "extra_data" JSONB,
    "error_message" TEXT,
    "confirmed_at" TIMESTAMPTZ,
    "environment" VARCHAR(32) NOT NULL DEFAULT 'local'
);
CREATE INDEX IF NOT EXISTS "idx_transaction_tx_hash_12bf25" ON "transaction_audit" ("tx_hash");
CREATE INDEX IF NOT EXISTS "idx_transaction_chain_i_f20ad9" ON "transaction_audit" ("chain_id");
CREATE INDEX IF NOT EXISTS "idx_transaction_network_4dafd0" ON "transaction_audit" ("network");
CREATE INDEX IF NOT EXISTS "idx_transaction_from_ad_771f17" ON "transaction_audit" ("from_address");
CREATE INDEX IF NOT EXISTS "idx_transaction_to_addr_802778" ON "transaction_audit" ("to_address");
CREATE INDEX IF NOT EXISTS "idx_transaction_tx_type_ba2377" ON "transaction_audit" ("tx_type");
CREATE INDEX IF NOT EXISTS "idx_transaction_status_324c4d" ON "transaction_audit" ("status");
CREATE INDEX IF NOT EXISTS "idx_transaction_token_a_aee49f" ON "transaction_audit" ("token_address");
CREATE INDEX IF NOT EXISTS "idx_transaction_block_n_390c19" ON "transaction_audit" ("block_number");
CREATE INDEX IF NOT EXISTS "idx_transaction_operato_73d42c" ON "transaction_audit" ("operator_id");
CREATE INDEX IF NOT EXISTS "idx_transaction_related_14604f" ON "transaction_audit" ("related_audit_id");
CREATE INDEX IF NOT EXISTS "idx_transaction_environ_1fe127" ON "transaction_audit" ("environment");
CREATE INDEX IF NOT EXISTS "idx_transaction_chain_i_a797c0" ON "transaction_audit" ("chain_id", "from_address", "created_at");
CREATE INDEX IF NOT EXISTS "idx_transaction_chain_i_b5c9b5" ON "transaction_audit" ("chain_id", "to_address", "created_at");
CREATE INDEX IF NOT EXISTS "idx_transaction_chain_i_2e5d7f" ON "transaction_audit" ("chain_id", "status", "created_at");
CREATE INDEX IF NOT EXISTS "idx_transaction_token_a_aad350" ON "transaction_audit" ("token_address", "created_at");
CREATE INDEX IF NOT EXISTS "idx_transaction_operato_352e6d" ON "transaction_audit" ("operator_id", "created_at");
COMMENT ON COLUMN "transaction_audit"."tx_hash" IS '交易哈希';
COMMENT ON COLUMN "transaction_audit"."chain_id" IS '链ID';
COMMENT ON COLUMN "transaction_audit"."network" IS '网络名称';
COMMENT ON COLUMN "transaction_audit"."from_address" IS '发送方地址';
COMMENT ON COLUMN "transaction_audit"."to_address" IS '接收方地址';
COMMENT ON COLUMN "transaction_audit"."value" IS '交易金额(Wei字符串)';
COMMENT ON COLUMN "transaction_audit"."tx_type" IS '交易类型';
COMMENT ON COLUMN "transaction_audit"."status" IS '交易状态';
COMMENT ON COLUMN "transaction_audit"."token_address" IS 'Token合约地址';
COMMENT ON COLUMN "transaction_audit"."token_symbol" IS 'Token符号';
COMMENT ON COLUMN "transaction_audit"."token_decimals" IS 'Token精度';
COMMENT ON COLUMN "transaction_audit"."token_amount" IS 'Token数量(原始字符串)';
COMMENT ON COLUMN "transaction_audit"."contract_name" IS '合约名称';
COMMENT ON COLUMN "transaction_audit"."function_name" IS '调用函数名';
COMMENT ON COLUMN "transaction_audit"."function_args" IS '函数参数';
COMMENT ON COLUMN "transaction_audit"."gas_price" IS 'Gas价格(Wei)';
COMMENT ON COLUMN "transaction_audit"."gas_limit" IS 'Gas限制';
COMMENT ON COLUMN "transaction_audit"."gas_used" IS '实际Gas消耗';
COMMENT ON COLUMN "transaction_audit"."effective_gas_price" IS '实际Gas价格';
COMMENT ON COLUMN "transaction_audit"."gas_cost" IS 'Gas费用(Wei)';
COMMENT ON COLUMN "transaction_audit"."block_number" IS '区块高度';
COMMENT ON COLUMN "transaction_audit"."block_timestamp" IS '区块时间';
COMMENT ON COLUMN "transaction_audit"."nonce" IS '交易Nonce';
COMMENT ON COLUMN "transaction_audit"."operator_id" IS '操作者账户ID';
COMMENT ON COLUMN "transaction_audit"."related_audit_id" IS '关联的AuditLog ID';
COMMENT ON COLUMN "transaction_audit"."description" IS '交易描述';
COMMENT ON COLUMN "transaction_audit"."extra_data" IS '额外数据';
COMMENT ON COLUMN "transaction_audit"."error_message" IS '错误信息';
COMMENT ON COLUMN "transaction_audit"."confirmed_at" IS '确认时间';
COMMENT ON COLUMN "transaction_audit"."environment" IS '环境: local/test/main';
COMMENT ON TABLE "transaction_audit" IS '链上交易审计表';
        ALTER TABLE "audit_log" ADD "new_value" JSONB;
        ALTER TABLE "audit_log" ADD "old_value" JSONB;
        ALTER TABLE "audit_log" ADD "extra_data" JSONB;
        ALTER TABLE "audit_log" ADD "operated_at" TIMESTAMPTZ NOT NULL;
        ALTER TABLE "audit_log" ADD "reason" TEXT;
        ALTER TABLE "audit_log" ADD "category" VARCHAR(50) NOT NULL;
        ALTER TABLE "audit_log" ADD "gas_used" BIGINT;
        ALTER TABLE "audit_log" ADD "operator_id" INT;
        ALTER TABLE "audit_log" ADD "description" TEXT;
        ALTER TABLE "audit_log" ADD "duration_ms" INT;
        ALTER TABLE "audit_log" ADD "request_id" VARCHAR(64);
        ALTER TABLE "audit_log" ADD "operator_type" VARCHAR(50);
        ALTER TABLE "audit_log" ADD "status" VARCHAR(20) NOT NULL DEFAULT 'success';
        ALTER TABLE "audit_log" ADD "error_code" VARCHAR(50);
        ALTER TABLE "audit_log" ADD "block_number" BIGINT;
        ALTER TABLE "audit_log" ADD "target_address" VARCHAR(128);
        ALTER TABLE "audit_log" DROP COLUMN "updated_at";
        ALTER TABLE "audit_log" DROP COLUMN "success";
        ALTER TABLE "audit_log" DROP COLUMN "details";
        ALTER TABLE "audit_log" DROP COLUMN "created_at";
        COMMENT ON COLUMN "audit_log"."error_message" IS '错误信息';
        ALTER TABLE "audit_log" ALTER COLUMN "ip_address" TYPE VARCHAR(45) USING "ip_address"::VARCHAR(45);
        COMMENT ON COLUMN "audit_log"."ip_address" IS '操作IP地址';
        ALTER TABLE "audit_log" ALTER COLUMN "user_agent" TYPE VARCHAR(500) USING "user_agent"::VARCHAR(500);
        COMMENT ON COLUMN "audit_log"."user_agent" IS '用户代理';
        ALTER TABLE "audit_log" ALTER COLUMN "action" TYPE VARCHAR(100) USING "action"::VARCHAR(100);
        ALTER TABLE "audit_log" ALTER COLUMN "operator_address" DROP NOT NULL;
        ALTER TABLE "audit_log" ALTER COLUMN "target_id" TYPE INT USING "target_id"::INT;
        COMMENT ON COLUMN "audit_log"."target_id" IS '目标对象ID';
        ALTER TABLE "audit_log" ALTER COLUMN "target_type" TYPE VARCHAR(50) USING "target_type"::VARCHAR(50);
        COMMENT ON COLUMN "audit_log"."target_type" IS '目标对象类型';
        COMMENT ON COLUMN "audit_log"."new_value" IS '操作后的值';
COMMENT ON COLUMN "audit_log"."old_value" IS '操作前的值';
COMMENT ON COLUMN "audit_log"."extra_data" IS '额外数据（灵活扩展）';
COMMENT ON COLUMN "audit_log"."operated_at" IS '操作时间(UTC)';
COMMENT ON COLUMN "audit_log"."reason" IS '操作原因/备注';
COMMENT ON COLUMN "audit_log"."category" IS '审计类别';
COMMENT ON COLUMN "audit_log"."gas_used" IS 'Gas消耗';
COMMENT ON COLUMN "audit_log"."operator_id" IS '操作者账户ID';
COMMENT ON COLUMN "audit_log"."description" IS '操作描述';
COMMENT ON COLUMN "audit_log"."duration_ms" IS '操作耗时(毫秒)';
COMMENT ON COLUMN "audit_log"."request_id" IS '请求ID';
COMMENT ON COLUMN "audit_log"."operator_type" IS '操作者类型(user/admin/system)';
COMMENT ON COLUMN "audit_log"."status" IS '操作状态';
COMMENT ON COLUMN "audit_log"."error_code" IS '错误码';
COMMENT ON COLUMN "audit_log"."block_number" IS '区块高度';
COMMENT ON COLUMN "audit_log"."target_address" IS '目标钱包地址';
        CREATE INDEX IF NOT EXISTS "idx_audit_log_categor_6adbfc" ON "audit_log" ("category", "action", "operated_at");
        CREATE INDEX IF NOT EXISTS "idx_audit_log_operato_c40edf" ON "audit_log" ("operator_id", "operated_at");
        CREATE INDEX IF NOT EXISTS "idx_audit_log_status_f7dccd" ON "audit_log" ("status", "operated_at");
        CREATE INDEX IF NOT EXISTS "idx_audit_log_target__5612f0" ON "audit_log" ("target_type", "target_id", "operated_at");
        CREATE INDEX IF NOT EXISTS "idx_audit_log_operate_0b55a9" ON "audit_log" ("operated_at");
        CREATE INDEX IF NOT EXISTS "idx_audit_log_categor_298aed" ON "audit_log" ("category");
        CREATE INDEX IF NOT EXISTS "idx_audit_log_operato_73e948" ON "audit_log" ("operator_id");
        CREATE INDEX IF NOT EXISTS "idx_audit_log_request_33bea3" ON "audit_log" ("request_id");
        CREATE INDEX IF NOT EXISTS "idx_audit_log_status_60fba5" ON "audit_log" ("status");
        CREATE INDEX IF NOT EXISTS "idx_audit_log_ip_addr_29e592" ON "audit_log" ("ip_address");"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP INDEX IF EXISTS "idx_audit_log_ip_addr_29e592";
        DROP INDEX IF EXISTS "idx_audit_log_status_60fba5";
        DROP INDEX IF EXISTS "idx_audit_log_request_33bea3";
        DROP INDEX IF EXISTS "idx_audit_log_operato_73e948";
        DROP INDEX IF EXISTS "idx_audit_log_categor_298aed";
        DROP INDEX IF EXISTS "idx_audit_log_operate_0b55a9";
        DROP INDEX IF EXISTS "idx_audit_log_target__5612f0";
        DROP INDEX IF EXISTS "idx_audit_log_status_f7dccd";
        DROP INDEX IF EXISTS "idx_audit_log_operato_c40edf";
        DROP INDEX IF EXISTS "idx_audit_log_categor_6adbfc";
        ALTER TABLE "audit_log" ADD "updated_at" TIMESTAMPTZ;
        ALTER TABLE "audit_log" ADD "success" BOOL NOT NULL DEFAULT True;
        ALTER TABLE "audit_log" ADD "details" JSONB;
        ALTER TABLE "audit_log" ADD "created_at" TIMESTAMPTZ;
        ALTER TABLE "audit_log" DROP COLUMN "new_value";
        ALTER TABLE "audit_log" DROP COLUMN "old_value";
        ALTER TABLE "audit_log" DROP COLUMN "extra_data";
        ALTER TABLE "audit_log" DROP COLUMN "operated_at";
        ALTER TABLE "audit_log" DROP COLUMN "reason";
        ALTER TABLE "audit_log" DROP COLUMN "category";
        ALTER TABLE "audit_log" DROP COLUMN "gas_used";
        ALTER TABLE "audit_log" DROP COLUMN "operator_id";
        ALTER TABLE "audit_log" DROP COLUMN "description";
        ALTER TABLE "audit_log" DROP COLUMN "duration_ms";
        ALTER TABLE "audit_log" DROP COLUMN "request_id";
        ALTER TABLE "audit_log" DROP COLUMN "operator_type";
        ALTER TABLE "audit_log" DROP COLUMN "status";
        ALTER TABLE "audit_log" DROP COLUMN "error_code";
        ALTER TABLE "audit_log" DROP COLUMN "block_number";
        ALTER TABLE "audit_log" DROP COLUMN "target_address";
        COMMENT ON COLUMN "audit_log"."error_message" IS '错误信息（如果失败）';
        COMMENT ON COLUMN "audit_log"."ip_address" IS '操作者 IP 地址';
        ALTER TABLE "audit_log" ALTER COLUMN "ip_address" TYPE VARCHAR(64) USING "ip_address"::VARCHAR(64);
        ALTER TABLE "audit_log" ALTER COLUMN "user_agent" TYPE TEXT USING "user_agent"::TEXT;
        COMMENT ON COLUMN "audit_log"."user_agent" IS '浏览器 User Agent';
        ALTER TABLE "audit_log" ALTER COLUMN "action" TYPE VARCHAR(21) USING "action"::VARCHAR(21);
        ALTER TABLE "audit_log" ALTER COLUMN "operator_address" SET NOT NULL;
        ALTER TABLE "audit_log" ALTER COLUMN "target_id" TYPE VARCHAR(128) USING "target_id"::VARCHAR(128);
        COMMENT ON COLUMN "audit_log"."target_id" IS '目标 ID';
        COMMENT ON COLUMN "audit_log"."target_type" IS '目标类型';
        ALTER TABLE "audit_log" ALTER COLUMN "target_type" TYPE VARCHAR(64) USING "target_type"::VARCHAR(64);
        COMMENT ON COLUMN "audit_log"."success" IS '操作是否成功';
COMMENT ON COLUMN "audit_log"."details" IS '操作详情，包含参数、前后值等';
        DROP TABLE IF EXISTS "transaction_audit";
        CREATE INDEX IF NOT EXISTS "idx_audit_log_success_0a6af3" ON "audit_log" ("success");
        CREATE INDEX IF NOT EXISTS "idx_audit_log_operato_73759a" ON "audit_log" ("operator_address");"""


MODELS_STATE = (
    "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"
)
