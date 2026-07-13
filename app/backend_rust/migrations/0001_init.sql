-- SQLite schema migration for SuperCrypto Rust backend

CREATE TABLE IF NOT EXISTS account (
id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    address VARCHAR(128) NOT NULL,
    private_key VARCHAR(256) NOT NULL,
roles TEXT NOT NULL DEFAULT '[]',
network VARCHAR(20) DEFAULT 'hardhat',
    last_login_dt TIMESTAMP,
    encrypted_private_key VARCHAR(512),
balance TEXT NOT NULL DEFAULT '0',
is_active INTEGER NOT NULL DEFAULT 1,
is_blocked INTEGER NOT NULL DEFAULT 0,
    blocked_at TIMESTAMP,
    blocked_by VARCHAR(128),
    blocked_reason TEXT,
is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(128),
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(address, network)
);

CREATE INDEX IF NOT EXISTS idx_account_address ON account(address);
CREATE INDEX IF NOT EXISTS idx_account_network ON account(network);
CREATE INDEX IF NOT EXISTS idx_account_roles ON account(roles);

CREATE TABLE IF NOT EXISTS asset (
id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(200) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    description TEXT,
asset_type VARCHAR(20) NOT NULL DEFAULT 'real_estate',
    image_url VARCHAR(500),
    document_url VARCHAR(500),
    location VARCHAR(300),
current_price TEXT NOT NULL DEFAULT '0',
    price_updated_at TIMESTAMP,
total_supply TEXT NOT NULL DEFAULT '0',
subscribed_amount TEXT NOT NULL DEFAULT '0',
min_subscription TEXT NOT NULL DEFAULT '100',
    subscription_start_at TIMESTAMP,
    subscription_end_at TIMESTAMP,
apy_3m TEXT NOT NULL DEFAULT '0',
apy_6m TEXT NOT NULL DEFAULT '0',
apy_12m TEXT NOT NULL DEFAULT '0',
subscription_mode VARCHAR(10) NOT NULL DEFAULT 'both',
    project VARCHAR(50),
    contract_address VARCHAR(128),
    frame_style VARCHAR(20),
status VARCHAR(20) NOT NULL DEFAULT 'active',
environment VARCHAR(20) NOT NULL DEFAULT 'hardhat',
    created_by INTEGER,
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_asset_status ON asset(status);
CREATE INDEX IF NOT EXISTS idx_asset_type ON asset(asset_type);
CREATE INDEX IF NOT EXISTS idx_asset_env ON asset(environment);
CREATE INDEX IF NOT EXISTS idx_asset_created ON asset(created_at);

CREATE TABLE IF NOT EXISTS asset_contract_binding (
id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL REFERENCES asset(id) ON DELETE CASCADE,
    contract_name VARCHAR(100) NOT NULL,
    contract_address VARCHAR(128) NOT NULL,
contract_type VARCHAR(20) NOT NULL DEFAULT 'project',
is_primary INTEGER NOT NULL DEFAULT 0,
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(asset_id, contract_name)
);

CREATE INDEX IF NOT EXISTS idx_acb_address ON asset_contract_binding(contract_address);
CREATE INDEX IF NOT EXISTS idx_acb_type ON asset_contract_binding(contract_type);

CREATE TABLE IF NOT EXISTS asset_price_history (
id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER REFERENCES asset(id) ON DELETE SET NULL,
    price TEXT NOT NULL,
    source VARCHAR(100),
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_aph_asset_created ON asset_price_history(asset_id, created_at);

CREATE TABLE IF NOT EXISTS subscription (
id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    wallet_address VARCHAR(128) NOT NULL,
    asset_id INTEGER NOT NULL REFERENCES asset(id) ON DELETE RESTRICT,
    amount TEXT NOT NULL,
    token_type VARCHAR(10) NOT NULL DEFAULT 'USDT',
    lock_period INTEGER NOT NULL,
    apy TEXT NOT NULL,
    rwa_token_amount TEXT NOT NULL DEFAULT '0',
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    original_end_date TIMESTAMP,
    redeemed_at TIMESTAMP,
    expected_interest TEXT NOT NULL DEFAULT '0',
    actual_interest TEXT NOT NULL DEFAULT '0',
    tx_hash VARCHAR(128),
    redeem_tx_hash VARCHAR(128),
status VARCHAR(20) NOT NULL DEFAULT 'pending',
environment VARCHAR(20) NOT NULL DEFAULT 'hardhat',
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tx_hash, environment)
);

CREATE INDEX IF NOT EXISTS idx_sub_wallet_env ON subscription(wallet_address, environment);
CREATE INDEX IF NOT EXISTS idx_sub_asset_env ON subscription(asset_id, environment);
CREATE INDEX IF NOT EXISTS idx_sub_status ON subscription(status);
CREATE INDEX IF NOT EXISTS idx_sub_end ON subscription(end_date);

CREATE TABLE IF NOT EXISTS staking_record (
id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    wallet_address VARCHAR(128) NOT NULL,
    subscription_id INTEGER REFERENCES subscription(id) ON DELETE SET NULL,
    amount TEXT NOT NULL,
    period INTEGER NOT NULL,
    multiplier TEXT NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    expected_rewards TEXT NOT NULL DEFAULT '0',
    claimed_rewards TEXT NOT NULL DEFAULT '0',
status VARCHAR(20) NOT NULL DEFAULT 'active',
    stake_tx_hash VARCHAR(128),
    unstake_tx_hash VARCHAR(128),
environment VARCHAR(32) NOT NULL DEFAULT 'hardhat',
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staking_wallet ON staking_record(wallet_address);
CREATE INDEX IF NOT EXISTS idx_staking_env ON staking_record(environment);
CREATE INDEX IF NOT EXISTS idx_staking_status ON staking_record(status);

CREATE TABLE IF NOT EXISTS staking_limit (
id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    base_limit TEXT NOT NULL,
    carried_limit TEXT NOT NULL DEFAULT '0',
    used_limit TEXT NOT NULL DEFAULT '0',
environment VARCHAR(32) NOT NULL DEFAULT 'hardhat',
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, environment)
);

CREATE TABLE IF NOT EXISTS reward_claim (
id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    wallet_address VARCHAR(128) NOT NULL,
    staking_record_id INTEGER NOT NULL REFERENCES staking_record(id) ON DELETE CASCADE,
    amount TEXT NOT NULL,
    tx_hash VARCHAR(128),
environment VARCHAR(32) NOT NULL DEFAULT 'hardhat',
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS account_kyc (
id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    address VARCHAR(42),
network VARCHAR(20) DEFAULT 'hardhat',
    status VARCHAR(20) DEFAULT 'not_started',
    submitted_at TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewer_address VARCHAR(42),
    reject_reason TEXT,
    external_kyc_id VARCHAR(100),
    country_code VARCHAR(2),
    is_accredited INTEGER DEFAULT 0,
    full_name VARCHAR(100),
    date_of_birth TEXT,
    selfie_url VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    residence_country VARCHAR(2),
    liveness_verified INTEGER DEFAULT 0,
    face_image_url VARCHAR(255),
    liveness_video_url VARCHAR(255),
    on_chain_sync_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    on_chain_tx_hash VARCHAR(66),
    on_chain_synced_at TIMESTAMP,
    on_chain_error TEXT,
    risk_level VARCHAR(20) DEFAULT 'low',
    risk_score INTEGER DEFAULT 0,
    priority VARCHAR(20) DEFAULT 'normal',
    review_progress TEXT,
    is_pep INTEGER DEFAULT 0,
    is_sanctioned INTEGER DEFAULT 0,
    source_ip VARCHAR(45),
    device_fingerprint VARCHAR(64),
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(address, network)
);

CREATE INDEX IF NOT EXISTS idx_kyc_status ON account_kyc(status);

CREATE TABLE IF NOT EXISTS account_kyc_document (
id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    kyc_id INTEGER NOT NULL REFERENCES account_kyc(id) ON DELETE CASCADE,
    id_type VARCHAR(20) NOT NULL,
    id_number_hash VARCHAR(64),
    id_number_last4 VARCHAR(4),
    document_expiry TEXT,
    id_front_url VARCHAR(255),
    id_back_url VARCHAR(255),
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(kyc_id, id_type)
);

CREATE TABLE IF NOT EXISTS audit_log (
id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    action VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id INTEGER,
    actor_address VARCHAR(128),
    actor_role VARCHAR(50),
    details TEXT,
status VARCHAR(20) NOT NULL DEFAULT 'success',
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_category ON audit_log(category);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

CREATE TABLE IF NOT EXISTS contract_deployment (
id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(128) NOT NULL,
    deployer_address VARCHAR(128) NOT NULL,
    network VARCHAR(20) NOT NULL,
    chain_id INTEGER NOT NULL,
    scope VARCHAR(20) NOT NULL,
    contract_type VARCHAR(20) NOT NULL,
    project_name VARCHAR(100) NOT NULL,
    tx_hash VARCHAR(128) NOT NULL,
status VARCHAR(20) NOT NULL DEFAULT 'active',
    abi_path VARCHAR(255),
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cd_name ON contract_deployment(name);
CREATE INDEX IF NOT EXISTS idx_cd_network ON contract_deployment(network);
CREATE INDEX IF NOT EXISTS idx_cd_project ON contract_deployment(project_name);

CREATE TABLE IF NOT EXISTS contract_config (
id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    contract_name VARCHAR(100) NOT NULL UNIQUE,
    project_name VARCHAR(100) DEFAULT 'common',
    provider_key VARCHAR(50),
    provider_key_hash VARCHAR(66),
    dependencies TEXT,
    contract_type VARCHAR(20) NOT NULL,
    scope VARCHAR(20) NOT NULL,
    description TEXT,
    dependency_type VARCHAR(20) DEFAULT 'business',
    is_primary INTEGER DEFAULT 0,
    deploy_order INTEGER,
    required_deps TEXT,
    optional_deps TEXT,
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS provider_registry (
id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    provider_address VARCHAR(128) NOT NULL,
    chain_id INTEGER NOT NULL,
    network VARCHAR(20) NOT NULL,
    key VARCHAR(50) NOT NULL,
    key_hash VARCHAR(66) NOT NULL,
is_registered INTEGER NOT NULL DEFAULT 0,
registered_address VARCHAR(128) NOT NULL DEFAULT '0x0000000000000000000000000000000000000000',
is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(128),
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chain (
id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    network VARCHAR(20) NOT NULL,
    chain_id INTEGER NOT NULL,
    rpc_url VARCHAR(500) NOT NULL,
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transaction_audit (
id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    tx_hash VARCHAR(128) NOT NULL,
    from_address VARCHAR(128),
    to_address VARCHAR(128),
    amount TEXT,
    token_type VARCHAR(10),
status VARCHAR(20) NOT NULL DEFAULT 'pending',
    tx_type VARCHAR(50),
    block_number INTEGER,
    gas_used TEXT,
    gas_price TEXT,
network VARCHAR(20) DEFAULT 'hardhat',
environment VARCHAR(20) NOT NULL DEFAULT 'hardhat',
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tx_hash ON transaction_audit(tx_hash);
CREATE INDEX IF NOT EXISTS idx_tx_from ON transaction_audit(from_address);
CREATE INDEX IF NOT EXISTS idx_tx_to ON transaction_audit(to_address);

CREATE TABLE IF NOT EXISTS redemption_request (
id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    subscription_id INTEGER NOT NULL REFERENCES subscription(id),
    wallet_address VARCHAR(128) NOT NULL,
    amount TEXT NOT NULL,
status VARCHAR(20) NOT NULL DEFAULT 'pending',
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS redemption_signature (
id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    redemption_id INTEGER NOT NULL REFERENCES redemption_request(id),
    signer_address VARCHAR(128) NOT NULL,
    signature VARCHAR(512) NOT NULL,
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS redemption_event (
id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    redemption_id INTEGER NOT NULL REFERENCES redemption_request(id),
    event_type VARCHAR(50) NOT NULL,
    tx_hash VARCHAR(128),
    block_number INTEGER,
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS asset_media (
id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL REFERENCES asset(id) ON DELETE CASCADE,
    media_type VARCHAR(20) NOT NULL,
    url VARCHAR(500) NOT NULL,
    title VARCHAR(200),
    description TEXT,
    order_index INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS asset_features (
id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL REFERENCES asset(id) ON DELETE CASCADE,
    feature_key VARCHAR(100) NOT NULL,
    feature_value TEXT,
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 替代 MinIO 的本地文件存储表：文件内容存于 data/files/，数据库保存元数据
CREATE TABLE IF NOT EXISTS media_files (
id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    owner_address VARCHAR(128) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    file_size INTEGER DEFAULT 0,
    mime_type VARCHAR(100),
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_media_owner ON media_files(owner_address);
