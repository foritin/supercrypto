from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "transaction" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "tx_hash" VARCHAR(128) NOT NULL UNIQUE,
    "from_address" VARCHAR(128) NOT NULL,
    "to_address" VARCHAR(128) NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "network" VARCHAR(20) NOT NULL DEFAULT 'ethereum',
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "tx_type" VARCHAR(20) NOT NULL DEFAULT 'transfer',
    "gas_price" VARCHAR(64),
    "gas_used" VARCHAR(64),
    "block_number" BIGINT,
    "block_timestamp" TIMESTAMPTZ,
    "wallet_id" INT,
    "note" TEXT
);
CREATE INDEX IF NOT EXISTS "idx_transaction_from_ad_011abd" ON "transaction" ("from_address", "to_address");
CREATE INDEX IF NOT EXISTS "idx_transaction_tx_hash_6bef92" ON "transaction" ("tx_hash");
CREATE INDEX IF NOT EXISTS "idx_transaction_status_a7b991" ON "transaction" ("status");
CREATE INDEX IF NOT EXISTS "idx_transaction_created_4dda88" ON "transaction" ("created_at");
COMMENT ON COLUMN "transaction"."tx_hash" IS '交易哈希';
COMMENT ON COLUMN "transaction"."from_address" IS '发送地址';
COMMENT ON COLUMN "transaction"."to_address" IS '接收地址';
COMMENT ON COLUMN "transaction"."amount" IS '金额';
COMMENT ON COLUMN "transaction"."network" IS '网络';
COMMENT ON COLUMN "transaction"."status" IS '交易状态';
COMMENT ON COLUMN "transaction"."tx_type" IS '交易类型';
COMMENT ON COLUMN "transaction"."gas_price" IS 'Gas价格';
COMMENT ON COLUMN "transaction"."gas_used" IS 'Gas使用量';
COMMENT ON COLUMN "transaction"."block_number" IS '区块号';
COMMENT ON COLUMN "transaction"."block_timestamp" IS '区块时间';
COMMENT ON COLUMN "transaction"."wallet_id" IS '关联的钱包ID';
COMMENT ON COLUMN "transaction"."note" IS '备注';
COMMENT ON TABLE "transaction" IS '交易表';
        CREATE TABLE IF NOT EXISTS "wallet" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "address" VARCHAR(128) NOT NULL UNIQUE,
    "encrypted_private_key" VARCHAR(512) NOT NULL,
    "network" VARCHAR(20) NOT NULL DEFAULT 'ethereum',
    "balance" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "tag" VARCHAR(255),
    "account_id" INT,
    "is_active" BOOL NOT NULL DEFAULT True
);
COMMENT ON COLUMN "wallet"."address" IS '钱包地址';
COMMENT ON COLUMN "wallet"."encrypted_private_key" IS '加密的私钥';
COMMENT ON COLUMN "wallet"."network" IS '网络类型';
COMMENT ON COLUMN "wallet"."balance" IS '余额（Wei单位）';
COMMENT ON COLUMN "wallet"."tag" IS '标签';
COMMENT ON COLUMN "wallet"."account_id" IS '关联的账户ID';
COMMENT ON COLUMN "wallet"."is_active" IS '是否激活';
COMMENT ON TABLE "wallet" IS '钱包表';
        ALTER TABLE "account" ADD "deleted_at" TIMESTAMPTZ;
        ALTER TABLE "account" ADD "blocked_reason" TEXT;
        ALTER TABLE "account" ADD "blocked_at" TIMESTAMPTZ;
        ALTER TABLE "account" ADD "deleted_by" VARCHAR(128);
        ALTER TABLE "account" ADD "is_blocked" BOOL NOT NULL DEFAULT False;
        ALTER TABLE "account" ADD "blocked_by" VARCHAR(128);
        ALTER TABLE "account" ADD "is_deleted" BOOL NOT NULL DEFAULT False;
        COMMENT ON COLUMN "account"."deleted_at" IS '删除时间(UTC)';
