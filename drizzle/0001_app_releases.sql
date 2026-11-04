CREATE TABLE IF NOT EXISTS "app_releases" (
  "id" serial PRIMARY KEY NOT NULL,
  "release_group" text NOT NULL,
  "platform" text NOT NULL,
  "version" text NOT NULL,
  "notes" text DEFAULT '' NOT NULL,
  "artifact_url" text,
  "status" text DEFAULT 'draft' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "app_releases_group_idx" ON "app_releases" USING btree ("release_group");
CREATE INDEX IF NOT EXISTS "app_releases_created_at_idx" ON "app_releases" USING btree ("created_at");
