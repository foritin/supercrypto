-- 0005_asset_media_media_id.sql
-- Add media_id column to asset_media to link gallery entries with media_files

ALTER TABLE asset_media ADD COLUMN media_id INTEGER REFERENCES media_files(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_asset_media_media_id ON asset_media(media_id);
