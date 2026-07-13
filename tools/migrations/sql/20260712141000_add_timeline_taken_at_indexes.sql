-- +goose Up
CREATE INDEX IF NOT EXISTS idx_images_taken_at_day ON images (date_trunc('day', taken_at AT TIME ZONE 'UTC'));
CREATE INDEX IF NOT EXISTS idx_images_taken_at_month ON images (date_trunc('month', taken_at AT TIME ZONE 'UTC'));
CREATE INDEX IF NOT EXISTS idx_images_taken_at_year ON images (date_trunc('year', taken_at AT TIME ZONE 'UTC'));

-- +goose Down
DROP INDEX IF EXISTS idx_images_taken_at_day;
DROP INDEX IF EXISTS idx_images_taken_at_month;
DROP INDEX IF EXISTS idx_images_taken_at_year;
