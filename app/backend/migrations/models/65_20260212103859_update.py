from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "account" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "is_blocked" BOOL NOT NULL DEFAULT False,
    "blocked_at" TIMESTAMPTZ,
    "blocked_by" VARCHAR(128),
    "blocked_reason" TEXT,
    "is_deleted" BOOL NOT NULL DEFAULT False,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" VARCHAR(128),
    "address" VARCHAR(128) NOT NULL,
    "private_key" VARCHAR(256) NOT NULL,
    "tag" VARCHAR(255),
    "network" VARCHAR(20) NOT NULL DEFAULT 'hardhat',
    "last_login_dt" TIMESTAMPTZ,
    "encrypted_private_key" VARCHAR(512),
    "balance" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "is_active" BOOL NOT NULL DEFAULT True,
    CONSTRAINT "uid_account_address_9c7d38" UNIQUE ("address", "network")
);
CREATE INDEX IF NOT EXISTS "idx_account_is_bloc_af187e" ON "account" ("is_blocked");
CREATE INDEX IF NOT EXISTS "idx_account_is_dele_a19275" ON "account" ("is_deleted");
COMMENT ON COLUMN "account"."is_blocked" IS '是否封禁';
COMMENT ON COLUMN "account"."blocked_at" IS '封禁时间(UTC)';
COMMENT ON COLUMN "account"."blocked_by" IS '封禁者';
COMMENT ON COLUMN "account"."blocked_reason" IS '封禁原因';
COMMENT ON COLUMN "account"."is_deleted" IS '是否删除';
COMMENT ON COLUMN "account"."deleted_at" IS '删除时间(UTC)';
COMMENT ON COLUMN "account"."deleted_by" IS '删除者';
COMMENT ON COLUMN "account"."address" IS '钱包地址';
COMMENT ON COLUMN "account"."private_key" IS '私钥';
COMMENT ON COLUMN "account"."tag" IS '标签';
COMMENT ON COLUMN "account"."network" IS '网络类型';
COMMENT ON COLUMN "account"."last_login_dt" IS '最后登录时间(UTC)';
COMMENT ON COLUMN "account"."encrypted_private_key" IS '加密的私钥';
COMMENT ON COLUMN "account"."balance" IS '余额（Wei单位）';
COMMENT ON COLUMN "account"."is_active" IS '是否激活';
COMMENT ON TABLE "account" IS '账户表';
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
    "full_name" VARCHAR(100),
    "date_of_birth" DATE,
    "selfie_url" VARCHAR(255),
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "address_line1" VARCHAR(255),
    "address_line2" VARCHAR(255),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "postal_code" VARCHAR(20),
    "residence_country" VARCHAR(2),
    "liveness_verified" BOOL NOT NULL DEFAULT False,
    "face_image_url" VARCHAR(255),
    "liveness_video_url" VARCHAR(255),
    "on_chain_sync_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "on_chain_tx_hash" VARCHAR(66),
    "on_chain_synced_at" TIMESTAMPTZ,
    "on_chain_error" TEXT,
    "risk_level" VARCHAR(20) NOT NULL DEFAULT 'low',
    "risk_score" INT NOT NULL DEFAULT 0,
    "priority" VARCHAR(20) NOT NULL DEFAULT 'normal',
    "review_progress" JSONB,
    "is_pep" BOOL NOT NULL DEFAULT False,
    "is_sanctioned" BOOL NOT NULL DEFAULT False,
    "source_ip" VARCHAR(45),
    "device_fingerprint" VARCHAR(64),
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
COMMENT ON COLUMN "account_kyc"."full_name" IS '证件姓名';
COMMENT ON COLUMN "account_kyc"."date_of_birth" IS '出生日期';
COMMENT ON COLUMN "account_kyc"."selfie_url" IS '手持证件自拍 MinIO 路径';
COMMENT ON COLUMN "account_kyc"."email" IS '邮箱地址';
COMMENT ON COLUMN "account_kyc"."phone" IS '电话号码 (E.164 格式)';
COMMENT ON COLUMN "account_kyc"."address_line1" IS '地址行1';
COMMENT ON COLUMN "account_kyc"."address_line2" IS '地址行2';
COMMENT ON COLUMN "account_kyc"."city" IS '城市';
COMMENT ON COLUMN "account_kyc"."state" IS '州/省';
COMMENT ON COLUMN "account_kyc"."postal_code" IS '邮政编码';
COMMENT ON COLUMN "account_kyc"."residence_country" IS '居住国家代码 (ISO 3166-1 alpha-2)';
COMMENT ON COLUMN "account_kyc"."liveness_verified" IS '活体检测是否通过';
COMMENT ON COLUMN "account_kyc"."face_image_url" IS '人脸图片 MinIO 路径';
COMMENT ON COLUMN "account_kyc"."liveness_video_url" IS '活体检测视频 MinIO 路径';
COMMENT ON COLUMN "account_kyc"."on_chain_sync_status" IS '链上同步状态';
COMMENT ON COLUMN "account_kyc"."on_chain_tx_hash" IS '链上同步交易哈希';
COMMENT ON COLUMN "account_kyc"."on_chain_synced_at" IS '链上同步成功时间';
COMMENT ON COLUMN "account_kyc"."on_chain_error" IS '链上同步失败原因';
COMMENT ON COLUMN "account_kyc"."risk_level" IS '风险等级';
COMMENT ON COLUMN "account_kyc"."risk_score" IS '风险评分 (0-100)';
COMMENT ON COLUMN "account_kyc"."priority" IS '审核优先级';
COMMENT ON COLUMN "account_kyc"."review_progress" IS '审核步骤进度 (JSON)';
COMMENT ON COLUMN "account_kyc"."is_pep" IS '是否为政治敏感人物 (PEP)';
COMMENT ON COLUMN "account_kyc"."is_sanctioned" IS '是否在制裁名单';
COMMENT ON COLUMN "account_kyc"."source_ip" IS '提交来源 IP';
COMMENT ON COLUMN "account_kyc"."device_fingerprint" IS '设备指纹';
COMMENT ON TABLE "account_kyc" IS '账户 KYC 认证表';
        CREATE TABLE IF NOT EXISTS "account_kyc_document" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "id_type" VARCHAR(20) NOT NULL,
    "id_number_hash" VARCHAR(64),
    "id_number_last4" VARCHAR(4),
    "document_expiry" DATE,
    "id_front_url" VARCHAR(255),
    "id_back_url" VARCHAR(255),
    "kyc_id" INT NOT NULL REFERENCES "account_kyc" ("id") ON DELETE CASCADE,
    CONSTRAINT "uid_account_kyc_kyc_id_0503fb" UNIQUE ("kyc_id", "id_type")
);
COMMENT ON COLUMN "account_kyc_document"."id_type" IS '证件类型 (id_card/passport/driver_license)';
COMMENT ON COLUMN "account_kyc_document"."id_number_hash" IS '证件号 SHA256 哈希';
COMMENT ON COLUMN "account_kyc_document"."id_number_last4" IS '证件号后4位 (明文，便于核对)';
COMMENT ON COLUMN "account_kyc_document"."document_expiry" IS '证件有效期';
COMMENT ON COLUMN "account_kyc_document"."id_front_url" IS '证件正面照片 MinIO 路径';
COMMENT ON COLUMN "account_kyc_document"."id_back_url" IS '证件背面照片 MinIO 路径 (护照可为空)';
COMMENT ON COLUMN "account_kyc_document"."kyc_id" IS '关联的 KYC 记录';
COMMENT ON TABLE "account_kyc_document" IS 'KYC 证件文档表';
        CREATE TABLE IF NOT EXISTS "asset" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "name" VARCHAR(200) NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "asset_type" VARCHAR(20) NOT NULL DEFAULT 'real_estate',
    "image_url" VARCHAR(500),
    "document_url" VARCHAR(500),
    "location" VARCHAR(300),
    "current_price" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "price_updated_at" TIMESTAMPTZ,
    "total_supply" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "subscribed_amount" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "min_subscription" DECIMAL(36,18) NOT NULL DEFAULT 100,
    "apy_3m" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "apy_6m" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "apy_12m" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "project" VARCHAR(50),
    "contract_address" VARCHAR(128),
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "environment" VARCHAR(20) NOT NULL DEFAULT 'hardhat',
    "created_by" INT
);
CREATE INDEX IF NOT EXISTS "idx_asset_status_11b0a0" ON "asset" ("status");
CREATE INDEX IF NOT EXISTS "idx_asset_asset_t_a0fc44" ON "asset" ("asset_type");
CREATE INDEX IF NOT EXISTS "idx_asset_environ_b47b9c" ON "asset" ("environment");
CREATE INDEX IF NOT EXISTS "idx_asset_created_a09321" ON "asset" ("created_at");
COMMENT ON COLUMN "asset"."name" IS '资产名称';
COMMENT ON COLUMN "asset"."symbol" IS '代币符号';
COMMENT ON COLUMN "asset"."description" IS '资产描述';
COMMENT ON COLUMN "asset"."asset_type" IS '资产类型';
COMMENT ON COLUMN "asset"."image_url" IS '资产图片URL';
COMMENT ON COLUMN "asset"."document_url" IS '相关文档URL';
COMMENT ON COLUMN "asset"."location" IS '资产位置/地址';
COMMENT ON COLUMN "asset"."current_price" IS '当前预言机价格 (USD)';
COMMENT ON COLUMN "asset"."price_updated_at" IS '价格最后更新时间';
COMMENT ON COLUMN "asset"."total_supply" IS '总募资额 (Token数量)';
COMMENT ON COLUMN "asset"."subscribed_amount" IS '已认购额';
COMMENT ON COLUMN "asset"."min_subscription" IS '最小认购金额';
COMMENT ON COLUMN "asset"."apy_3m" IS '3个月锁定期 APY (%)';
COMMENT ON COLUMN "asset"."apy_6m" IS '6个月锁定期 APY (%)';
COMMENT ON COLUMN "asset"."apy_12m" IS '12个月锁定期 APY (%)';
COMMENT ON COLUMN "asset"."project" IS '关联的项目标识 (deploy_info.project)';
COMMENT ON COLUMN "asset"."contract_address" IS '[DEPRECATED] 主 RWA Token 合约地址，请使用 primary_contract_address';
COMMENT ON COLUMN "asset"."status" IS '资产状态';
COMMENT ON COLUMN "asset"."environment" IS '环境标识';
COMMENT ON COLUMN "asset"."created_by" IS '创建人ID';
COMMENT ON TABLE "asset" IS 'RWA 资产表';
        CREATE TABLE IF NOT EXISTS "asset_contract_binding" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "contract_name" VARCHAR(100) NOT NULL,
    "contract_address" VARCHAR(128) NOT NULL,
    "contract_type" VARCHAR(20) NOT NULL DEFAULT 'project',
    "is_primary" BOOL NOT NULL DEFAULT False,
    "asset_id" INT NOT NULL REFERENCES "asset" ("id") ON DELETE CASCADE,
    CONSTRAINT "uid_asset_contr_asset_i_0846bc" UNIQUE ("asset_id", "contract_name")
);
CREATE INDEX IF NOT EXISTS "idx_asset_contr_contrac_b9ed1e" ON "asset_contract_binding" ("contract_address");
CREATE INDEX IF NOT EXISTS "idx_asset_contr_contrac_9deefc" ON "asset_contract_binding" ("contract_type");
COMMENT ON COLUMN "asset_contract_binding"."contract_name" IS '合约名称';
COMMENT ON COLUMN "asset_contract_binding"."contract_address" IS '合约地址';
COMMENT ON COLUMN "asset_contract_binding"."contract_type" IS '合约类型: common / project';
COMMENT ON COLUMN "asset_contract_binding"."is_primary" IS '是否为主合约';
COMMENT ON COLUMN "asset_contract_binding"."asset_id" IS '关联资产';
COMMENT ON TABLE "asset_contract_binding" IS '资产-合约绑定关联表';
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
    "media_type" VARCHAR(20) NOT NULL DEFAULT 'gallery',
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
COMMENT ON TABLE "asset_media" IS '资产媒体文件表';
        CREATE TABLE IF NOT EXISTS "asset_price_history" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "price" DECIMAL(36,18) NOT NULL,
    "source" VARCHAR(100),
    "asset_id" INT REFERENCES "asset" ("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "idx_asset_price_asset_i_c020cb" ON "asset_price_history" ("asset_id", "created_at");
COMMENT ON COLUMN "asset_price_history"."price" IS '价格 (USD)';
COMMENT ON COLUMN "asset_price_history"."source" IS '价格来源';
COMMENT ON COLUMN "asset_price_history"."asset_id" IS '关联资产';
COMMENT ON TABLE "asset_price_history" IS '资产价格历史表';
        CREATE TABLE IF NOT EXISTS "audit_log" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "category" VARCHAR(50) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'success',
    "operator_id" INT,
    "operator_address" VARCHAR(128),
    "operator_type" VARCHAR(50),
    "target_id" INT,
    "target_type" VARCHAR(50),
    "target_address" VARCHAR(128),
    "reason" TEXT,
    "description" TEXT,
    "old_value" JSONB,
    "new_value" JSONB,
    "extra_data" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "request_id" VARCHAR(64),
    "tx_hash" VARCHAR(128),
    "block_number" BIGINT,
    "gas_used" BIGINT,
    "operated_at" TIMESTAMPTZ NOT NULL,
    "duration_ms" INT,
    "error_code" VARCHAR(50),
    "error_message" TEXT,
    "environment" VARCHAR(32) NOT NULL DEFAULT 'hardhat'
);
CREATE INDEX IF NOT EXISTS "idx_audit_log_categor_298aed" ON "audit_log" ("category");
CREATE INDEX IF NOT EXISTS "idx_audit_log_action_286eba" ON "audit_log" ("action");
CREATE INDEX IF NOT EXISTS "idx_audit_log_status_60fba5" ON "audit_log" ("status");
CREATE INDEX IF NOT EXISTS "idx_audit_log_operato_73e948" ON "audit_log" ("operator_id");
CREATE INDEX IF NOT EXISTS "idx_audit_log_target__71654c" ON "audit_log" ("target_id");
CREATE INDEX IF NOT EXISTS "idx_audit_log_target__d6105b" ON "audit_log" ("target_type");
CREATE INDEX IF NOT EXISTS "idx_audit_log_ip_addr_29e592" ON "audit_log" ("ip_address");
CREATE INDEX IF NOT EXISTS "idx_audit_log_request_33bea3" ON "audit_log" ("request_id");
CREATE INDEX IF NOT EXISTS "idx_audit_log_tx_hash_2068f3" ON "audit_log" ("tx_hash");
CREATE INDEX IF NOT EXISTS "idx_audit_log_operate_0b55a9" ON "audit_log" ("operated_at");
CREATE INDEX IF NOT EXISTS "idx_audit_log_environ_003827" ON "audit_log" ("environment");
CREATE INDEX IF NOT EXISTS "idx_audit_log_operato_c40edf" ON "audit_log" ("operator_id", "operated_at");
CREATE INDEX IF NOT EXISTS "idx_audit_log_target__5612f0" ON "audit_log" ("target_type", "target_id", "operated_at");
CREATE INDEX IF NOT EXISTS "idx_audit_log_categor_6adbfc" ON "audit_log" ("category", "action", "operated_at");
CREATE INDEX IF NOT EXISTS "idx_audit_log_status_f7dccd" ON "audit_log" ("status", "operated_at");
COMMENT ON COLUMN "audit_log"."category" IS '审计类别';
COMMENT ON COLUMN "audit_log"."action" IS '操作类型';
COMMENT ON COLUMN "audit_log"."status" IS '操作状态';
COMMENT ON COLUMN "audit_log"."operator_id" IS '操作者账户ID';
COMMENT ON COLUMN "audit_log"."operator_address" IS '操作者钱包地址';
COMMENT ON COLUMN "audit_log"."operator_type" IS '操作者类型(user/admin/system)';
COMMENT ON COLUMN "audit_log"."target_id" IS '目标对象ID';
COMMENT ON COLUMN "audit_log"."target_type" IS '目标对象类型';
COMMENT ON COLUMN "audit_log"."target_address" IS '目标钱包地址';
COMMENT ON COLUMN "audit_log"."reason" IS '操作原因/备注';
COMMENT ON COLUMN "audit_log"."description" IS '操作描述';
COMMENT ON COLUMN "audit_log"."old_value" IS '操作前的值';
COMMENT ON COLUMN "audit_log"."new_value" IS '操作后的值';
COMMENT ON COLUMN "audit_log"."extra_data" IS '额外数据（灵活扩展）';
COMMENT ON COLUMN "audit_log"."ip_address" IS '操作IP地址';
COMMENT ON COLUMN "audit_log"."user_agent" IS '用户代理';
COMMENT ON COLUMN "audit_log"."request_id" IS '请求ID';
COMMENT ON COLUMN "audit_log"."tx_hash" IS '交易哈希';
COMMENT ON COLUMN "audit_log"."block_number" IS '区块高度';
COMMENT ON COLUMN "audit_log"."gas_used" IS 'Gas消耗';
COMMENT ON COLUMN "audit_log"."operated_at" IS '操作时间(UTC)';
COMMENT ON COLUMN "audit_log"."duration_ms" IS '操作耗时(毫秒)';
COMMENT ON COLUMN "audit_log"."error_code" IS '错误码';
COMMENT ON COLUMN "audit_log"."error_message" IS '错误信息';
COMMENT ON COLUMN "audit_log"."environment" IS '环境: hardhat/sepolia/mainnet';
COMMENT ON TABLE "audit_log" IS '通用审计日志表';
        CREATE TABLE IF NOT EXISTS "chains" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "chain_id" INT NOT NULL UNIQUE,
    "name" VARCHAR(64) NOT NULL,
    "display_name" VARCHAR(128) NOT NULL,
    "symbol" VARCHAR(16) NOT NULL DEFAULT 'ETH',
    "decimals" SMALLINT NOT NULL DEFAULT 18,
    "rpc_url" VARCHAR(512) NOT NULL,
    "rpc_url_backup" VARCHAR(512),
    "block_explorer" VARCHAR(256),
    "environment" VARCHAR(20) NOT NULL DEFAULT 'development',
    "is_testnet" BOOL NOT NULL DEFAULT False,
    "is_enabled" BOOL NOT NULL DEFAULT True,
    "icon" VARCHAR(64),
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "metadata" JSONB
);
CREATE INDEX IF NOT EXISTS "idx_chains_chain_i_7fd0ff" ON "chains" ("chain_id");
CREATE INDEX IF NOT EXISTS "idx_chains_environ_527fa9" ON "chains" ("environment");
CREATE INDEX IF NOT EXISTS "idx_chains_is_enab_d4ce08" ON "chains" ("is_enabled");
COMMENT ON COLUMN "chains"."chain_id" IS '链 ID (如 1, 31337)';
COMMENT ON COLUMN "chains"."name" IS '网络名称 (如 Ethereum)';
COMMENT ON COLUMN "chains"."display_name" IS '显示名称 (如 以太坊主网)';
COMMENT ON COLUMN "chains"."symbol" IS '代币符号';
COMMENT ON COLUMN "chains"."decimals" IS '代币精度';
COMMENT ON COLUMN "chains"."rpc_url" IS 'RPC URL';
COMMENT ON COLUMN "chains"."rpc_url_backup" IS '备用 RPC URL';
COMMENT ON COLUMN "chains"."block_explorer" IS '区块浏览器 URL';
COMMENT ON COLUMN "chains"."environment" IS '环境: development / production / all';
COMMENT ON COLUMN "chains"."is_testnet" IS '是否为测试网';
COMMENT ON COLUMN "chains"."is_enabled" IS '是否启用';
COMMENT ON COLUMN "chains"."icon" IS '图标标识';
COMMENT ON COLUMN "chains"."sort_order" IS '排序顺序';
COMMENT ON COLUMN "chains"."metadata" IS '扩展元数据';
COMMENT ON TABLE "chains" IS '区块链网络配置表';
        CREATE TABLE IF NOT EXISTS "contract_config" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "contract_name" VARCHAR(100) NOT NULL UNIQUE,
    "project_name" VARCHAR(100) NOT NULL,
    "provider_key" VARCHAR(100),
    "provider_key_hash" VARCHAR(66),
    "dependencies" JSONB NOT NULL,
    "contract_type" VARCHAR(50),
    "scope" VARCHAR(20) NOT NULL DEFAULT 'project',
    "description" TEXT,
    "display_name" VARCHAR(200),
    "version" VARCHAR(20),
    "dependency_type" VARCHAR(20) NOT NULL DEFAULT 'business',
    "is_primary" BOOL NOT NULL DEFAULT False,
    "module" VARCHAR(128),
    "required_deps" JSONB NOT NULL,
    "optional_deps" JSONB NOT NULL,
    "deploy_order" INT NOT NULL DEFAULT 100,
    "allow_zero_address" BOOL NOT NULL DEFAULT False,
    "environments" JSONB NOT NULL,
    "production_address" VARCHAR(64)
);
CREATE INDEX IF NOT EXISTS "idx_contract_co_project_ffb2d4" ON "contract_config" ("project_name");
CREATE INDEX IF NOT EXISTS "idx_contract_co_provide_bdceda" ON "contract_config" ("provider_key");
CREATE INDEX IF NOT EXISTS "idx_contract_co_project_e78039" ON "contract_config" ("project_name", "deploy_order");
COMMENT ON COLUMN "contract_config"."contract_name" IS '合约名称，如 VankeRWAToken';
COMMENT ON COLUMN "contract_config"."project_name" IS '项目名称: common, stablecoin, vanke, mock 等';
COMMENT ON COLUMN "contract_config"."provider_key" IS '对应的 Provider Key 名称，如 VANKE_RWA_TOKEN';
COMMENT ON COLUMN "contract_config"."provider_key_hash" IS 'keccak256(provider_key) 的 hex 值';
COMMENT ON COLUMN "contract_config"."dependencies" IS '依赖的 Provider Key 列表 (JSON Array)';
COMMENT ON COLUMN "contract_config"."contract_type" IS '合约类型: registry, kyc, stablecoin, token, defi';
COMMENT ON COLUMN "contract_config"."scope" IS '作用域: global (公共) / project (项目私有)';
COMMENT ON COLUMN "contract_config"."description" IS '合约描述';
COMMENT ON COLUMN "contract_config"."display_name" IS '显示名称';
COMMENT ON COLUMN "contract_config"."version" IS '合约版本';
COMMENT ON COLUMN "contract_config"."dependency_type" IS '依赖类型: primary, required, business, optional';
COMMENT ON COLUMN "contract_config"."is_primary" IS '是否为项目主合约 (入口合约)';
COMMENT ON COLUMN "contract_config"."module" IS '合约所属模块，如 token, defi';
COMMENT ON COLUMN "contract_config"."required_deps" IS '必须依赖的 Provider Key 列表';
COMMENT ON COLUMN "contract_config"."optional_deps" IS '可选依赖的 Provider Key 列表';
COMMENT ON COLUMN "contract_config"."deploy_order" IS '部署顺序，数值越小越先部署';
COMMENT ON COLUMN "contract_config"."allow_zero_address" IS '是否允许零地址依赖 (用于可选依赖)';
COMMENT ON COLUMN "contract_config"."environments" IS '支持的环境列表，如 [''hardhat'', ''sepolia'', ''mainnet'']';
COMMENT ON COLUMN "contract_config"."production_address" IS '生产环境预设地址 (如有)';
COMMENT ON TABLE "contract_config" IS '合约配置表';
        CREATE TABLE IF NOT EXISTS "contract_deployment" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "name" VARCHAR(255) NOT NULL,
    "address" VARCHAR(255) NOT NULL UNIQUE,
    "deployer_address" VARCHAR(255) NOT NULL,
    "network" VARCHAR(255) NOT NULL,
    "chain_id" BIGINT NOT NULL,
    "scope" VARCHAR(50) NOT NULL DEFAULT 'global',
    "contract_type" VARCHAR(50) NOT NULL DEFAULT 'unknown',
    "project_name" VARCHAR(255) NOT NULL,
    "tx_hash" VARCHAR(255) NOT NULL,
    "abi_path" VARCHAR(255),
    "status" VARCHAR(255) NOT NULL DEFAULT 'active',
    "is_primary" BOOL NOT NULL DEFAULT False,
    "symbol" VARCHAR(20),
    "bindings" JSONB,
    "deploy_block" BIGINT,
    "config_id" INT REFERENCES "contract_config" ("id") ON DELETE SET NULL,
    CONSTRAINT "uid_contract_de_name_a95877" UNIQUE ("name", "chain_id")
);
COMMENT ON COLUMN "contract_deployment"."name" IS '合约名称';
COMMENT ON COLUMN "contract_deployment"."address" IS '合约地址';
COMMENT ON COLUMN "contract_deployment"."deployer_address" IS '部署者地址';
COMMENT ON COLUMN "contract_deployment"."network" IS '网络类型';
COMMENT ON COLUMN "contract_deployment"."chain_id" IS '链ID (EIP-155)';
COMMENT ON COLUMN "contract_deployment"."scope" IS '作用域: global (公共) / project (项目私有)';
COMMENT ON COLUMN "contract_deployment"."contract_type" IS '功能类型: registry, kyc, stablecoin, token, defi 等';
COMMENT ON COLUMN "contract_deployment"."project_name" IS '项目名称';
COMMENT ON COLUMN "contract_deployment"."tx_hash" IS '部署交易哈希';
COMMENT ON COLUMN "contract_deployment"."abi_path" IS 'ABI 文件路径';
COMMENT ON COLUMN "contract_deployment"."status" IS '合约状态: active, paused, deprecated, frozen';
COMMENT ON COLUMN "contract_deployment"."is_primary" IS '是否为项目主合约（RWA Token），每个项目只能有一个主合约';
COMMENT ON COLUMN "contract_deployment"."symbol" IS 'Token Symbol，用于标识代币符号';
COMMENT ON COLUMN "contract_deployment"."bindings" IS '依赖绑定状态，格式: {provider_key: bound_address}';
COMMENT ON COLUMN "contract_deployment"."deploy_block" IS '部署区块号';
COMMENT ON COLUMN "contract_deployment"."config_id" IS '关联的合约配置';
COMMENT ON TABLE "contract_deployment" IS '合约部署记录表';
        CREATE TABLE IF NOT EXISTS "kyc_audit_log" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "action" VARCHAR(20) NOT NULL,
    "actor_address" VARCHAR(42) NOT NULL,
    "actor_role" VARCHAR(20) NOT NULL,
    "details" JSONB,
    "kyc_id" INT NOT NULL REFERENCES "account_kyc" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_kyc_audit_l_action_58dd92" ON "kyc_audit_log" ("action");
