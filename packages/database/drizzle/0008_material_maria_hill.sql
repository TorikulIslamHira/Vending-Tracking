ALTER TYPE "public"."UserRole" ADD VALUE 'PRESENTATION';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "dataModifierPercentage" numeric(6, 2) DEFAULT '0';