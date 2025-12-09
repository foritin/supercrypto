from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "account" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "address" VARCHAR(128) NOT NULL UNIQUE,
    "private_key" VARCHAR(256) NOT NULL,
    "tag" VARCHAR(255) NOT NULL
);
COMMENT ON COLUMN "account"."address" IS '钱包地址';
COMMENT ON COLUMN "account"."private_key" IS '私钥';
COMMENT ON COLUMN "account"."tag" IS '标签';
COMMENT ON TABLE "account" IS '账户表';
CREATE TABLE IF NOT EXISTS "aerich" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "version" VARCHAR(255) NOT NULL,
    "app" VARCHAR(100) NOT NULL,
    "content" JSONB NOT NULL
);"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        """


MODELS_STATE = (
    "eJztl21vmzAQx78K4lUnbREh4aHTNCntOrXTmkxttE1dJ2SMQ1DAUDBtoy7ffT4D4SEhS6"
    "JuXaW+QXD3P9v3O4yPBzkIHeInnQHGYUqZ/FZ6kCkKCL9pul5LMoqi0gEGhmxfaFFFZCcs"
    "RhjGmiA/IdzkkATHXsS8kIL4OjUdVb9OdbVn8HtTNyHOCTEP9KjbLkmpd5MSi4UuYVMSc+"
    "GPn9zsUYfck6R4jGbWxCO+U0vGc2AAYbfYPBK2M8o+CiHMbls49NOAluJozqYhXaq9LD2X"
    "UBIjRmB4FqeQHk19PwdRZJyttJRkS6zEOGSCUh8gQfQKo8JYYZKbcEiBL19NIhJ0YZY3ar"
    "dv9M2e3je5RKxkaTEWWXpl7lmgIDAcywvhRwxlCoGx5IZjAslaiK3y+8A9zAvIeoj1yAZM"
    "Jw/tFDdNtAXICtuc3BJtISnZlu9bAVd+N0kpBqhSEuNO/krbKCEd/g5ZKcMWzP5e3r8CG/"
    "COz85PLseD8y8wfJAkN77ANhifgEcV1nnDeqC/AnvIt1C2tZaDSN/OxqcSPEpXo+GJoBom"
    "zI3FjKVufCXDmlDKQouGdxZyqmwKc2Hi0rLaaeTsWe165Eu1n0O1uZSPlqyW+niK4vVlro"
    "Q0aswhbVHVx/o+8gPisG93r1Otp2j8avQUuPaV5knS8tUM0L3lE+qyKX/squaGsn4dXByf"
    "Di4OuKpRq2HuUjPfogY3ir1bzsGakfkugBthjwN5m73Thtk4xF2AjbR90KqavgVarmpFK3"
    "x1tAy5uyDN5U+PUjcV3swYtkH2Q6lthVLbgFIDlNAjTWaV0x4MNsKzOxQ71oonVMM27aor"
    "UIOmBVHkClCQJGRQ9JUk9vB0bceZeTY3nKXmT/1m+7f9pZ/85/3kLYkTWNIO+7cS8sR7eH"
    "uKf2fn1g5vvjV2Obgz+fME2FWUbQ5oRWk/oMFXB8hnZISuaXQ/XY6GLb80ZUizw/Uwk35J"
    "vpesbOr/A+gGfpBvrWUtsB2cD743iR5/Hh01e1EY4OipD5bFbx2gVhs="
)
