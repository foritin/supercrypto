from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "route_permission" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "name" VARCHAR(255) NOT NULL,
    "version" VARCHAR(10) NOT NULL DEFAULT 'v1',
    "endpoint" VARCHAR(255) NOT NULL,
    "module" VARCHAR(100) NOT NULL,
    "method" VARCHAR(10) NOT NULL,
    "is_active" BOOL NOT NULL DEFAULT True,
    "description" TEXT
);
COMMENT ON COLUMN "route_permission"."name" IS '权限名称';
COMMENT ON COLUMN "route_permission"."version" IS '版本';
COMMENT ON COLUMN "route_permission"."endpoint" IS '端点';
COMMENT ON COLUMN "route_permission"."module" IS '模块';
COMMENT ON COLUMN "route_permission"."method" IS '方法';
COMMENT ON COLUMN "route_permission"."is_active" IS '是否激活';
COMMENT ON COLUMN "route_permission"."description" IS '权限描述';
COMMENT ON TABLE "route_permission" IS '路由权限表';
        CREATE TABLE IF NOT EXISTS "account_permission" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "is_active" BOOL NOT NULL DEFAULT True,
    "granted_at" TIMESTAMPTZ,
    "granted_by" VARCHAR(128),
    "last_modified_at" TIMESTAMPTZ,
    "last_modified_by" VARCHAR(128),
    "account_id_id" INT NOT NULL REFERENCES "account" ("id") ON DELETE RESTRICT,
    "permission_id_id" INT NOT NULL REFERENCES "route_permission" ("id") ON DELETE RESTRICT,
    CONSTRAINT "uid_account_per_account_c85313" UNIQUE ("account_id_id", "permission_id_id")
);
CREATE INDEX IF NOT EXISTS "idx_account_per_is_acti_4f16e3" ON "account_permission" ("is_active");
COMMENT ON COLUMN "account_permission"."is_active" IS '当前是否激活';
COMMENT ON COLUMN "account_permission"."granted_at" IS '首次授予时间(UTC)';
COMMENT ON COLUMN "account_permission"."granted_by" IS '授予者';
COMMENT ON COLUMN "account_permission"."last_modified_at" IS '最后修改时间(UTC)';
COMMENT ON COLUMN "account_permission"."last_modified_by" IS '最后修改者';
COMMENT ON COLUMN "account_permission"."account_id_id" IS '账户ID';
COMMENT ON COLUMN "account_permission"."permission_id_id" IS '权限ID';
COMMENT ON TABLE "account_permission" IS '账户权限当前状态表';"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS "account_permission";
        DROP TABLE IF EXISTS "route_permission";"""


MODELS_STATE = (
    "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"
)
