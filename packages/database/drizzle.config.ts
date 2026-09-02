import { defineConfig } from "drizzle-kit";
import "dotenv/config";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://vending_user:vending_secure_password_2026@localhost:5432/vending_db",
  },
  verbose: true,
  strict: true,
});
