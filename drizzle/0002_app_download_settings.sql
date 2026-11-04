ALTER TABLE "store_settings"
ADD COLUMN IF NOT EXISTS "app_download_settings" jsonb NOT NULL DEFAULT '{}'::jsonb;
