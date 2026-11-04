ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tabby_payment_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS tabby_payment_status text NOT NULL DEFAULT 'not_started';

UPDATE store_settings
SET cod_enabled = false,
    apple_pay_enabled = false,
    mada_enabled = false,
    tabby_enabled = false,
    tamara_enabled = false
WHERE id = 1;

UPDATE integrations
SET is_enabled = false,
    notes = CASE key
      WHEN 'tabby' THEN 'يحتاج مفاتيح API وحساب تاجر معتمد.'
      ELSE 'غير مفعّل؛ لم يكتمل الربط بعد.'
    END
WHERE key IN ('tabby', 'tamara', 'mada');
