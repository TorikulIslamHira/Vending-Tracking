---
id: arch-db-schema-01
type: architecture
dependencies: ["[[multi-tenant-saas.md]]", "[[inventory-flow.md]]"]
impacts: ["@packages/database", "apps/api/modules"]
---

# 🗄️ Database Schema Architecture (Prisma)

> **AI Directive:** All database models MUST include a `tenantId` to support the Multi-Tenant SaaS architecture. 

## Core Entities
1. **Tenant (Company)**: `id`, `name`, `themeConfig`, `isActive`, `createdAt`
2. **User / Agent**: `id`, `tenantId`, `name`, `role` (ADMIN, FIELD_AGENT), `email`, `passwordHash`
3. **Machine**: `id`, `tenantId`, `serialNumber`, `location`, `status` (ONLINE, OFFLINE), `qrCode`, `virtualCashBalance`
4. **PacketConfig**: `id`, `tenantId`, `name`, `brand`, `quantityPerPacket`, `pricePerItem` (Agents cannot change `quantityPerPacket`)
5. **InventoryLog**: `id`, `tenantId`, `machineId`, `agentId`, `packetId`, `entryType` (STANDARD, MANUAL, REVERSE), `quantityAdded`, `remarks`, `createdAt`
6. **CashLog**: `id`, `tenantId`, `machineId`, `agentId`, `collectedAmount`, `expectedAmount`, `discrepancy`, `createdAt`
