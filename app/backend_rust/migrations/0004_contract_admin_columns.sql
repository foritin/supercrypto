-- 0004_contract_admin_columns.sql
-- Add columns needed by admin contract management endpoints
-- Aligns contract_deployment and provider_registry with Python backend schema

-- ============================================================
-- contract_deployment: add is_primary column
-- ============================================================
ALTER TABLE contract_deployment ADD COLUMN is_primary INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- provider_registry: add category, contract_name, last_synced_at
-- ============================================================
ALTER TABLE provider_registry ADD COLUMN category VARCHAR(50) DEFAULT 'unknown';
ALTER TABLE provider_registry ADD COLUMN contract_name VARCHAR(100);
ALTER TABLE provider_registry ADD COLUMN last_synced_at TIMESTAMP;
