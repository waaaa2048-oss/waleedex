CREATE TABLE IF NOT EXISTS payment_credentials (
  id integer PRIMARY KEY DEFAULT 1,
  encrypted_credentials text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
