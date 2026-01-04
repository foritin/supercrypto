"""
KYC 增强字段迁移 (Story 2.6)
添加身份证件信息、文件 URL、链上同步状态等字段

Migration: 19_20251216160000_add_kyc_identity_fields
"""

from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        -- 证件类型
        ALTER TABLE "user_kyc" ADD COLUMN IF NOT EXISTS "id_type" VARCHAR(20);
        
        -- 证件信息 (ADR-1: SHA256 + 后4位明文)
        ALTER TABLE "user_kyc" ADD COLUMN IF NOT EXISTS "id_number_hash" VARCHAR(64);
        ALTER TABLE "user_kyc" ADD COLUMN IF NOT EXISTS "id_number_last4" VARCHAR(4);
        ALTER TABLE "user_kyc" ADD COLUMN IF NOT EXISTS "full_name" VARCHAR(100);
        ALTER TABLE "user_kyc" ADD COLUMN IF NOT EXISTS "date_of_birth" DATE;
        
        -- 证件照片 (MinIO 路径)
        ALTER TABLE "user_kyc" ADD COLUMN IF NOT EXISTS "id_front_url" VARCHAR(255);
        ALTER TABLE "user_kyc" ADD COLUMN IF NOT EXISTS "id_back_url" VARCHAR(255);
        ALTER TABLE "user_kyc" ADD COLUMN IF NOT EXISTS "selfie_url" VARCHAR(255);
        
        -- 链上同步状态 (ADR-3: 合约调用失败处理)
        ALTER TABLE "user_kyc" ADD COLUMN IF NOT EXISTS "on_chain_sync_status" VARCHAR(20) DEFAULT 'pending';
        ALTER TABLE "user_kyc" ADD COLUMN IF NOT EXISTS "on_chain_tx_hash" VARCHAR(66);
        ALTER TABLE "user_kyc" ADD COLUMN IF NOT EXISTS "on_chain_synced_at" TIMESTAMPTZ;
        ALTER TABLE "user_kyc" ADD COLUMN IF NOT EXISTS "on_chain_error" TEXT;
        
        -- 添加索引
        CREATE INDEX IF NOT EXISTS "idx_user_kyc_on_chain_sync_status" ON "user_kyc" ("on_chain_sync_status");
        """


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        -- 删除索引
        DROP INDEX IF EXISTS "idx_user_kyc_on_chain_sync_status";
        
        -- 删除链上同步状态字段
        ALTER TABLE "user_kyc" DROP COLUMN IF EXISTS "on_chain_error";
        ALTER TABLE "user_kyc" DROP COLUMN IF EXISTS "on_chain_synced_at";
        ALTER TABLE "user_kyc" DROP COLUMN IF EXISTS "on_chain_tx_hash";
        ALTER TABLE "user_kyc" DROP COLUMN IF EXISTS "on_chain_sync_status";
        
        -- 删除证件照片字段
        ALTER TABLE "user_kyc" DROP COLUMN IF EXISTS "selfie_url";
        ALTER TABLE "user_kyc" DROP COLUMN IF EXISTS "id_back_url";
        ALTER TABLE "user_kyc" DROP COLUMN IF EXISTS "id_front_url";
        
        -- 删除证件信息字段
        ALTER TABLE "user_kyc" DROP COLUMN IF EXISTS "date_of_birth";
        ALTER TABLE "user_kyc" DROP COLUMN IF EXISTS "full_name";
        ALTER TABLE "user_kyc" DROP COLUMN IF EXISTS "id_number_last4";
        ALTER TABLE "user_kyc" DROP COLUMN IF EXISTS "id_number_hash";
        ALTER TABLE "user_kyc" DROP COLUMN IF EXISTS "id_type";
        """


MODELS_STATE = "eJyrVoovyElMTs3Iz0lJLVKyUigpKk2tBQBeDQg5"
