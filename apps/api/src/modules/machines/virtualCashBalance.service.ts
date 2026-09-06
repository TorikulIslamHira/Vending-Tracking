import { eq, and, inArray, sum } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { db, inventoryLogs, cashLogs } from "../../core/db";

export interface VirtualCashBalance {
  totalRestockedUnits: number;
  totalCashCollected: number;
  totalUnitsSold: number;
  currentEstimatedStock: number;
  virtualCashBalance: number;
}

/**
 * Anything shaped like `db` or a `db.transaction(tx => ...)` callback's `tx` —
 * both extend `PgDatabase` and support the same
 * `.select().from().where().groupBy()` query builder. Accepting either lets a
 * caller run this inside a locked transaction instead of only against the
 * top-level connection pool.
 */
type QueryExecutor = PgDatabase<any, any, any>;

/**
 * Single source of truth for "Virtual Cash Balance": derived live from the
 * inventory/cash log history rather than a stored column, so it can never drift
 * out of sync with the ledger. Every consumer (machine detail, fleet list,
 * dashboard metrics, cash-collection guardrail) must call this instead of
 * recomputing the formula independently.
 *
 * Batches all machines into two grouped aggregate queries (not one query per
 * machine), so it scales to a full fleet listing.
 */
export async function computeVirtualCashBalances(
  executor: QueryExecutor,
  tenantId: string,
  targetMachines: { id: string; pricePerPlay: string | number | null }[]
): Promise<Map<string, VirtualCashBalance>> {
  const result = new Map<string, VirtualCashBalance>();

  if (targetMachines.length === 0) {
    return result;
  }

  const machineIds = targetMachines.map((m) => m.id);

  const [inventorySums, cashSums] = await Promise.all([
    executor
      .select({ machineId: inventoryLogs.machineId, total: sum(inventoryLogs.quantityAdded) })
      .from(inventoryLogs)
      .where(and(eq(inventoryLogs.tenantId, tenantId), inArray(inventoryLogs.machineId, machineIds)))
      .groupBy(inventoryLogs.machineId),
    executor
      .select({ machineId: cashLogs.machineId, total: sum(cashLogs.collectedAmount) })
      .from(cashLogs)
      .where(and(eq(cashLogs.tenantId, tenantId), inArray(cashLogs.machineId, machineIds)))
      .groupBy(cashLogs.machineId),
  ]);

  const inventoryByMachine = new Map(inventorySums.map((r) => [r.machineId, Number(r.total || 0)]));
  const cashByMachine = new Map(cashSums.map((r) => [r.machineId, Number(r.total || 0)]));

  for (const machine of targetMachines) {
    const totalRestockedUnits = inventoryByMachine.get(machine.id) || 0;
    const totalCashCollected = cashByMachine.get(machine.id) || 0;
    const pricePerPlay = Number(machine.pricePerPlay || 1.0) || 1.0;
    const totalUnitsSold = Math.floor(totalCashCollected / pricePerPlay);
    const currentEstimatedStock = Math.max(0, totalRestockedUnits - totalUnitsSold);
    const virtualCashBalance = Number((currentEstimatedStock * pricePerPlay).toFixed(2));

    result.set(machine.id, {
      totalRestockedUnits,
      totalCashCollected,
      totalUnitsSold,
      currentEstimatedStock,
      virtualCashBalance,
    });
  }

  return result;
}

/**
 * Convenience wrapper for a single machine.
 */
export async function computeVirtualCashBalanceForMachine(
  executor: QueryExecutor,
  tenantId: string,
  machine: { id: string; pricePerPlay: string | number | null }
): Promise<VirtualCashBalance> {
  const balances = await computeVirtualCashBalances(executor, tenantId, [machine]);
  return (
    balances.get(machine.id) || {
      totalRestockedUnits: 0,
      totalCashCollected: 0,
      totalUnitsSold: 0,
      currentEstimatedStock: 0,
      virtualCashBalance: 0,
    }
  );
}
