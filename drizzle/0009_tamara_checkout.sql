ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tamara_order_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS tamara_payment_status text NOT NULL DEFAULT 'not_started';
