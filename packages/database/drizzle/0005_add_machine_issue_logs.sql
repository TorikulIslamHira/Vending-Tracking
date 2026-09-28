CREATE TYPE "public"."IssueStatus" AS ENUM('OPEN', 'RESOLVED');--> statement-breakpoint
CREATE TABLE "machine_issue_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"machineId" text NOT NULL,
	"reportedByAgentId" text NOT NULL,
	"reason" text NOT NULL,
	"issuePhotoUrl" text,
	"cashLogId" text,
	"status" "IssueStatus" DEFAULT 'OPEN' NOT NULL,
	"resolvedByAgentId" text,
	"resolvedNote" text,
	"repairPhotoUrl" text,
	"resolvedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "machine_issue_logs" ADD CONSTRAINT "machine_issue_logs_tenantId_tenants_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_issue_logs" ADD CONSTRAINT "machine_issue_logs_machineId_machines_id_fk" FOREIGN KEY ("machineId") REFERENCES "public"."machines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_issue_logs" ADD CONSTRAINT "machine_issue_logs_reportedByAgentId_users_id_fk" FOREIGN KEY ("reportedByAgentId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_issue_logs" ADD CONSTRAINT "machine_issue_logs_cashLogId_cash_logs_id_fk" FOREIGN KEY ("cashLogId") REFERENCES "public"."cash_logs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_issue_logs" ADD CONSTRAINT "machine_issue_logs_resolvedByAgentId_users_id_fk" FOREIGN KEY ("resolvedByAgentId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "machine_issue_logs_tenantId_idx" ON "machine_issue_logs" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "machine_issue_logs_machineId_idx" ON "machine_issue_logs" USING btree ("machineId");--> statement-breakpoint
CREATE INDEX "machine_issue_logs_status_idx" ON "machine_issue_logs" USING btree ("status");