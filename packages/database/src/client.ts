import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

/**
 * Sanitizes the database connection URL by removing unsupported query parameters
 * such as `?schema=public` or `&connection_limit=...`, which cause PostgreSQL/postgres.js to throw:
 * "unrecognized configuration parameter schema"
 */
function getCleanConnectionString(rawUrl?: string): string {
  const defaultUrl =
    "postgresql://vending_user:vending_secure_password_2026@localhost:5432/vending_db";
  const urlStr = (rawUrl || defaultUrl).trim();

  try {
    const parsed = new URL(urlStr);
    // Delete unsupported query parameters that are not native to PostgreSQL
    const unsupportedParams = ["schema", "connection_limit", "pool_timeout"];
    for (const param of unsupportedParams) {
      parsed.searchParams.delete(param);
    }
    return parsed.toString();
  } catch {
    // Fallback regex cleaning
    return urlStr
      .replace(/[?&]schema=[^&]*/gi, "")
      .replace(/[?&]connection_limit=[^&]*/gi, "")
      .replace(/[?&]pool_timeout=[^&]*/gi, "")
      .replace(/\?$/, "");
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
