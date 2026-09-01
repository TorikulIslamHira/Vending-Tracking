---
id: logic-saas-01
type: business-rule
dependencies: []
impacts: ["apps/api/core/middlewares", "[[database-schema.md]]"]
---

# 🏢 Multi-Tenant SaaS Rules

- **Data Isolation:** Every table (except global Tenant settings) must have a `tenantId`.
- **API Rule:** All requests must extract `tenantId` from the JWT and scope database queries accordingly.
