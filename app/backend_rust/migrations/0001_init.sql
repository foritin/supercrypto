-- PostgreSQL schema migration for SuperCrypto Rust backend
-- Compatible with existing Python Tortoise ORM schema

CREATE TABLE IF NOT EXISTS account (
    id SERIAL PRIMARY KEY,
    address VARCHAR(128) NOT NULL,
    private_key VARCHAR(256) NOT NULL,
    roles JSONB DEFAULT '[]',
    network VARCHAR(20) DEFAULT 'hardhat',
    last_login_dt TIMESTAMP WITH TIME ZONE,
    encrypted_private_key VARCHAR(512),
    balance DECIMAL(36, 18) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_blocked BOOLEAN DEFAULT false,
    blocked_at TIMESTAMP WITH TIME ZONE,
    blocked_by VARCHAR(128),
    blocked_reason TEXT,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(address, network)
);

CREATE INDEX IF NOT EXISTS idx_account_address ON account(address);
CREATE INDEX IF NOT EXISTS idx_account_network ON account(network);
CREATE INDEX IF NOT EXISTS idx_account_roles ON account USING GIN(roles);

CREATE TABLE IF NOT EXISTS asset (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    description TEXT,
    asset_type VARCHAR(20) DEFAULT 'real_estate',
    image_url VARCHAR(500),
    document_url VARCHAR(500),
    location VARCHAR(300),
    current_price DECIMAL(36, 18) DEFAULT 0,
    price_updated_at TIMESTAMP WITH TIME ZONE,
    total_supply DECIMAL(36, 18) DEFAULT 0,
    subscribed_amount DECIMAL(36, 18) DEFAULT 0,
    min_subscription DECIMAL(36, 18) DEFAULT 100,
    subscription_start_at TIMESTAMP WITH TIME ZONE,
    subscription_end_at TIMESTAMP WITH TIME ZONE,
    apy_3m DECIMAL(10, 4) DEFAULT 0,
    apy_6m DECIMAL(10, 4) DEFAULT 0,
    apy_12m DECIMAL(10, 4) DEFAULT 0,
    subscription_mode VARCHAR(10) DEFAULT 'both',
    project VARCHAR(50),
    contract_address VARCHAR(128),
    frame_style VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active',
    environment VARCHAR(20) DEFAULT 'hardhat',
    created_by INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_asset_status ON asset(status);
CREATE INDEX IF NOT EXISTS idx_asset_type ON asset(asset_type);
CREATE INDEX IF NOT EXISTS idx_asset_env ON asset(environment);
CREATE INDEX IF NOT EXISTS idx_asset_created ON asset(created_at);

CREATE TABLE IF NOT EXISTS asset_contract_binding (
    id SERIAL PRIMARY KEY,
    asset_id INT NOT NULL REFERENCES asset(id) ON DELETE CASCADE,
    contract_name VARCHAR(100) NOT NULL,
    contract_address VARCHAR(128) NOT NULL,
    contract_type VARCHAR(20) DEFAULT 'project',
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(asset_id, contract_name)
);

CREATE INDEX IF NOT EXISTS idx_acb_address ON asset_contract_binding(contract_address);
CREATE INDEX IF NOT EXISTS idx_acb_type ON asset_contract_binding(contract_type);

CREATE TABLE IF NOT EXISTS asset_price_history (
    id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES asset(id) ON DELETE SET NULL,
    price DECIMAL(36, 18) NOT NULL,
    source VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_aph_asset_created ON asset_price_history(asset_id, created_at);

CREATE TABLE IF NOT EXISTS subscription (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(128) NOT NULL,
    asset_id INT NOT NULL REFERENCES asset(id) ON DELETE RESTRICT,
    amount DECIMAL(36, 18) NOT NULL,
    token_type VARCHAR(10) DEFAULT 'USDT',
    lock_period INT NOT NULL,
    apy DECIMAL(10, 4) NOT NULL,
    rwa_token_amount DECIMAL(36, 18) DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    original_end_date TIMESTAMP WITH TIME ZONE,
    redeemed_at TIMESTAMP WITH TIME ZONE,
    expected_interest DECIMAL(36, 18) DEFAULT 0,
    actual_interest DECIMAL(36, 18) DEFAULT 0,
    tx_hash VARCHAR(128),
    redeem_tx_hash VARCHAR(128),
    status VARCHAR(20) DEFAULT 'pending',
    environment VARCHAR(20) DEFAULT 'hardhat',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tx_hash, environment)
);

CREATE INDEX IF NOT EXISTS idx_sub_wallet_env ON subscription(wallet_address, environment);
CREATE INDEX IF NOT EXISTS idx_sub_asset_env ON subscription(asset_id, environment);
CREATE INDEX IF NOT EXISTS idx_sub_status ON subscription(status);
CREATE INDEX IF NOT EXISTS idx_sub_end ON subscription(end_date);

CREATE TABLE IF NOT EXISTS staking_record (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(128) NOT NULL,
    subscription_id INT REFERENCES subscription(id) ON DELETE SET NULL,
    amount DECIMAL(36, 18) NOT NULL,
    period INT NOT NULL,
    multiplier DECIMAL(10, 2) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    expected_rewards DECIMAL(36, 18) DEFAULT 0,
    claimed_rewards DECIMAL(36, 18) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    stake_tx_hash VARCHAR(128),
    unstake_tx_hash VARCHAR(128),
    environment VARCHAR(32) DEFAULT 'hardhat',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staking_wallet ON staking_record(wallet_address);
CREATE INDEX IF NOT EXISTS idx_staking_env ON staking_record(environment);
CREATE INDEX IF NOT EXISTS idx_staking_status ON staking_record(status);

CREATE TABLE IF NOT EXISTS staking_limit (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    base_limit DECIMAL(36, 18) NOT NULL,
    carried_limit DECIMAL(36, 18) DEFAULT 0,
    used_limit DECIMAL(36, 18) DEFAULT 0,
    environment VARCHAR(32) DEFAULT 'hardhat',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, environment)
);

CREATE TABLE IF NOT EXISTS reward_claim (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(128) NOT NULL,
    staking_record_id INT NOT NULL REFERENCES staking_record(id) ON DELETE CASCADE,
    amount DECIMAL(36, 18) NOT NULL,
    tx_hash VARCHAR(128),
    environment VARCHAR(32) DEFAULT 'hardhat',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS account_kyc (
    id SERIAL PRIMARY KEY,
    address VARCHAR(42) NOT NULL,
    network VARCHAR(20) DEFAULT 'hardhat',
    status VARCHAR(20) DEFAULT 'not_started',
    submitted_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewer_address VARCHAR(42),
    reject_reason TEXT,
    external_kyc_id VARCHAR(100),
    country_code VARCHAR(2),
    is_accredited BOOLEAN DEFAULT false,
    full_name VARCHAR(100),
    date_of_birth DATE,
    selfie_url VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    residence_country VARCHAR(2),
    liveness_verified BOOLEAN DEFAULT false,
    face_image_url VARCHAR(255),
    liveness_video_url VARCHAR(255),
    on_chain_sync_status VARCHAR(20) DEFAULT 'pending',
    on_chain_tx_hash VARCHAR(66),
    on_chain_synced_at TIMESTAMP WITH TIME ZONE,
    on_chain_error TEXT,
    risk_level VARCHAR(20) DEFAULT 'low',
    risk_score INT DEFAULT 0,
    priority VARCHAR(20) DEFAULT 'normal',
    review_progress JSONB,
    is_pep BOOLEAN DEFAULT false,
    is_sanctioned BOOLEAN DEFAULT false,
    source_ip VARCHAR(45),
    device_fingerprint VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(address, network)
);

CREATE INDEX IF NOT EXISTS idx_kyc_status ON account_kyc(status);

CREATE TABLE IF NOT EXISTS account_kyc_document (
    id SERIAL PRIMARY KEY,
    kyc_id INT NOT NULL REFERENCES account_kyc(id) ON DELETE CASCADE,
    id_type VARCHAR(20) NOT NULL,
    id_number_hash VARCHAR(64),
    id_number_last4 VARCHAR(4),
    document_expiry DATE,
    id_front_url VARCHAR(255),
    id_back_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(kyc_id, id_type)
);

CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    action VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id INT,
    actor_address VARCHAR(128),
    actor_role VARCHAR(50),
    details JSONB,
    status VARCHAR(20) DEFAULT 'success',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_category ON audit_log(category);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

CREATE TABLE IF NOT EXISTS contract_deployment (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(128) NOT NULL,
    deployer_address VARCHAR(128) NOT NULL,
    network VARCHAR(20) NOT NULL,
    chain_id INT NOT NULL,
    scope VARCHAR(20) NOT NULL,
    contract_type VARCHAR(20) NOT NULL,
    project_name VARCHAR(100) NOT NULL,
    tx_hash VARCHAR(128) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    abi_path VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cd_name ON contract_deployment(name);
CREATE INDEX IF NOT EXISTS idx_cd_network ON contract_deployment(network);
CREATE INDEX IF NOT EXISTS idx_cd_project ON contract_deployment(project_name);

CREATE TABLE IF NOT EXISTS contract_config (
    id SERIAL PRIMARY KEY,
    contract_name VARCHAR(100) NOT NULL UNIQUE,
    project_name VARCHAR(100) DEFAULT 'common',
    provider_key VARCHAR(50),
    provider_key_hash VARCHAR(66),
    dependencies JSONB,
    contract_type VARCHAR(20) NOT NULL,
    scope VARCHAR(20) NOT NULL,
    description TEXT,
    dependency_type VARCHAR(20) DEFAULT 'business',
    is_primary BOOLEAN DEFAULT false,
    deploy_order INT,
    required_deps JSONB,
    optional_deps JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS provider_registry (
    id SERIAL PRIMARY KEY,
    provider_address VARCHAR(128) NOT NULL,
    chain_id INT NOT NULL,
    network VARCHAR(20) NOT NULL,
    key VARCHAR(50) NOT NULL,
    key_hash VARCHAR(66) NOT NULL,
    is_registered BOOLEAN DEFAULT false,
    registered_address VARCHAR(128) DEFAULT '0x0000000000000000000000000000000000000000',
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chain (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    network VARCHAR(20) NOT NULL,
    chain_id INT NOT NULL,
    rpc_url VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transaction_audit (
    id SERIAL PRIMARY KEY,
    tx_hash VARCHAR(128) NOT NULL,
    from_address VARCHAR(128),
    to_address VARCHAR(128),
    amount DECIMAL(36, 18),
    token_type VARCHAR(10),
    status VARCHAR(20) DEFAULT 'pending',
    tx_type VARCHAR(50),
    block_number BIGINT,
    gas_used DECIMAL(36, 0),
    gas_price DECIMAL(36, 0),
    network VARCHAR(20) DEFAULT 'hardhat',
    environment VARCHAR(20) DEFAULT 'hardhat',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tx_hash ON transaction_audit(tx_hash);
CREATE INDEX IF NOT EXISTS idx_tx_from ON transaction_audit(from_address);
CREATE INDEX IF NOT EXISTS idx_tx_to ON transaction_audit(to_address);

CREATE TABLE IF NOT EXISTS redemption_request (
    id SERIAL PRIMARY KEY,
    subscription_id INT NOT NULL REFERENCES subscription(id),
    wallet_address VARCHAR(128) NOT NULL,
    amount DECIMAL(36, 18) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS redemption_signature (
    id SERIAL PRIMARY KEY,
    redemption_id INT NOT NULL REFERENCES redemption_request(id),
    signer_address VARCHAR(128) NOT NULL,
    signature VARCHAR(512) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS redemption_event (
    id SERIAL PRIMARY KEY,
    redemption_id INT NOT NULL REFERENCES redemption_request(id),
    event_type VARCHAR(50) NOT NULL,
    tx_hash VARCHAR(128),
    block_number BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS asset_media (
    id SERIAL PRIMARY KEY,
    asset_id INT NOT NULL REFERENCES asset(id) ON DELETE CASCADE,
    media_type VARCHAR(20) NOT NULL,
    url VARCHAR(500) NOT NULL,
    title VARCHAR(200),
    description TEXT,
    order_index INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS asset_features (
    id SERIAL PRIMARY KEY,
    asset_id INT NOT NULL REFERENCES asset(id) ON DELETE CASCADE,
    feature_key VARCHAR(100) NOT NULL,
    feature_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
