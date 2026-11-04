ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS product_animal_types jsonb NOT NULL
  DEFAULT '["عام","خروف","تيس","لحم مفروم","حاشي"]'::jsonb;

CREATE TABLE IF NOT EXISTS product_inventory_movements (
  id serial PRIMARY KEY,
  product_id integer REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  previous_stock integer NOT NULL,
  new_stock integer NOT NULL,
  reason text NOT NULL DEFAULT 'تعديل يدوي',
  actor_name text NOT NULL DEFAULT 'النظام',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_inventory_movements_created_at_idx
  ON product_inventory_movements (created_at DESC);
