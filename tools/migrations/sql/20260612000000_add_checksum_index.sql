-- +goose Up
CREATE INDEX IF NOT EXISTS idx_images_metadata_checksum ON images ((image_metadata->>'checksum'));

-- +goose Down
DROP INDEX IF EXISTS idx_images_metadata_checksum;