COMMENT ON COLUMN "account"."blocked_reason" IS '封禁原因';
COMMENT ON COLUMN "account"."blocked_at" IS '封禁时间(UTC)';
COMMENT ON COLUMN "account"."deleted_by" IS '删除者';
COMMENT ON COLUMN "account"."is_blocked" IS '是否封禁';
COMMENT ON COLUMN "account"."blocked_by" IS '封禁者';
COMMENT ON COLUMN "account"."is_deleted" IS '是否删除';
        CREATE INDEX IF NOT EXISTS "idx_account_is_bloc_af187e" ON "account" ("is_blocked");
        CREATE INDEX IF NOT EXISTS "idx_account_is_dele_a19275" ON "account" ("is_deleted");"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP INDEX IF EXISTS "idx_account_is_dele_a19275";
        DROP INDEX IF EXISTS "idx_account_is_bloc_af187e";
        ALTER TABLE "account" DROP COLUMN "deleted_at";
        ALTER TABLE "account" DROP COLUMN "blocked_reason";
        ALTER TABLE "account" DROP COLUMN "blocked_at";
        ALTER TABLE "account" DROP COLUMN "deleted_by";
        ALTER TABLE "account" DROP COLUMN "is_blocked";
        ALTER TABLE "account" DROP COLUMN "blocked_by";
        ALTER TABLE "account" DROP COLUMN "is_deleted";
        DROP TABLE IF EXISTS "transaction";
        DROP TABLE IF EXISTS "wallet";"""


MODELS_STATE = (
    "eJztXG1vm0gQ/isWn1IpjTCwvFSnk5w01/rUJKfWvVZNKrQsi4OCwcdLk6jX/347vJh3G5"
    "wmphd/sWB3hl2e2d2ZfWbxd27hmdQJjiaEeJEbcq9G3zkXLyi7qFYdjji8XOYVUBBiw4ll"
    "cUHICEIfE3iWhZ2AsiKTBsS3l6HtuSB8FammIF9FsiAq7FqVVdAzPcIUbXfeLDJ6OWK3SL"
    "DYr8iPryJE4FfRVLiWVMJ+BYG/ijRZlq4iiQoS1BKT/QoGPIpn8u6V+3JkB7rheOSGmq9G"
    "IClK8GRLLj/TsniVNW2Z7AmqRpiMCE+INJVQ6ANWshI0NgymRU0x1tLiriKRWqBIxfSxSc"
    "MMORomDctEVKF5CZW7njSsIEHN3l8mlF1riOdXTfKIZDKVJmVeFti1xrN+S5YkQxNwjaiF"
    "WYcMTAHtyLX/iageenMaXlOfYX55yWHT9GkQW9aloR7eLyn39Su7s12T3tEApOB2eaNbNn"
    "XM0nCxTdCLyxNNVjZ1wz9iQbCvoRPPiRZuLry8D689dyVtJwNoTl3qYwYSKwv9CAaQGzlO"
    "OtSyMZW8QC6SdLGgY7L3jRwYhqBdG4VZYWHUpUXEc2EEs94E8QvOoZWXwlhSJFWUJZWJxD"
    "1ZlSg/ktfL3z1RjBE4n3E/4noc4kQihjHHjfgUXlbHYR2/16wmtBe0GcSyZgVMM1U9yi6q"
    "0GZAFrBNkVtBm4nk2OYzOgOX+82KXAKgjgKfHKWLhoEDesSGlh6FRIfWf+e2t8AaeGfTs9"
    "MPs8nZX/D4RRD848SwTWanUCPEpfeV0gP5BZR7bJFKFq/VQ0afprO3I7gdfbk4P41R9YJw"
    "7sct5nKzLxz0CUehp7verc7mTQGbrDgrYqK5taOluaW1y5p7a/8K1s49Td3ax57nUOy2rI"
    "8lxYqxDabZwb61lbJu4NpS2eqxZRk8L5KEkpes+u3eFj2+uHhXMubxdFY21/nHs+PT9wfj"
    "2IpMyA5pcV3NsU7x2mJmlTV3NLManRRXDkmSIEVDlnTwcXby4sHo/3LzKbOUcV+38ck19t"
    "fbN9Gq2JdBtUOLqjyPupmRW+A73aHuPLxmt2NBXWPXvyfvT95O2KQR1IqxztMqIalrnkEs"
    "rAhYZ2sIz+hdSzhX1xwUykjUYPGSKf/wKXP6eVaaLRmiB2eTzy9KM+bdxfmbTLxggZN3F8"
    "cV4PN9QX83UVAcmptY7WmG5CZSvLZwE2XNobmJwgby2buJzFL93ERZa/cLWMGig3ITBZag"
    "K7QFla1w7bBGdQdWk4zYJ/DAuygiD79SR8/wBPAuffsbQ0K/ob1Gb0Vt9zArGgG2TMJbjV"
    "wByR2gZVKt0MZ1ZWhDPO8DaSq+85VAVnmF4WkodDskUSck0RokURXJFT3YCOepGy1iSKes"
    "X9gltAZtUf/phirHwlTs1LkJGK0WGsccLtCqRDFgUVCNrfDmu8DNt6PNV8F2cBDqjje3Xd"
    "3sHbXUlAcWuMgKsNpI4ikDXo6BtxB6pkEMkOvWTYEmhgIDk5tb7Jt6rcYTvDbZetVCWFRL"
    "sIvnsbkATehnyufNfOwGmKRGqmWEitWH67JCYUWwQ2ZIohgiWHkstmaGmkQa0hmVvMUlZ/"
    "neQi9EIgz77I7JXnLhnX6Ng+vkhq1bYZRWFHj2r/v0x+E+/bEnxPfpj721N1s7W1H7xNy5"
    "ys+JC7dcHyt+BklEhRQ6TwazT6y6s64IV/V2v1NEogk7xeRgw/A25IU4oc9A9oYFsiziOK"
    "oW5UGCjBfZ+aGKU6DEXmCnhVZaKVX9QaJ1lGo/FtZ8E9DaOB7NqmY+eM/y+vRkejZ5dyDK"
    "h2O1wmxnOEu17SLbW996/k2fwVpQecLdeByq02ixYUM+jE14uiFoBHUz35FrPyG+S+qaAN"
    "km55afjxsG1CwGeAi3VFB/QrDjva5F/c1oD4xdmuNAX/o2acG7ecEoKe2YIH2DA0DYgoOS"
    "qrjVciFLHVCVpVZUoaqOahQ0JXTXg5rpDAJTS7GyQ6bamFjDQDY+a6CzVcBIJlslXW7PW1"
    "mXquZm/uWxU3yiiGEpQApcW0pHgBNGRhMEUVQEXpRVJCkKUvkVNVOvWsfRHE/fAE1TMkDL"
    "8ap4d8uW3cWy7/a9QX1gRHTRGDn5/Dx456Khb7Hj0FDvxWeWdHY/rcYKUMM8gi8AZFUqpn"
    "ynr3tNsgfSnoWg3AsbHGz7iapMfufJR6Tx6RcID58KP+vs1EDSJJ/iUc81ZEjSmsN1yZHb"
    "XKZDXqR4aKElL9Iksjkvsk9obDWz9wmN7S3wf/KW+4TGc7L2EI6+bZ/QGPjBN+oS/34JU2"
    "LLI3CtD9g9+44EDHAbRM5C0ocdj0NjoYMBmFSrAeK6HsRxpzNdwyWRh8e7GdjJYOyR8iho"
    "DSjnIVlIS3IeyefLn6gNCw2c45IsKSnUdpQO2R/6/FmHPtOP/PtRA2WlAXID+R8N7IobsA"
    "MdDsl9a1gLNn39k+s92sc/dWxXAceaj39kizCHJ5tix9X28T7+GQhZMKG+Ta65pj/YSGoO"
    "1/6/Ri6ziSxoD8z3ZMCTkwHfqB/YTd9StjuggsqO49buKD6B71k2pBzW7LqWTSmGXwTAMd"
    "8l2GRS7bsrvhYGsRZD2nTC5s8PF+ctfFSuUo01bRKO/h05dtDFf+8A0DX4wfuuZ6GrhPNh"
    "mUiAB+ychf7xH7jdWnk="
)
