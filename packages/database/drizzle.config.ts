import { defineConfig } from "drizzle-kit";
import "dotenv/config";

const rawUrl =
  process.env.DATABASE_URL ||
  "postgresql://vending_user:vending_secure_password_2026@localhost:5432/vending_db";
const cleanUrl = rawUrl.replace(/[?&]schema=[^&]*/g, "").replace(/\?$/, "");

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: cleanUrl,
  },
  verbose: true,
  strict: true,
});
