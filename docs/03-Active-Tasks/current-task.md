---
title: Current Task
task: "Phase 5: Production-Readiness Hardening — Security, RBAC, Virtual Cash Balance Unification & Tooling."
status: completed
dependencies:
  - "[[00-System-Architecture-MoC.md]]"
  - "[[database-schema.md]]"
  - "[[inventory-flow.md]]"
  - "[[multi-tenant-saas.md]]"
  - "[[2026-09-07-logs.md]]"
impacts:
  - "[[apps/web]]"
  - "[[apps/api]]"
  - "[[packages/database]]"
tags:
  - active-task
  - phase-5
  - security
  - rbac
  - virtual-cash-balance
  - docker
  - eslint
  - super-admin
---

# Current Active Task

**Current Task**: Phase 5: Production-Readiness Hardening — Security, RBAC, Virtual Cash Balance Unification & Tooling.

Full detail in [[2026-09-07-logs.md]]. Summary of objectives:

## Objectives
- [x] Read-only architectural audit across Drizzle schema, API business logic, frontend state, and Docker infra.
- [x] Rewrite the inventory reverse endpoint (`POST /api/v1/inventory/reverse`) to close a cross-tenant IDOR and enforce all stated guardrails (most-recent-restock-only, block Cash Collect reversal, no double-reversal via `inventory_logs.reversedLogId`, no compounding sign bug, no fake-success fallback).
- [x] Add `requireRole` RBAC middleware (`apps/api/src/core/middlewares/rbac.ts`) and apply it across machine/packet/user creation, user deactivation, and inventory reversal.
- [x] Add real user deactivation: `users.isActive` column, admin-only `PATCH /users/:id/status`, live re-check on every request in `tenantHandler`.
- [x] Remove all hardcoded fallback secrets (`JWT_SECRET`, `DATABASE_URL`/`POSTGRES_PASSWORD`); fail fast on startup if missing. Rotate both to high-entropy values against the live Postgres volume. Bind Postgres to `127.0.0.1:5432` only.
- [x] Unify Virtual Cash Balance into a single shared calculation (`virtualCashBalance.service.ts`) consumed by every endpoint and the agent-facing UI.
- [x] Close the cash-collection race condition with a locked (`SELECT ... FOR UPDATE`) transaction.
- [x] Optimize both Dockerfiles for build-cache correctness, non-root execution, and pruned production images; fix a real runtime footgun (`pnpm run start` triggering a live registry install on every container boot).
- [x] Initialize ESLint (flat config) + Prettier at the workspace root; fix the resulting React rules-of-hooks violation and remaining lint errors down to 0.
- [x] Bootstrap the Super Admin account strictly from `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD` env vars (`packages/database/src/seed.ts`), failing fast if either is missing. All further users are created via the in-app admin UI.
- [x] Audit and update `docs/` (this Memory Bank) to reflect the Prisma → Drizzle migration, new schema columns, unified Virtual Cash Balance logic, and RBAC. Add root `README.md` covering environment setup.

## Next Up
- Standing by for a manual UI/UX flow review from the user.
- Deferred: automated low-stock email alerts, Admin Dashboard chart refinements (paused at the user's request in favor of this hardening pass).
