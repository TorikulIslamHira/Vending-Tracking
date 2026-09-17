CREATE TYPE "public"."PaymentMode" AS ENUM('CASH', 'BANK');--> statement-breakpoint
CREATE TYPE "public"."ShopPaymentStatus" AS ENUM('PAID', 'PENDING');--> statement-breakpoint
CREATE TABLE "admin_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"action" text NOT NULL,
	"actorId" text NOT NULL,
	"targetId" text,
	"details" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cash_logs" ADD COLUMN "stockCleared" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cash_logs" ADD COLUMN "isPartial" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cash_logs" ADD COLUMN "shopPaymentStatus" "ShopPaymentStatus";--> statement-breakpoint
ALTER TABLE "cash_logs" ADD COLUMN "expectedPaymentDate" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "machines" ADD COLUMN "attentionNeeded" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "machines" ADD COLUMN "attentionReason" text;--> statement-breakpoint
ALTER TABLE "machines" ADD COLUMN "deletedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "eircode" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "paymentMode" "PaymentMode" DEFAULT 'CASH' NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "qrCode" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "canDeleteMachines" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actorId_users_id_fk" FOREIGN KEY ("actorId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_logs_tenantId_idx" ON "admin_audit_logs" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_actorId_idx" ON "admin_audit_logs" USING btree ("actorId");--> statement-breakpoint
CREATE INDEX "stores_tenantId_qrCode_idx" ON "stores" USING btree ("tenantId","qrCode");