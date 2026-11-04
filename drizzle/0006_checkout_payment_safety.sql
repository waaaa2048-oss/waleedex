UPDATE store_settings
SET cod_enabled = false,
    apple_pay_enabled = false,
    mada_enabled = false,
    tamara_enabled = false
WHERE id = 1;
