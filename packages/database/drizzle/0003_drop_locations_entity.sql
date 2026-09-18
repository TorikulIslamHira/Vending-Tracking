ALTER TABLE "locations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "locations" CASCADE;--> statement-breakpoint
ALTER TABLE "stores" DROP CONSTRAINT "stores_locationId_locations_id_fk";
--> statement-breakpoint
DROP INDEX "stores_locationId_idx";--> statement-breakpoint
ALTER TABLE "stores" DROP COLUMN "locationId";