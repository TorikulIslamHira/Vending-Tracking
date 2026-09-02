import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

/**
 * Sanitizes the database connection URL by removing Prisma-specific query parameters
 * such as `?schema=public`, which cause PostgreSQL/postgres.js to throw:
 * "unrecognized configuration parameter schema"
 */
function getCleanConnectionString(rawUrl?: string): string {
  const defaultUrl =
    "postgresql://vending_user:vending_secure_password_2026@localhost:5432/vending_db";
  const urlStr = rawUrl || defaultUrl;

  try {
    const parsed = new URL(urlStr);
    // Delete 'schema' search param if present
    if (parsed.searchParams.has("schema")) {
      parsed.searchParams.delete("schema");
    }
    return parsed.toString();
  } catch {
    // Fallback regex cleaning
    return urlStr.replace(/[?&]schema=[^&]*/g, "").replace(/\?$/, "");
  }
}

const connectionString = getCleanConnectionString(process.env.DATABASE_URL);

// Configure postgres client with connection pooling and clean connection URL
export const queryClient = postgres(connectionString, {
  max: process.env.DB_MAX_CONNECTIONS ? Number(process.env.DB_MAX_CONNECTIONS) : 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(queryClient, { schema });

export type Database = typeof db;
