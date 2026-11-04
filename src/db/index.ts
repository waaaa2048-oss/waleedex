import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaNextJsSchemaReady?: Promise<void>;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

async function ensureDatabaseSchema() {
  const client = await pool.connect();

  try {
    const migrationSql = `
      CREATE TABLE IF NOT EXISTS stores (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        store_type TEXT NOT NULL DEFAULT 'SLAUGHTERHOUSE',
        status TEXT NOT NULL DEFAULT 'PUBLISHED',
        logo_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS product_modifiers (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'select',
        required BOOLEAN NOT NULL DEFAULT false,
        options JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        store_id INTEGER NOT NULL DEFAULT 1,
        product_id INTEGER,
        customer_id INTEGER,
        rating INTEGER NOT NULL DEFAULT 5,
        comment TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS payment_credentials (
        id INTEGER PRIMARY KEY DEFAULT 1,
        encrypted_credentials TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS auth_attempts (
        key TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0,
        reset_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS payment_methods (
        id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        cod_enabled BOOLEAN NOT NULL DEFAULT false,
        bank_transfer_enabled BOOLEAN NOT NULL DEFAULT true,
        moyasar_enabled BOOLEAN NOT NULL DEFAULT false,
        tabby_enabled BOOLEAN NOT NULL DEFAULT false,
        tamara_enabled BOOLEAN NOT NULL DEFAULT false,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      INSERT INTO payment_methods (id, cod_enabled, bank_transfer_enabled, moyasar_enabled, tabby_enabled, tamara_enabled)
      SELECT
        1,
        COALESCE(bool_or(cod_enabled), false),
        COALESCE(bool_or(bank_transfer_enabled), true),
        COALESCE(bool_or(moyasar_enabled), false),
        COALESCE(bool_or(tabby_enabled), false),
        COALESCE(bool_or(tamara_enabled), false)
      FROM store_settings
      ON CONFLICT (id) DO NOTHING;

      ALTER TABLE integrations ADD COLUMN IF NOT EXISTS store_id INTEGER;
      UPDATE integrations
      SET store_id = (
        SELECT id FROM stores
        ORDER BY CASE WHEN store_type = 'SLAUGHTERHOUSE' THEN 0 ELSE 1 END, created_at, id
        LIMIT 1
      )
      WHERE store_id IS NULL AND EXISTS (SELECT 1 FROM stores);
      ALTER TABLE integrations DROP CONSTRAINT IF EXISTS integrations_key_key;
      ALTER TABLE integrations DROP CONSTRAINT IF EXISTS integrations_key_unique;
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'integrations_store_id_stores_id_fk'
        ) THEN
          ALTER TABLE integrations
            ADD CONSTRAINT integrations_store_id_stores_id_fk
            FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM integrations WHERE store_id IS NULL) THEN
          ALTER TABLE integrations ALTER COLUMN store_id SET NOT NULL;
        END IF;
      END $$;
      CREATE UNIQUE INDEX IF NOT EXISTS integrations_store_id_key_unique_idx ON integrations (store_id, key);

      ALTER TABLE products ADD COLUMN IF NOT EXISTS store_id INTEGER DEFAULT 1;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT;
      UPDATE products SET sku = 'AK-' || LPAD(CAST(id AS TEXT), 4, '0') WHERE sku IS NULL OR sku = '';

      ALTER TABLE categories ADD COLUMN IF NOT EXISTS store_id INTEGER DEFAULT 1;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_id INTEGER DEFAULT 1;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS price TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS image TEXT;
      ALTER TABLE products ALTER COLUMN store_id DROP DEFAULT;
      ALTER TABLE categories ALTER COLUMN store_id DROP DEFAULT;
      ALTER TABLE orders ALTER COLUMN store_id DROP DEFAULT;
      ALTER TABLE reviews ALTER COLUMN store_id DROP DEFAULT;

      CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique_idx
      ON products (sku)
      WHERE sku IS NOT NULL;

      CREATE INDEX IF NOT EXISTS products_store_id_idx ON products (store_id);
      CREATE INDEX IF NOT EXISTS categories_store_id_idx ON categories (store_id);
      CREATE INDEX IF NOT EXISTS orders_store_id_idx ON orders (store_id);
      CREATE INDEX IF NOT EXISTS reviews_store_id_idx ON reviews (store_id);

      ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS store_id INTEGER;
      CREATE SEQUENCE IF NOT EXISTS store_settings_id_seq;
      SELECT setval('store_settings_id_seq', COALESCE((SELECT MAX(id) FROM store_settings), 0) + 1, false);
      ALTER SEQUENCE store_settings_id_seq OWNED BY store_settings.id;
      ALTER TABLE store_settings ALTER COLUMN id SET DEFAULT nextval('store_settings_id_seq');
      UPDATE store_settings
      SET store_id = (SELECT id FROM stores ORDER BY created_at, id LIMIT 1)
      WHERE store_id IS NULL AND EXISTS (SELECT 1 FROM stores);
      ALTER TABLE store_settings ALTER COLUMN store_id SET NOT NULL;
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'store_settings_store_id_stores_id_fk'
        ) THEN
          ALTER TABLE store_settings
            ADD CONSTRAINT store_settings_store_id_stores_id_fk
            FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
        END IF;
      END $$;
      CREATE UNIQUE INDEX IF NOT EXISTS store_settings_store_id_unique_idx ON store_settings (store_id);
      UPDATE store_settings
      SET address = ''
      WHERE address IN (
        'الرياض · حي الملقا',
        'الرياض · حي الملقا · طريق الأمير محمد بن سلمان'
      );

      CREATE TABLE IF NOT EXISTS platform_domain_settings (
        id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        custom_domain TEXT,
        domain_status TEXT NOT NULL DEFAULT 'none',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      INSERT INTO platform_domain_settings (id, custom_domain, domain_status)
      SELECT
        1,
        custom_domain,
        CASE WHEN domain_status IN ('active', 'pending') THEN domain_status ELSE 'pending' END
      FROM store_settings
      WHERE custom_domain IS NOT NULL AND BTRIM(custom_domain) <> ''
      ORDER BY CASE WHEN domain_status = 'active' THEN 0 ELSE 1 END, id
      LIMIT 1
      ON CONFLICT (id) DO NOTHING;

      UPDATE products SET store_id = (SELECT id FROM stores ORDER BY created_at, id LIMIT 1)
      WHERE store_id IS NULL AND EXISTS (SELECT 1 FROM stores);
      UPDATE categories SET store_id = (SELECT id FROM stores ORDER BY created_at, id LIMIT 1)
      WHERE store_id IS NULL AND EXISTS (SELECT 1 FROM stores);
      UPDATE orders SET store_id = (SELECT id FROM stores ORDER BY created_at, id LIMIT 1)
      WHERE store_id IS NULL AND EXISTS (SELECT 1 FROM stores);
      UPDATE reviews SET store_id = (SELECT id FROM stores ORDER BY created_at, id LIMIT 1)
      WHERE store_id IS NULL AND EXISTS (SELECT 1 FROM stores);
    `;

    await client.query(migrationSql);
  } finally {
    client.release();
  }
}

if (!globalForDb.__arenaNextJsSchemaReady) {
  globalForDb.__arenaNextJsSchemaReady = ensureDatabaseSchema().catch((error) => {
    console.error("Database schema sync failed:", error);
    throw error;
  });
}

export async function ensureDatabaseReady() {
  await globalForDb.__arenaNextJsSchemaReady;
}

export const db = drizzle(pool);

void globalForDb.__arenaNextJsSchemaReady;
