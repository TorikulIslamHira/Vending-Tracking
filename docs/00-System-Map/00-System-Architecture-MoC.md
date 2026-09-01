---
title: System Architecture Map of Content (MoC)
type: moc
dependencies: []
impacts:
  - "[[api]]"
  - "[[web]]"
  - "[[shared-types]]"
  - "[[validation]]"
  - "[[database]]"
tags:
  - architecture
  - map-of-content
  - system
---

# System Architecture Map of Content (MoC)

Overview of the Multi-Tenant Vending Machine SaaS platform monorepo structure, core applications, and shared packages.

## 📦 Applications (`apps/`)
- [[api]]: Backend API service managing multi-tenant vending machines, auth, telemetry, and business transactions.
- [[web]]: Frontend portal / dashboard for machine operators, tenants, and administrators.

## 🧱 Shared Packages (`packages/`)
- [[shared-types]]: Common TypeScript type definitions, domain models, and shared interfaces across apps.
- [[validation]]: Centralized schema validation and request/payload validation logic.
- [[database]]: Data access layer, ORM/schema definitions, and database migrations for multi-tenant isolation.

## 📚 AI Memory Bank Navigation

### 🏛️ Architecture (`01-Architecture/`)
- [[database-schema|🗄️ Database Schema Architecture (Prisma)]] (ID: `arch-db-schema-01`)
- [[frontend-ui-guidelines|🎨 Frontend UI/UX Architecture & Guidelines]] (ID: `arch-frontend-ui-01`)
- [[mobile-wireframe-journey|📱 Mobile-First User Journey & Wireframe Plan]] (ID: `arch-wireframe-journey-02`)

### ⚙️ Business Logic (`02-Business-Logic/`)
- [[multi-tenant-saas|🏢 Multi-Tenant SaaS & White-Labeling]] (ID: `logic-saas-01`)
- [[inventory-flow|📦 Inventory & Restock Flow]] (ID: `logic-inventory-01`)

### 📋 Operations & Tracking
- [[current-task|📌 Current Active Task]] (`03-Active-Tasks/`)
- [[final-qa-report|🛡️ Final End-to-End QA & Status Report]] (`03-Active-Tasks/`)
- [[2026-08-24-logs|📝 AI Changelogs (2026-08-24)]] (`04-AI-Changelogs/`)
- [[2026-08-25-logs|📝 AI Changelogs (2026-08-25)]] (`04-AI-Changelogs/`)
- [[2026-08-26-logs|📝 AI Changelogs (2026-08-26)]] (`04-AI-Changelogs/`)
