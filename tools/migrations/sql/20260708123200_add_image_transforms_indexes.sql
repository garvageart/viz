-- +goose Up
CREATE INDEX IF NOT EXISTS idx_image_transforms_image_uid ON image_transforms (image_uid);
CREATE INDEX IF NOT EXISTS idx_image_transforms_is_permanent ON image_transforms (is_permanent);
CREATE INDEX IF NOT EXISTS idx_image_transforms_last_accessed_at ON image_transforms (last_accessed_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_image_transforms_cache_key ON image_transforms (cache_key);

-- +goose Down
DROP INDEX IF EXISTS idx_image_transforms_image_uid;
DROP INDEX IF EXISTS idx_image_transforms_is_permanent;
DROP INDEX IF EXISTS idx_image_transforms_last_accessed_at;
DROP INDEX IF EXISTS idx_image_transforms_cache_key;
