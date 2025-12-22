from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "asset_features" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "bedrooms" INT,
    "bathrooms" DECIMAL(4,1),
    "sqft" INT,
    "sqm" INT,
    "lot_size" INT,
    "year_built" INT,
    "year_renovated" INT,
    "property_type" VARCHAR(50),
    "stories" INT,
    "rental_status" VARCHAR(20),
    "monthly_rent" DECIMAL(10,2),
    "lease_end_date" DATE,
    "amenities" JSONB,
    "neighborhood" JSONB,
    "asset_id" INT NOT NULL UNIQUE REFERENCES "asset" ("id") ON DELETE CASCADE
);
COMMENT ON COLUMN "asset_features"."bedrooms" IS '卧室数量';
COMMENT ON COLUMN "asset_features"."bathrooms" IS '浴室数量 (支持半浴室如 2.5)';
COMMENT ON COLUMN "asset_features"."sqft" IS '面积 (平方英尺)';
COMMENT ON COLUMN "asset_features"."sqm" IS '面积 (平方米)';
COMMENT ON COLUMN "asset_features"."lot_size" IS '地块面积 (平方英尺)';
COMMENT ON COLUMN "asset_features"."year_built" IS '建造年份';
COMMENT ON COLUMN "asset_features"."year_renovated" IS '最近翻新年份';
COMMENT ON COLUMN "asset_features"."property_type" IS '物业类型: single_family, multi_family, condo, commercial';
COMMENT ON COLUMN "asset_features"."stories" IS '楼层数';
COMMENT ON COLUMN "asset_features"."rental_status" IS '租赁状态: occupied, vacant, partial';
COMMENT ON COLUMN "asset_features"."monthly_rent" IS '月租金 (USD)';
COMMENT ON COLUMN "asset_features"."lease_end_date" IS '租约结束日期';
COMMENT ON COLUMN "asset_features"."amenities" IS '设施列表 JSON: [''parking'', ''pool'', ''gym'', ''security'', ...]';
COMMENT ON COLUMN "asset_features"."neighborhood" IS '周边信息 JSON: {schools: [], transit: [], shopping: []}';
COMMENT ON COLUMN "asset_features"."asset_id" IS '关联资产';
COMMENT ON TABLE "asset_features" IS '资产特征详情表';
        CREATE TABLE IF NOT EXISTS "asset_media" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "media_type" VARCHAR(20) NOT NULL DEFAULT 'image',
    "title" VARCHAR(200),
    "description" TEXT,
    "url" VARCHAR(1000) NOT NULL,
    "thumbnail_url" VARCHAR(1000),
    "file_name" VARCHAR(255),
    "file_size" INT,
    "mime_type" VARCHAR(100),
    "sort_order" INT NOT NULL DEFAULT 0,
    "is_primary" BOOL NOT NULL DEFAULT False,
    "asset_id" INT NOT NULL REFERENCES "asset" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_asset_media_asset_i_923ea8" ON "asset_media" ("asset_id", "media_type");
CREATE INDEX IF NOT EXISTS "idx_asset_media_asset_i_24246b" ON "asset_media" ("asset_id", "sort_order");
COMMENT ON COLUMN "asset_media"."media_type" IS '媒体类型';
COMMENT ON COLUMN "asset_media"."title" IS '媒体标题';
COMMENT ON COLUMN "asset_media"."description" IS '媒体描述';
COMMENT ON COLUMN "asset_media"."url" IS '媒体文件URL';
COMMENT ON COLUMN "asset_media"."thumbnail_url" IS '缩略图URL';
COMMENT ON COLUMN "asset_media"."file_name" IS '原始文件名';
COMMENT ON COLUMN "asset_media"."file_size" IS '文件大小(bytes)';
COMMENT ON COLUMN "asset_media"."mime_type" IS 'MIME类型';
COMMENT ON COLUMN "asset_media"."sort_order" IS '排序顺序';
COMMENT ON COLUMN "asset_media"."is_primary" IS '是否为主图/封面';
COMMENT ON COLUMN "asset_media"."asset_id" IS '关联资产';
COMMENT ON TABLE "asset_media" IS '资产媒体文件表';"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS "asset_media";
        DROP TABLE IF EXISTS "asset_features";"""


MODELS_STATE = (
    "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"
    "0J8IDRA8v//n8BE8ii"
)
