ALTER TABLE "stores" DROP CONSTRAINT "stores_locationId_locations_id_fk";
--> statement-breakpoint
ALTER TABLE "stores" ALTER COLUMN "locationId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_locationId_locations_id_fk" FOREIGN KEY ("locationId") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;