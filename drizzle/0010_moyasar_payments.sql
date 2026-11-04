ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS moyasar_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS moyasar_payment_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS moyasar_payment_status text NOT NULL DEFAULT 'not_started';
