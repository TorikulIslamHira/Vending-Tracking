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
1. **Tenant (Company)**: `id`, `name`, `currency`, `themeConfig`, `isActive`, `createdAt`, `updatedAt`
2. **User / Agent**: `id`, `tenantId`, `name`, `role` (`ADMIN`, `FIELD_AGENT`), `email`, `passwordHash`, **`isActive`** (default `true`), `createdAt`, `updatedAt`
3. **Machine**: `id`, `tenantId`, `storeId`, `serialNumber`, `location`, `status` (`ONLINE`, `OFFLINE`), `qrCode`, `pricePerPlay`, `capacity`, `keyNumber`, `virtualCashBalance` (stored column — see the Virtual Cash Balance note below, it is **not** the source of truth for reads)
4. **PacketConfig**: `id`, `tenantId`, `name`, `brand`, `quantityPerPacket`, `pricePerItem`, `packetCost` (Agents cannot change `quantityPerPacket`)
5. **InventoryLog**: `id`, `tenantId`, `machineId`, `agentId`, `packetId`, `entryType` (`STANDARD`, `MANUAL`, `REVERSE`), `quantityAdded`, `remarks`, **`reversedLogId`** (nullable, self-referencing FK to `inventory_logs.id`), `createdAt`
6. **CashLog**: `id`, `tenantId`, `machineId`, `agentId`, `collectedAmount`, `expectedAmount`, `discrepancy`, `remarks`, `createdAt`

## Recent Additions (2026-09-06/07 hardening pass)
- **`users.isActive`** — backs real account deactivation. `apps/api/src/core/middlewares/tenantHandler.ts` re-checks this on **every** authenticated request (not just at login), so a deactivated user's already-issued JWT stops working immediately instead of waiting out its 7-day expiry. `PATCH /api/v1/users/:id/status` (ADMIN-only) toggles it.
- **`inventory_logs.reversedLogId`** — set on a `REVERSE` entry to point at the original log it reverses. Enforces two invariants in `reverseEntryHandler` (`apps/api/src/modules/inventory/inventory.controller.ts`): a given log can only ever be reversed once, and only the single most-recent `STANDARD`/`MANUAL` (positive-quantity) entry for a machine is eligible for reversal at all. See [[inventory-flow.md]] for the full rule set.
- **`machines.virtualCashBalance`** is a legacy stored column, still present in the schema but no longer authoritative — see the Virtual Cash Balance section of [[inventory-flow.md]].
