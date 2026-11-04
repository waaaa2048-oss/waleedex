CREATE TABLE IF NOT EXISTS "shipping_carriers" (
  "id" serial PRIMARY KEY NOT NULL,
  "key" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "api_base_url" text,
  "credentials_ciphertext" text,
  "is_enabled" boolean DEFAULT false NOT NULL,
  "show_at_checkout" boolean DEFAULT false NOT NULL,
  "billing_mode" text DEFAULT 'carrier_account' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "shipments" (
  "id" serial PRIMARY KEY NOT NULL,
  "order_id" integer NOT NULL REFERENCES "orders"("id") ON DELETE RESTRICT,
  "carrier_id" integer REFERENCES "shipping_carriers"("id") ON DELETE SET NULL,
  "external_shipment_id" text,
  "tracking_number" text,
  "tracking_url" text,
  "label_url" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "cancellation_status" text DEFAULT 'not_requested' NOT NULL,
  "shipping_cost" numeric(10, 2),
  "billing_reference" text,
  "notes" text DEFAULT '' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "shipments_order_id_idx" ON "shipments" USING btree ("order_id");
CREATE INDEX IF NOT EXISTS "shipments_carrier_id_idx" ON "shipments" USING btree ("carrier_id");
CREATE INDEX IF NOT EXISTS "shipments_status_idx" ON "shipments" USING btree ("status");
CREATE INDEX IF NOT EXISTS "shipments_created_at_idx" ON "shipments" USING btree ("created_at");

INSERT INTO "shipping_carriers" ("key", "name") VALUES
  ('aramex', 'أرامكس'),
  ('smsa', 'سمسا'),
  ('redbox', 'ريد بوكس'),
  ('dhl', 'DHL'),
  ('imile', 'iMile'),
  ('custom', 'شركة شحن خاصة')
ON CONFLICT ("key") DO NOTHING;
