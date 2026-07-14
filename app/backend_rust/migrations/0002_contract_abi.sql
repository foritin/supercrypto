-- 0002_contract_abi.sql
-- Add abi column to contract_deployment for storing contract ABI JSON directly in SQLite

ALTER TABLE contract_deployment ADD COLUMN abi TEXT;
