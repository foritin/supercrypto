-- 0003_align_py_schema.sql
-- Align chain, asset_media, asset_features tables to match Python backend schema
-- Python backend is the reference implementation; Rust aligns to it

-- ============================================================
-- chain: add 11 columns to match Python Chain model
-- ============================================================
ALTER TABLE chain ADD COLUMN display_name VARCHAR(128) NOT NULL DEFAULT '';
ALTER TABLE chain ADD COLUMN symbol VARCHAR(16) NOT NULL DEFAULT 'ETH';
ALTER TABLE chain ADD COLUMN decimals INTEGER NOT NULL DEFAULT 18;
ALTER TABLE chain ADD COLUMN rpc_url_backup VARCHAR(512);
ALTER TABLE chain ADD COLUMN block_explorer VARCHAR(256);
ALTER TABLE chain ADD COLUMN environment VARCHAR(20) NOT NULL DEFAULT 'development';
ALTER TABLE chain ADD COLUMN is_testnet INTEGER NOT NULL DEFAULT 0;
ALTER TABLE chain ADD COLUMN is_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE chain ADD COLUMN icon VARCHAR(64);
ALTER TABLE chain ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE chain ADD COLUMN metadata TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_chain_chain_id ON chain(chain_id);
CREATE INDEX IF NOT EXISTS idx_chain_environment ON chain(environment);
CREATE INDEX IF NOT EXISTS idx_chain_is_enabled ON chain(is_enabled);

-- ============================================================
-- asset_media: rename columns + add 4 columns to match Python
-- ============================================================
ALTER TABLE asset_media RENAME COLUMN order_index TO sort_order;
ALTER TABLE asset_media RENAME COLUMN is_active TO is_primary;

ALTER TABLE asset_media ADD COLUMN thumbnail_url VARCHAR(1000);
ALTER TABLE asset_media ADD COLUMN file_name VARCHAR(255);
ALTER TABLE asset_media ADD COLUMN file_size INTEGER;
ALTER TABLE asset_media ADD COLUMN mime_type VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_asset_media_type ON asset_media(asset_id, media_type);
CREATE INDEX IF NOT EXISTS idx_asset_media_sort ON asset_media(asset_id, sort_order);

-- ============================================================
-- asset_features: drop EAV table, recreate as fixed-schema OneToOne
-- (Python uses fixed columns, not key-value pairs)
-- ============================================================
DROP TABLE IF EXISTS asset_features;

CREATE TABLE asset_features (
    id              INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    asset_id        INTEGER NOT NULL UNIQUE REFERENCES asset(id) ON DELETE CASCADE,
    bedrooms        INTEGER,
    bathrooms       VARCHAR(20),
    sqft            INTEGER,
    sqm             INTEGER,
    lot_size        INTEGER,
    year_built      INTEGER,
    year_renovated  INTEGER,
    property_type   VARCHAR(50),
    stories         INTEGER,
    rental_status   VARCHAR(20),
    monthly_rent    VARCHAR(30),
    lease_end_date  VARCHAR(20),
    amenities       TEXT,
    neighborhood    TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
