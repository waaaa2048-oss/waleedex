import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// نفس ترتيب Next.js: .env.local أولاً ثم .env
config({ path: ".env.local" });
config();

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL غير مضبوط. ضعه في .env.local ولا تكتبه داخل الملف أبداً.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: { url },
});
