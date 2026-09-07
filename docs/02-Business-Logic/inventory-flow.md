---
id: logic-inventory-01
type: business-rule
dependencies: ["[[database-schema.md]]"]
impacts: ["apps/api/modules/inventory", "apps/api/modules/machines", "apps/web/src/app/(agent)"]
---

# 📦 Inventory & Restock Flow

> **AI Directive:** Never build logic for counting exact items manually. Use the predefined "Packet" logic.

- **Standard Restock:** Agent scans QR -> Selects Packet -> Inputs number of Packets. System calculates total pieces (`standardRestockHandler`).
- **Manual Entry:** For non-standard items, Agent inputs exact quantity and a mandatory `remark` (`manualRestockHandler`).
- **Reverse Mechanism** (`POST /api/v1/inventory/reverse`, RBAC: `ADMIN` or `FIELD_AGENT`): Mistakes are "Reversed" (creates a compensating `REVERSE` log with the negated quantity), never hard-deleted. The client sends only `{ logId, remarks }` — the server resolves everything else from the referenced log. Strict guardrails enforced inside a single locked transaction (`SELECT ... FOR UPDATE` on the machine row):
  1. Cash Collect entries can **never** be reversed (checked against `cash_logs` explicitly, not inferred).
  2. Only the single **most recent** `STANDARD`/`MANUAL` entry with a positive `quantityAdded` for that machine is eligible — anything older is rejected.
  3. A `REVERSE` entry can never itself be reversed, and a given log can only be reversed once (`inventory_logs.reversedLogId` records which log a reversal targets; a second attempt against the same log is rejected as a conflict).
  4. Mandatory `remark`, minimum 5 characters.
  5. Any failure (validation or DB) returns a real HTTP error status — never a fabricated success response.
- **Cash Collection** (`POST /api/v1/inventory/cash-collection`): Agent inputs physical cash counted. The backend locks the machine row for the duration of a transaction, recomputes the expected balance from the ledger, and requires a mandatory `remark` if the collected amount exceeds it (see Virtual Cash Balance below). The locking closes a race where two near-simultaneous (e.g. double-tapped) submissions could otherwise both read the same pre-collection totals and both pass the guardrail. The stored `machines.virtualCashBalance` column is **not** manually reset to `0` anymore — it self-heals because the ledger-derived stock naturally drops to (near) zero once the matching cash has been logged.

## Virtual Cash Balance — single source of truth
`(Total Current Stock) * pricePerPlay`, computed **dynamically** from the `inventory_logs`/`cash_logs` ledger — never read from a stored column. One shared implementation, `computeVirtualCashBalances()` / `computeVirtualCashBalanceForMachine()` in `apps/api/src/modules/machines/virtualCashBalance.service.ts`, is the only place this formula is written. Every consumer calls it instead of recomputing independently:
- `GET /api/v1/machines/:id` (machine detail)
- `GET /api/v1/machines` (fleet list)
- `GET /api/v1/machines/metrics` (dashboard totals)
- `cashCollectionHandler`'s overage guardrail
- The agent-facing machine page (`apps/web/src/app/(agent)/machine/[machineId]/page.tsx`) reads this value straight from the `GET /machines/:id` response rather than recomputing it client-side from raw logs, so it can never disagree with what an admin sees for the same machine.

Before this unification, three independent implementations existed and disagreed with each other — notably, the fleet list and dashboard read a stored `machines.virtualCashBalance` column that was never incremented on restock, so both permanently showed `$0`.
