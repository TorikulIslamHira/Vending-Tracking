---
id: arch-db-schema-01
type: architecture
dependencies: ["[[multi-tenant-saas.md]]", "[[inventory-flow.md]]"]
impacts: ["@packages/database", "apps/api/modules"]
---

# 🗄️ Database Schema Architecture (Drizzle ORM)

> **AI Directive:** All database models MUST include a `tenantId` to support the Multi-Tenant SaaS architecture.

> **Migration note:** This project was migrated off Prisma onto **Drizzle ORM** (`drizzle-orm` + `postgres-js`, schema defined in `packages/database/src/schema.ts`). There is no `schema.prisma` and no `@prisma/client` runtime dependency anymore — `apps/api/src/core/prisma.ts` is a thin `export { db as prisma }` compatibility shim over the Drizzle client, kept only so any stray legacy import doesn't break; it does not wrap a separate ORM. Local schema changes are applied with `pnpm --filter @vending/database run db:push`; `db:generate` produces a versioned SQL snapshot under `packages/database/drizzle/` (first generated 2026-09-06, capturing the full schema as of that date — the project had only ever used `db:push` before that).

## Core Entities

This list is derived directly from `packages/database/src/schema.ts` — treat that file as the
source of truth; if this list and the schema ever disagree, the schema wins.

1. **Tenant** (`tenants`): `id`, `name`, `currency` (default `EUR`), `themeConfig`, `isActive`, `createdAt`, `updatedAt`
2. **User** (`users`): `id`, `tenantId`, `name`, `role` (`ADMIN`, `FIELD_AGENT`, `PRESENTATION`), `email`, `passwordHash`, `isActive` (default `true`), `canDeleteMachines` (default `false` — delegated soft-delete permission; the root Super Admin, identified by `SUPER_ADMIN_EMAIL`, always has this power regardless of the stored value), `dataModifierPercentage` (only meaningful for `PRESENTATION` — a +/- skew applied to financial figures at API *response* time, never touching stored values), `createdAt`, `updatedAt`. Unique on (`tenantId`, `email`).
3. **Store** (`stores`): `id`, `tenantId`, `name`, `category`, `shopCutPercent` (default `30`), `businessCutPercent` (default `70`), `eircode`, `locationAddress` (flat free-text address — replaced a separate relational `locations` table entirely), `paymentMode` (`CASH`, `BANK`), `qrCode`, `ownerName`/`ownerPhone`/`ownerEmail` (CRM-lite, all nullable), `createdAt`, `updatedAt`.
4. **Machine** (`machines`): `id`, `tenantId`, `storeId` (nullable, `set null` on store delete), `serialNumber`, `location`, `category`, `type`, `capacity`, `pricePerPlay`, `status` (`ONLINE`, `OFFLINE`), `qrCode`, `virtualCashBalance` (stored column — see the Virtual Cash Balance note below, it is **not** the source of truth for reads), `keyNumber`, `attentionNeeded`/`attentionReason` (independent of `status` — a machine can be `ONLINE` and still flagged), `deletedAt` (soft delete — every active-fleet query must filter `isNull(deletedAt)`; historical log/report views intentionally do not), `createdAt`, `updatedAt`. Unique on (`tenantId`, `serialNumber`) and (`tenantId`, `qrCode`).
5. **PacketConfig** (`packet_configs`): `id`, `tenantId`, `name`, `brand`, `quantityPerPacket`, `pricePerItem`, `packetCost` (Agents cannot change `quantityPerPacket`), `createdAt`, `updatedAt`.
6. **InventoryLog** (`inventory_logs`): `id`, `tenantId`, `machineId`, `agentId`, `packetId` (nullable), `entryType` (`STANDARD`, `MANUAL`, `REVERSE`), `quantityAdded`, `remarks`, **`reversedLogId`** (nullable, self-referencing FK to `inventory_logs.id`), `createdAt`.
7. **CashLog** (`cash_logs`): `id`, `tenantId`, `machineId`, `agentId`, `collectedAmount`, `expectedAmount`, `discrepancy` (signed: `expectedAmount - collectedAmount`), `remarks`, `stockCleared` ("Force Reconcile" acknowledgement), `isPartial` (intentional partial collection, not a discrepancy), `shopPaymentStatus` (`PAID`, `PENDING`), `expectedPaymentDate`, `createdAt`.
8. **MachineIssueLog** (`machine_issue_logs`): `id`, `tenantId`, `machineId`, `reportedByAgentId`, `reason`, `issuePhotoUrl`, `cashLogId` (nullable — the collection it was reported alongside, if any), `status` (`OPEN`, `RESOLVED`), `resolvedByAgentId`, `resolvedNote`, `repairPhotoUrl`, `resolvedAt`, `createdAt`. The full report→resolution lifecycle record; distinct from `machines.attentionNeeded`/`attentionReason`, which only ever holds the machine's *current* flag state.
9. **AdminAuditLog** (`admin_audit_logs`): `id`, `tenantId`, `action`, `actorId`, `targetId`, `details` (jsonb), `createdAt`. Records sensitive admin actions (currently: machine deletion); visible only to the root Super Admin.

## Recent Additions (2026-09-06/07 hardening pass)
- **`users.isActive`** — backs real account deactivation. `apps/api/src/core/middlewares/tenantHandler.ts` re-checks this on **every** authenticated request (not just at login), so a deactivated user's already-issued JWT stops working immediately instead of waiting out its 7-day expiry. `PATCH /api/v1/users/:id/status` (ADMIN-only) toggles it.
- **`inventory_logs.reversedLogId`** — set on a `REVERSE` entry to point at the original log it reverses. Enforces two invariants in `reverseEntryHandler` (`apps/api/src/modules/inventory/inventory.controller.ts`): a given log can only ever be reversed once, and only the single most-recent `STANDARD`/`MANUAL` (positive-quantity) entry for a machine is eligible for reversal at all. See [[inventory-flow.md]] for the full rule set.
- **`machines.virtualCashBalance`** is a legacy stored column, still present in the schema but no longer authoritative — see the Virtual Cash Balance section of [[inventory-flow.md]].
