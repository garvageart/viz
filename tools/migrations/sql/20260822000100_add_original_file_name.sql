-- +goose Up
ALTER TABLE images ADD COLUMN IF NOT EXISTS original_file_name text;

UPDATE images
SET original_file_name = COALESCE(
    image_metadata->>'original_file_name',
    image_metadata->>'file_name'
)
WHERE original_file_name IS NULL
  AND image_metadata IS NOT NULL
  AND (
      image_metadata->>'original_file_name' IS NOT NULL
      OR image_metadata->>'file_name' IS NOT NULL
  );

-- +goose Down
ALTER TABLE images DROP COLUMN IF EXISTS original_file_name;
