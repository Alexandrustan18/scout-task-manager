-- Adds optimistic-locking version column to app_data.
-- Idempotent: safe to re-run.

ALTER TABLE app_data ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1;
ALTER TABLE app_data ADD COLUMN IF NOT EXISTS updated_by TEXT;
CREATE INDEX IF NOT EXISTS app_data_version_idx ON app_data (id, version);

-- Sanity check: row count should not change
SELECT COUNT(*) AS total_rows FROM app_data;
