CREATE TYPE "public"."EntryType" AS ENUM('STANDARD', 'MANUAL', 'REVERSE');--> statement-breakpoint
CREATE TYPE "public"."MachineStatus" AS ENUM('ONLINE', 'OFFLINE');--> statement-breakpoint
CREATE TYPE "public"."UserRole" AS ENUM('ADMIN', 'FIELD_AGENT');--> statement-breakpoint
CREATE TABLE "cash_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"machineId" text NOT NULL,
	"agentId" text NOT NULL,
	"collectedAmount" numeric(10, 2) NOT NULL,
	"expectedAmount" numeric(10, 2) NOT NULL,
	"discrepancy" numeric(10, 2) NOT NULL,
	"remarks" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"machineId" text NOT NULL,
	"agentId" text NOT NULL,
	"packetId" text,
	"entryType" "EntryType" DEFAULT 'STANDARD' NOT NULL,
	"quantityAdded" integer NOT NULL,
	"remarks" text NOT NULL,
	"reversedLogId" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "machines" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"storeId" text,
	"serialNumber" text NOT NULL,
	"location" text NOT NULL,
	"category" text DEFAULT 'Standard Confectionery',
	"type" text DEFAULT 'Spiral Chute',
	"capacity" integer DEFAULT 100,
	"pricePerPlay" numeric(10, 2) DEFAULT '1.00' NOT NULL,
	"status" "MachineStatus" DEFAULT 'ONLINE' NOT NULL,
	"qrCode" text NOT NULL,
	"virtualCashBalance" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"keyNumber" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "machines_tenantId_serialNumber_key" UNIQUE("tenantId","serialNumber"),
	CONSTRAINT "machines_tenantId_qrCode_key" UNIQUE("tenantId","qrCode")
);
--> statement-breakpoint
CREATE TABLE "packet_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"name" text NOT NULL,
	"brand" text NOT NULL,
	"quantityPerPacket" integer NOT NULL,
	"pricePerItem" numeric(10, 2) NOT NULL,
	"packetCost" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"locationId" text NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'Confectionery & Toys',
	"shopCutPercent" integer DEFAULT 30 NOT NULL,
	"businessCutPercent" integer DEFAULT 70 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"themeConfig" jsonb,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"name" text NOT NULL,
	"role" "UserRole" DEFAULT 'FIELD_AGENT' NOT NULL,
	"email" text NOT NULL,
	"passwordHash" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_tenantId_email_key" UNIQUE("tenantId","email")
);
--> statement-breakpoint
ALTER TABLE "cash_logs" ADD CONSTRAINT "cash_logs_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_logs" ADD CONSTRAINT "cash_logs_machineId_machines_id_fk" FOREIGN KEY ("machineId") REFERENCES "public"."machines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_logs" ADD CONSTRAINT "cash_logs_agentId_users_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_machineId_machines_id_fk" FOREIGN KEY ("machineId") REFERENCES "public"."machines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_agentId_users_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_packetId_packet_configs_id_fk" FOREIGN KEY ("packetId") REFERENCES "public"."packet_configs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_reversedLogId_inventory_logs_id_fk" FOREIGN KEY ("reversedLogId") REFERENCES "public"."inventory_logs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machines" ADD CONSTRAINT "machines_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machines" ADD CONSTRAINT "machines_storeId_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "public"."stores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packet_configs" ADD CONSTRAINT "packet_configs_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_locationId_locations_id_fk" FOREIGN KEY ("locationId") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cash_logs_tenantId_idx" ON "cash_logs" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "cash_logs_machineId_idx" ON "cash_logs" USING btree ("machineId");--> statement-breakpoint
CREATE INDEX "cash_logs_agentId_idx" ON "cash_logs" USING btree ("agentId");--> statement-breakpoint
CREATE INDEX "inventory_logs_tenantId_idx" ON "inventory_logs" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "inventory_logs_machineId_idx" ON "inventory_logs" USING btree ("machineId");--> statement-breakpoint
CREATE INDEX "inventory_logs_agentId_idx" ON "inventory_logs" USING btree ("agentId");--> statement-breakpoint
CREATE INDEX "inventory_logs_reversedLogId_idx" ON "inventory_logs" USING btree ("reversedLogId");--> statement-breakpoint
CREATE INDEX "locations_tenantId_idx" ON "locations" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "machines_tenantId_idx" ON "machines" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "machines_storeId_idx" ON "machines" USING btree ("storeId");--> statement-breakpoint
CREATE INDEX "packet_configs_tenantId_idx" ON "packet_configs" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "stores_tenantId_idx" ON "stores" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "stores_locationId_idx" ON "stores" USING btree ("locationId");--> statement-breakpoint
CREATE INDEX "users_tenantId_idx" ON "users" USING btree ("tenantId");