---
id: logic-saas-01
type: business-rule
dependencies: []
impacts: ["apps/api/core/middlewares", "[[database-schema.md]]"]
---

# 🏢 Multi-Tenant SaaS Rules

- **Data Isolation:** Every table (except global Tenant settings) must have a `tenantId`.
- **API Rule:** All requests must extract `tenantId` from the JWT and scope database queries accordingly.
- **Auth Middleware (`apps/api/src/core/middlewares/tenantHandler.ts`):** Verifies the JWT, injects `request.tenantId` / `request.userId` / `request.userRole`, and re-checks the user's live `isActive` status against the database on **every** request — a deactivated account's existing JWT is rejected immediately, not just at its next login.
- **Role-Based Access Control (`apps/api/src/core/middlewares/rbac.ts`):** A second, orthogonal layer on top of tenant isolation. `requireRole(...roles)` is an additional `onRequest` hook applied per-route (runs after `tenantHandler`, so `request.userRole` is already populated) — it does not replace tenant scoping, it restricts *which role within the tenant* may call a given route. Currently applied to: machine creation, packet creation, user creation, the user-deactivation toggle (all `ADMIN`-only), and inventory reversal (`ADMIN` or `FIELD_AGENT` — agents must be able to self-correct restock mistakes in the field).
