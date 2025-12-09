-- RWA Database Initialization Script
-- This script initializes the PostgreSQL database for RWA system
-- 
-- Usage:
--   1. First create database: createdb rwa
--   2. Then run this script: psql -d rwa -f init_rwa_database.sql
--
-- Or if database already exists, just run step 2

-- Drop table if exists (for clean reinstall)
DROP TABLE IF EXISTS account CASCADE;

-- Create mock_account table
CREATE TABLE mock_account (
    id SERIAL PRIMARY KEY,
    address VARCHAR(128) NOT NULL UNIQUE,
    private_key VARCHAR(256) NOT NULL,
    tag VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on address for faster lookups
CREATE INDEX idx_mock_account_address ON mock_account(address);

-- Create index on tag for filtering
CREATE INDEX idx_mock_account_tag ON mock_account(tag);

-- Add comment to table
COMMENT ON TABLE account IS 'Mock accounts for testing and development';
COMMENT ON COLUMN account.id IS 'Auto-incrementing primary key';
COMMENT ON COLUMN account.address IS 'Ethereum wallet address (with 0x prefix)';
COMMENT ON COLUMN account.private_key IS 'Private key for the wallet (with 0x prefix)';
COMMENT ON COLUMN account.tag IS 'Additional information or label for the account';
COMMENT ON COLUMN account.created_at IS 'Timestamp when the account was created';
COMMENT ON COLUMN account.updated_at IS 'Timestamp when the account was last updated';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_mock_account_updated_at 
    BEFORE UPDATE ON mock_account 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust as needed)
-- GRANT ALL PRIVILEGES ON TABLE mock_account TO your_user;
-- GRANT USAGE, SELECT ON SEQUENCE mock_account_id_seq TO your_user;

-- Insert some sample data (optional, for testing)
-- INSERT INTO mock_account (address, private_key, tag) VALUES
-- ('0x1234567890123456789012345678901234567890', '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890', 'test_account_1'),
-- ('0x2345678901234567890123456789012345678901', '0xbcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678901a', 'test_account_2');

-- Display table structure