CREATE INDEX IF NOT EXISTS "idx_kyc_audit_l_actor_a_75a62c" ON "kyc_audit_log" ("actor_address");
CREATE INDEX IF NOT EXISTS "idx_kyc_audit_l_kyc_id_cb0f5d" ON "kyc_audit_log" ("kyc_id", "created_at");
COMMENT ON COLUMN "kyc_audit_log"."action" IS '操作类型';
COMMENT ON COLUMN "kyc_audit_log"."actor_address" IS '操作者地址';
COMMENT ON COLUMN "kyc_audit_log"."actor_role" IS '操作者角色 (user/admin/system)';
COMMENT ON COLUMN "kyc_audit_log"."details" IS '操作详情';
COMMENT ON COLUMN "kyc_audit_log"."kyc_id" IS '关联的 KYC 记录';
COMMENT ON TABLE "kyc_audit_log" IS 'KYC 审核日志表';
        CREATE TABLE IF NOT EXISTS "provider_registry" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "is_deleted" BOOL NOT NULL DEFAULT False,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" VARCHAR(128),
    "provider_address" VARCHAR(42) NOT NULL,
    "chain_id" INT NOT NULL,
    "network" VARCHAR(20) NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "key_hash" VARCHAR(66) NOT NULL,
    "registered_address" VARCHAR(42) NOT NULL DEFAULT '0x0000000000000000000000000000000000000000',
    "category" VARCHAR(50) NOT NULL,
    "contract_name" VARCHAR(100) NOT NULL,
    "is_registered" BOOL NOT NULL DEFAULT False,
    "last_synced_at" TIMESTAMPTZ,
    CONSTRAINT "uid_provider_re_provide_be731d" UNIQUE ("provider_address", "chain_id", "key")
);
CREATE INDEX IF NOT EXISTS "idx_provider_re_is_dele_0dbfe9" ON "provider_registry" ("is_deleted");
COMMENT ON COLUMN "provider_registry"."is_deleted" IS '是否删除';
COMMENT ON COLUMN "provider_registry"."deleted_at" IS '删除时间(UTC)';
COMMENT ON COLUMN "provider_registry"."deleted_by" IS '删除者';
COMMENT ON COLUMN "provider_registry"."provider_address" IS 'AddressProvider 合约地址';
COMMENT ON COLUMN "provider_registry"."chain_id" IS '链 ID';
COMMENT ON COLUMN "provider_registry"."network" IS '网络类型';
COMMENT ON COLUMN "provider_registry"."key" IS 'Provider Key，如 VANKE_RWA_TOKEN';
COMMENT ON COLUMN "provider_registry"."key_hash" IS 'keccak256(key) 的 hex 值';
COMMENT ON COLUMN "provider_registry"."registered_address" IS '当前注册的合约地址';
COMMENT ON COLUMN "provider_registry"."category" IS '分类: common, mock, vanke 等';
COMMENT ON COLUMN "provider_registry"."contract_name" IS '合约名称，如 VankeRWAToken';
COMMENT ON COLUMN "provider_registry"."is_registered" IS '是否已注册 (地址非零)';
COMMENT ON COLUMN "provider_registry"."last_synced_at" IS '最后同步链上状态的时间';
COMMENT ON TABLE "provider_registry" IS 'Provider 注册记录表';
        CREATE TABLE IF NOT EXISTS "subscription" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "wallet_address" VARCHAR(128) NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL,
    "token_type" VARCHAR(10) NOT NULL DEFAULT 'USDT',
    "lock_period" INT NOT NULL,
    "apy" DECIMAL(10,4) NOT NULL,
    "rwa_token_amount" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "start_date" TIMESTAMPTZ,
    "end_date" TIMESTAMPTZ,
    "original_end_date" TIMESTAMPTZ,
    "redeemed_at" TIMESTAMPTZ,
    "expected_interest" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "actual_interest" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "tx_hash" VARCHAR(128),
    "redeem_tx_hash" VARCHAR(128),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "environment" VARCHAR(20) NOT NULL DEFAULT 'hardhat',
    "asset_id" INT NOT NULL REFERENCES "asset" ("id") ON DELETE RESTRICT,
    CONSTRAINT "uid_subscriptio_tx_hash_42acc7" UNIQUE ("tx_hash", "environment")
);
CREATE INDEX IF NOT EXISTS "idx_subscriptio_wallet__e68830" ON "subscription" ("wallet_address");
CREATE INDEX IF NOT EXISTS "idx_subscriptio_wallet__f6f50c" ON "subscription" ("wallet_address", "environment");
CREATE INDEX IF NOT EXISTS "idx_subscriptio_asset_i_142c4d" ON "subscription" ("asset_id", "environment");
CREATE INDEX IF NOT EXISTS "idx_subscriptio_status_ee5b1e" ON "subscription" ("status");
CREATE INDEX IF NOT EXISTS "idx_subscriptio_end_dat_e58acf" ON "subscription" ("end_date");
COMMENT ON COLUMN "subscription"."wallet_address" IS '用户钱包地址';
COMMENT ON COLUMN "subscription"."amount" IS '认购金额 (稳定币)';
COMMENT ON COLUMN "subscription"."token_type" IS '支付代币类型';
COMMENT ON COLUMN "subscription"."lock_period" IS '锁定期 (月)';
COMMENT ON COLUMN "subscription"."apy" IS '认购时的 APY (%)';
COMMENT ON COLUMN "subscription"."rwa_token_amount" IS '获得的 RWA Token 数量';
COMMENT ON COLUMN "subscription"."start_date" IS '认购开始时间';
COMMENT ON COLUMN "subscription"."end_date" IS '锁定期结束时间';
COMMENT ON COLUMN "subscription"."original_end_date" IS '原始到期时间 (质押可能延期)';
COMMENT ON COLUMN "subscription"."redeemed_at" IS '赎回时间';
COMMENT ON COLUMN "subscription"."expected_interest" IS '预期利息';
COMMENT ON COLUMN "subscription"."actual_interest" IS '实际利息 (赎回时计算)';
COMMENT ON COLUMN "subscription"."tx_hash" IS '认购交易哈希';
COMMENT ON COLUMN "subscription"."redeem_tx_hash" IS '赎回交易哈希';
COMMENT ON COLUMN "subscription"."status" IS '认购状态';
COMMENT ON COLUMN "subscription"."environment" IS '环境标识';
COMMENT ON COLUMN "subscription"."asset_id" IS '关联资产';
COMMENT ON TABLE "subscription" IS '认购记录表';
        CREATE TABLE IF NOT EXISTS "staking_record" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "wallet_address" VARCHAR(128) NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL,
    "period" INT NOT NULL,
    "multiplier" DECIMAL(10,2) NOT NULL,
    "start_date" TIMESTAMPTZ NOT NULL,
    "end_date" TIMESTAMPTZ NOT NULL,
    "expected_rewards" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "claimed_rewards" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "status" VARCHAR(9) NOT NULL DEFAULT 'active',
    "stake_tx_hash" VARCHAR(128),
    "unstake_tx_hash" VARCHAR(128),
    "environment" VARCHAR(32) NOT NULL DEFAULT 'hardhat',
    "subscription_id" INT REFERENCES "subscription" ("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "idx_staking_rec_wallet__f14228" ON "staking_record" ("wallet_address");
CREATE INDEX IF NOT EXISTS "idx_staking_rec_status_83c7ee" ON "staking_record" ("status");
CREATE INDEX IF NOT EXISTS "idx_staking_rec_environ_d48ccc" ON "staking_record" ("environment");
COMMENT ON COLUMN "staking_record"."wallet_address" IS '用户钱包地址';
COMMENT ON COLUMN "staking_record"."amount" IS '质押的 RWA Token 数量';
COMMENT ON COLUMN "staking_record"."period" IS '质押周期（天）: 15/30/45/60';
COMMENT ON COLUMN "staking_record"."multiplier" IS '奖励倍数: 1.0/2.5/4.5/7.0';
COMMENT ON COLUMN "staking_record"."start_date" IS '质押开始时间';
COMMENT ON COLUMN "staking_record"."end_date" IS '质押到期时间';
COMMENT ON COLUMN "staking_record"."expected_rewards" IS '预期 PLT 奖励';
COMMENT ON COLUMN "staking_record"."claimed_rewards" IS '已领取的 PLT 奖励';
COMMENT ON COLUMN "staking_record"."status" IS '质押状态';
COMMENT ON COLUMN "staking_record"."stake_tx_hash" IS '质押交易哈希';
COMMENT ON COLUMN "staking_record"."unstake_tx_hash" IS '解押交易哈希';
COMMENT ON COLUMN "staking_record"."environment" IS '环境: hardhat/sepolia/mainnet';
COMMENT ON COLUMN "staking_record"."subscription_id" IS '关联的认购记录';
COMMENT ON TABLE "staking_record" IS '质押记录';
        CREATE TABLE IF NOT EXISTS "reward_claim" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "wallet_address" VARCHAR(128) NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL,
    "tx_hash" VARCHAR(128),
    "environment" VARCHAR(32) NOT NULL DEFAULT 'hardhat',
    "staking_record_id" INT NOT NULL REFERENCES "staking_record" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_reward_clai_wallet__20a61b" ON "reward_claim" ("wallet_address");
CREATE INDEX IF NOT EXISTS "idx_reward_clai_environ_ea06d2" ON "reward_claim" ("environment");
COMMENT ON COLUMN "reward_claim"."wallet_address" IS '用户钱包地址';
COMMENT ON COLUMN "reward_claim"."amount" IS '领取的 PLT 数量';
COMMENT ON COLUMN "reward_claim"."tx_hash" IS '领取交易哈希';
COMMENT ON COLUMN "reward_claim"."environment" IS '环境: hardhat/sepolia/mainnet';
COMMENT ON COLUMN "reward_claim"."staking_record_id" IS '关联的质押记录';
COMMENT ON TABLE "reward_claim" IS '奖励领取记录';
        CREATE TABLE IF NOT EXISTS "staking_limit" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "date" DATE NOT NULL,
    "base_limit" DECIMAL(36,18) NOT NULL,
    "carried_limit" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "used_limit" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "environment" VARCHAR(32) NOT NULL DEFAULT 'hardhat',
    CONSTRAINT "uid_staking_lim_date_d65845" UNIQUE ("date", "environment")
);
CREATE INDEX IF NOT EXISTS "idx_staking_lim_date_8c946a" ON "staking_limit" ("date");
CREATE INDEX IF NOT EXISTS "idx_staking_lim_environ_8bea2d" ON "staking_limit" ("environment");
COMMENT ON COLUMN "staking_limit"."date" IS '日期';
COMMENT ON COLUMN "staking_limit"."base_limit" IS '当日基础限额';
COMMENT ON COLUMN "staking_limit"."carried_limit" IS '累积的未用限额';
COMMENT ON COLUMN "staking_limit"."used_limit" IS '已使用限额';
COMMENT ON COLUMN "staking_limit"."environment" IS '环境: hardhat/sepolia/mainnet';
COMMENT ON TABLE "staking_limit" IS '质押限额';
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
    "environment" VARCHAR(32) NOT NULL DEFAULT 'hardhat'
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
COMMENT ON COLUMN "transaction_audit"."environment" IS '环境: hardhat/sepolia/mainnet';
COMMENT ON TABLE "transaction_audit" IS '链上交易审计表';"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS "account_kyc_document";
        DROP TABLE IF EXISTS "account_kyc";
        DROP TABLE IF EXISTS "audit_log";
        DROP TABLE IF EXISTS "staking_record";
        DROP TABLE IF EXISTS "kyc_audit_log";
        DROP TABLE IF EXISTS "provider_registry";
        DROP TABLE IF EXISTS "asset_media";
        DROP TABLE IF EXISTS "chains";
        DROP TABLE IF EXISTS "staking_limit";
        DROP TABLE IF EXISTS "subscription";
        DROP TABLE IF EXISTS "contract_config";
        DROP TABLE IF EXISTS "account";
        DROP TABLE IF EXISTS "transaction_audit";
        DROP TABLE IF EXISTS "asset_price_history";
        DROP TABLE IF EXISTS "asset";
        DROP TABLE IF EXISTS "reward_claim";
        DROP TABLE IF EXISTS "contract_deployment";
        DROP TABLE IF EXISTS "asset_contract_binding";
        DROP TABLE IF EXISTS "asset_features";"""


MODELS_STATE = (
    "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"
    "5U6BFgPYa2POr28tf/B3tN9Bo="
)
