---
id: logic-inventory-01
type: business-rule
dependencies: ["[[database-schema.md]]"]
impacts: ["apps/api/modules/inventory", "apps/web/features/restock"]
---

# 📦 Inventory & Restock Flow

> **AI Directive:** Never build logic for counting exact items manually. Use the predefined "Packet" logic.

- **Standard Restock:** Agent scans QR -> Selects Packet -> Inputs number of Packets. System calculates total pieces.
- **Manual Entry:** For non-standard items, Agent inputs exact quantity and a mandatory `remark`.
- **Reverse Mechanism:** Mistakes must be "Reversed" (creates a negative log to offset stock), not hard-deleted. Mandatory `remark` required.
- **Cash Collection:** Agent inputs physical cash. System resets `virtualCashBalance` to 0.
