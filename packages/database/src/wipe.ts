import { sql } from "drizzle-orm";
import { db } from "./client";

async function main() {
  console.log("Wiping database schema...");
  await db.execute(sql`DROP SCHEMA public CASCADE;`);
  await db.execute(sql`CREATE SCHEMA public;`);
  await db.execute(sql`GRANT ALL ON SCHEMA public TO public;`);
  console.log("Database completely wiped.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Wipe error:", err);
  process.exit(1);
});
