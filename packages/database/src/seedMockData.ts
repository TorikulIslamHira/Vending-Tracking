import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq, inArray } from "drizzle-orm";
import { db } from "./client.js";
import {
  tenants,
  users,
  stores,
  machines,
  cashLogs,
  machineIssueLogs,
} from "./schema.js";

/**
 * LOCAL DEV / DEMO DATA ONLY. Never invoked by deploy.sh (unlike seed.ts,
 * which deploy.sh runs after every production deploy specifically to keep
 * the database "pristine clean") — this script exists purely so a developer
 * has realistic Stores/Machines/Cash Logs to click through while building
 * UI locally. Running it against production would litter real tenant data
 * with fake stores, so it refuses to run unless NODE_ENV !== "production".
 */
async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "seedMockData.ts is a local-dev-only script and refuses to run when NODE_ENV=production. " +
        "If you're seeing this in a real deploy, something is misconfigured — this must never touch production data."
    );
  }

  console.log("🌱 Seeding local mock data (stores, machines, cash logs, flagged issues)...");

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, "tenant-bee-novelty"),
  });
  if (!tenant) {
    throw new Error(
      "No tenant found. Run the base seed first: docker compose exec -w /app/packages/database api node dist/seed.js"
    );
  }
  const tenantId = tenant.id;

  // ----------------------------------------------------------------------
  // 1. Demo Field Agent users (so cash logs / issue reports attribute to a
  //    real agent, not just the Super Admin — also lets you log in as a
  //    Field Agent locally to test that role's own views).
  // ----------------------------------------------------------------------
  const demoPasswordHash = await bcrypt.hash("LocalDevPassword123!", 10);
  const agentSeeds = [
    { email: "alex.agent@local.dev", name: "Alex Rivera" },
    { email: "jamie.agent@local.dev", name: "Jamie Chen" },
  ];
  const agentIds: string[] = [];
  for (const a of agentSeeds) {
    const existing = await db.query.users.findFirst({ where: eq(users.email, a.email) });
    if (existing) {
      agentIds.push(existing.id);
      continue;
    }
    const [created] = await db
      .insert(users)
      .values({
        tenantId,
        name: a.name,
        role: "FIELD_AGENT",
        email: a.email,
        passwordHash: demoPasswordHash,
      })
      .returning({ id: users.id });
    agentIds.push(created.id);
  }
  console.log(`✅ Field Agents ready: ${agentSeeds.map((a) => a.email).join(", ")} (password: LocalDevPassword123!)`);

  // ----------------------------------------------------------------------
  // 2. Reset previously-seeded mock data for a clean slate on every run.
  //    Deleting machines cascades their cash_logs/machine_issue_logs rows
  //    (both FKs are ON DELETE CASCADE); stores are deleted after since
  //    machines.storeId is ON DELETE SET NULL, not cascade.
  // ----------------------------------------------------------------------
  const priorStores = await db.query.stores.findMany({
    where: eq(stores.tenantId, tenantId),
    columns: { id: true },
  });
  if (priorStores.length > 0) {
    const priorMachines = await db.query.machines.findMany({
      where: inArray(
        machines.storeId,
        priorStores.map((s) => s.id)
      ),
      columns: { id: true },
    });
    if (priorMachines.length > 0) {
      await db.delete(machines).where(
        inArray(
          machines.id,
          priorMachines.map((m) => m.id)
        )
      );
    }
    await db.delete(stores).where(eq(stores.tenantId, tenantId));
    console.log(`🧹 Cleared ${priorStores.length} previously-seeded mock store(s) and their machines/logs.`);
  }

  // ----------------------------------------------------------------------
  // 3. Stores — varied Eircodes/locations/payment modes/splits.
  // ----------------------------------------------------------------------
  const storeSeeds = [
    {
      name: "Plaza News & Sweets",
      category: "Confectionery & Toys",
      eircode: "D02 AF30",
      locationAddress: "14 Dame Street, Dublin 2, Co. Dublin",
      paymentMode: "CASH" as const,
      shopCutPercent: 30,
    },
    {
      name: "Broadway Mini-Mart",
      category: "Convenience",
      eircode: "T12 XY45",
      locationAddress: "8 Patrick Street, Cork City, Co. Cork",
      paymentMode: "BANK" as const,
      shopCutPercent: 25,
    },
    {
      name: "Hoboken Terminal Kiosk",
      category: "Transit Kiosk",
      eircode: "H91 P2K3",
      locationAddress: "Eyre Square, Galway City, Co. Galway",
      paymentMode: "CASH" as const,
      shopCutPercent: 20,
    },
    {
      name: "Riverside Arcade",
      category: "Arcade & Novelty",
      eircode: "V94 W2X1",
      locationAddress: "Arthur's Quay, Limerick City, Co. Limerick",
      paymentMode: "BANK" as const,
      shopCutPercent: 35,
    },
  ];

  const insertedStores = await db
    .insert(stores)
    .values(
      storeSeeds.map((s) => ({
        tenantId,
        name: s.name,
        category: s.category,
        eircode: s.eircode,
        locationAddress: s.locationAddress,
        paymentMode: s.paymentMode,
        shopCutPercent: s.shopCutPercent,
        businessCutPercent: 100 - s.shopCutPercent,
        qrCode: `STORE-${s.name.replace(/\s+/g, "").toUpperCase()}`,
      }))
    )
    .returning();
  console.log(`✅ Stores created: ${insertedStores.length}`);

  // ----------------------------------------------------------------------
  // 4. Machines — 2-3 per store, 3 flagged for the "Mark as Repaired" flow.
  // ----------------------------------------------------------------------
  type MachineSeed = {
    storeIndex: number;
    serial: string;
    keyNumber: string;
    dispenserType: string;
    status: "ONLINE" | "OFFLINE";
    virtualCashBalance: string;
    flagged?: { reason: string; agentIndex: number };
  };

  const machineSeeds: MachineSeed[] = [
    { storeIndex: 0, serial: "VM-PLZ-2609-0001", keyNumber: "K-101", dispenserType: "Spiral Chute", status: "ONLINE", virtualCashBalance: "42.50" },
    { storeIndex: 0, serial: "VM-PLZ-2609-0002", keyNumber: "K-102", dispenserType: "Gumball Head", status: "ONLINE", virtualCashBalance: "18.00", flagged: { reason: "Malfunction", agentIndex: 0 } },
    { storeIndex: 1, serial: "VM-BWY-2609-0001", keyNumber: "K-201", dispenserType: "Spiral Chute", status: "ONLINE", virtualCashBalance: "63.25" },
    { storeIndex: 1, serial: "VM-BWY-2609-0002", keyNumber: "K-202", dispenserType: "Capsule Toy", status: "OFFLINE", virtualCashBalance: "0.00", flagged: { reason: "Key Lost", agentIndex: 1 } },
    { storeIndex: 1, serial: "VM-BWY-2609-0003", keyNumber: "K-203", dispenserType: "Spiral Chute", status: "ONLINE", virtualCashBalance: "27.75" },
    { storeIndex: 2, serial: "VM-HTK-2609-0001", keyNumber: "K-301", dispenserType: "Gumball Head", status: "ONLINE", virtualCashBalance: "51.00" },
    { storeIndex: 2, serial: "VM-HTK-2609-0002", keyNumber: "K-302", dispenserType: "Spiral Chute", status: "ONLINE", virtualCashBalance: "9.50", flagged: { reason: "Locker Broken", agentIndex: 0 } },
    { storeIndex: 3, serial: "VM-RSA-2609-0001", keyNumber: "K-401", dispenserType: "Capsule Toy", status: "ONLINE", virtualCashBalance: "88.00" },
    { storeIndex: 3, serial: "VM-RSA-2609-0002", keyNumber: "K-402", dispenserType: "Spiral Chute", status: "ONLINE", virtualCashBalance: "34.20" },
  ];

  const insertedMachines = await db
    .insert(machines)
    .values(
      machineSeeds.map((m) => ({
        tenantId,
        storeId: insertedStores[m.storeIndex].id,
        serialNumber: m.serial,
        location: insertedStores[m.storeIndex].name,
        category: "General",
        type: m.dispenserType,
        keyNumber: m.keyNumber,
        status: m.status,
        virtualCashBalance: m.virtualCashBalance,
        qrCode: m.serial,
        attentionNeeded: Boolean(m.flagged),
        attentionReason: m.flagged?.reason ?? null,
      }))
    )
    .returning();
  console.log(`✅ Machines created: ${insertedMachines.length} (${machineSeeds.filter((m) => m.flagged).length} flagged)`);

  // ----------------------------------------------------------------------
  // 5. Open issue logs for the flagged machines — matches the new
  //    machine_issue_logs lifecycle table so "Mark as Repaired" has a real
  //    OPEN row to resolve, not just the machines.attentionNeeded flag.
  // ----------------------------------------------------------------------
  const flaggedSeeds = machineSeeds
    .map((m, i) => ({ machine: insertedMachines[i], seed: m }))
    .filter((x) => x.seed.flagged);

  if (flaggedSeeds.length > 0) {
    await db.insert(machineIssueLogs).values(
      flaggedSeeds.map(({ machine, seed }) => ({
        tenantId,
        machineId: machine.id,
        reportedByAgentId: agentIds[seed.flagged!.agentIndex],
        reason: seed.flagged!.reason,
        status: "OPEN" as const,
      }))
    );
  }
  console.log(`✅ Open issue logs created: ${flaggedSeeds.length}`);

  // ----------------------------------------------------------------------
  // 6. Historical cash collection logs, spread over the last ~35 days, for
  //    the Reports page / Cash Ledger / Activity History to have data.
  // ----------------------------------------------------------------------
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

  const cashLogSeeds = [
    { machineIndex: 0, agentIndex: 0, collected: 42.5, expected: 42.5, daysAgo: 2 },
    { machineIndex: 2, agentIndex: 1, collected: 60.0, expected: 63.25, daysAgo: 3 },
    { machineIndex: 3, agentIndex: 1, collected: 0, expected: 0, daysAgo: 30 }, // last reading before it went offline/flagged
    { machineIndex: 4, agentIndex: 0, collected: 27.75, expected: 27.75, daysAgo: 5 },
    { machineIndex: 5, agentIndex: 1, collected: 48.0, expected: 51.0, daysAgo: 7 },
    { machineIndex: 7, agentIndex: 0, collected: 85.0, expected: 88.0, daysAgo: 1 },
    { machineIndex: 8, agentIndex: 1, collected: 34.2, expected: 34.2, daysAgo: 4 },
    { machineIndex: 0, agentIndex: 1, collected: 55.0, expected: 55.0, daysAgo: 12 },
    { machineIndex: 2, agentIndex: 0, collected: 40.0, expected: 40.0, daysAgo: 15 },
    { machineIndex: 4, agentIndex: 1, collected: 22.5, expected: 25.0, daysAgo: 18 },
    { machineIndex: 5, agentIndex: 0, collected: 61.0, expected: 61.0, daysAgo: 22 },
    { machineIndex: 7, agentIndex: 1, collected: 70.0, expected: 70.0, daysAgo: 28 },
    { machineIndex: 8, agentIndex: 0, collected: 29.0, expected: 32.0, daysAgo: 33 },
  ];

  await db.insert(cashLogs).values(
    cashLogSeeds.map((c) => {
      const discrepancy = Number((c.expected - c.collected).toFixed(2));
      const machine = insertedMachines[c.machineIndex];
      const store = insertedStores[machineSeeds[c.machineIndex].storeIndex];
      return {
        tenantId,
        machineId: machine.id,
        agentId: agentIds[c.agentIndex],
        collectedAmount: c.collected.toFixed(2),
        expectedAmount: c.expected.toFixed(2),
        discrepancy: discrepancy.toFixed(2),
        remarks: discrepancy !== 0 ? "Minor shortage — coin jam suspected" : "Clean collection, no issues",
        stockCleared: true,
        isPartial: false,
        shopPaymentStatus: store.paymentMode === "CASH" ? ("PAID" as const) : ("PENDING" as const),
        expectedPaymentDate:
          store.paymentMode === "BANK"
            ? new Date(daysAgo(c.daysAgo).getTime() + 3 * 24 * 60 * 60 * 1000)
            : null,
        createdAt: daysAgo(c.daysAgo),
      };
    })
  );
  console.log(`✅ Cash collection logs created: ${cashLogSeeds.length}`);

  console.log("\n🎉 Mock data ready. Log in as admin@local.dev (or alex.agent@local.dev / jamie.agent@local.dev) to explore.");
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Mock data seeding failed:", e);
  process.exit(1);
});
