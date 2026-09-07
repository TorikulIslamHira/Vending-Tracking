import { FastifyReply, FastifyRequest } from "fastify";
import { eq, and, or, gt, desc, gte, lte } from "drizzle-orm";
import {
  RestockSchema,
  ManualEntrySchema,
  CashCollectionSchema,
  ReverseEntrySchema,
} from "@vending/validation";
import { db, machines, packetConfigs, inventoryLogs, cashLogs } from "../../core/db";
import { computeVirtualCashBalanceForMachine } from "../machines/virtualCashBalance.service";

/**
 * Thrown for expected reversal-validation failures so the transaction rolls back
 * cleanly and the handler can reply with the correct HTTP status instead of a 500.
 */
class ReversalError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

/**
 * Thrown for expected cash-collection validation failures so the transaction
 * rolls back cleanly and the handler can reply with the correct HTTP status.
 */
class CashCollectionError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

/**
 * Standard Restock: Agent selects predefined packet configuration.
 * Multiplies numberOfPackets by quantityPerPacket and logs InventoryLog.
 */
export async function standardRestockHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const tenantId = request.tenantId;
  const agentId = request.userId;

  const parseResult = RestockSchema.safeParse(request.body);

  if (!parseResult.success) {
    return reply.status(400).send({
      statusCode: 400,
      error: "Bad Request",
      message: "Validation failed",
      issues: parseResult.error.issues,
    });
  }

  const { machineId, packetId, quantity, remarks } = parseResult.data;

  // Verify machine exists and belongs to tenant (match by id, serialNumber, or qrCode)
  const machine = await db.query.machines.findFirst({
    where: and(
      eq(machines.tenantId, tenantId),
      or(eq(machines.id, machineId), eq(machines.serialNumber, machineId), eq(machines.qrCode, machineId))
    ),
  });

  if (!machine) {
    return reply.status(404).send({
      statusCode: 404,
      error: "Not Found",
      message: "Machine not found in your organization",
    });
  }

  // Fetch PacketConfig defined by Admin
  const packetConfig = await db.query.packetConfigs.findFirst({
    where: and(eq(packetConfigs.id, packetId), eq(packetConfigs.tenantId, tenantId)),
  });

  if (!packetConfig) {
    return reply.status(404).send({
      statusCode: 404,
      error: "Not Found",
      message: "Packet configuration not found in your organization",
    });
  }

  // Calculate total units: packet count * quantityPerPacket
  const totalPieces = quantity * packetConfig.quantityPerPacket;

  // Execute database transaction: Log Inventory Entry and update machine timestamp
  const { log, updatedMachine } = await db.transaction(async (tx) => {
    const [insertedLog] = await tx
      .insert(inventoryLogs)
      .values({
        tenantId,
        machineId: machine.id,
        agentId,
        packetId: packetConfig.id,
        entryType: "STANDARD",
        quantityAdded: totalPieces,
        remarks: remarks || `Standard restock: ${quantity} packets (${totalPieces} items)`,
      })
      .returning();

    const [machineRecord] = await tx
      .update(machines)
      .set({ updatedAt: new Date() })
      .where(eq(machines.id, machine.id))
      .returning();

    return { log: insertedLog, updatedMachine: machineRecord };
  });

  return reply.status(201).send({
    statusCode: 201,
    message: "Standard restock processed successfully",
    data: {
      logId: log.id,
      machineId: updatedMachine.id,
      packetName: packetConfig.name,
      packetsAdded: quantity,
      totalPiecesAdded: totalPieces,
      entryType: log.entryType,
      createdAt: log.createdAt,
    },
  });
}

/**
 * Manual & Reverse Entry: Non-standard items or error correction reversals.
 * Requires strictly mandatory remarks (min 5 chars).
 */
export async function manualRestockHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const tenantId = request.tenantId;
  const agentId = request.userId;

  const parseResult = ManualEntrySchema.safeParse(request.body);

  if (!parseResult.success) {
    return reply.status(400).send({
      statusCode: 400,
      error: "Bad Request",
      message: "Validation failed: remarks are strictly mandatory (min 5 characters)",
      issues: parseResult.error.issues,
    });
  }

  const { machineId, quantityAdded, entryType, remarks, packetId, brandName } =
    parseResult.data;

  // Verify machine exists and belongs to tenant (match by id, serialNumber, or qrCode)
  const machine = await db.query.machines.findFirst({
    where: and(
      eq(machines.tenantId, tenantId),
      or(eq(machines.id, machineId), eq(machines.serialNumber, machineId), eq(machines.qrCode, machineId))
    ),
  });

  if (!machine) {
    return reply.status(404).send({
      statusCode: 404,
      error: "Not Found",
      message: "Machine not found in your organization",
    });
  }

  // Adjust sign if REVERSE type is specified but passed as positive
  let finalQuantityAdded = quantityAdded;
  if (entryType === "REVERSE" && quantityAdded > 0) {
    finalQuantityAdded = -quantityAdded;
  }

  // Format descriptive remark
  const formattedRemarks = brandName
    ? `[Brand: ${brandName}] ${remarks}`
    : remarks;

  const { log, updatedMachine } = await db.transaction(async (tx) => {
    const [insertedLog] = await tx
      .insert(inventoryLogs)
      .values({
        tenantId,
        machineId: machine.id,
        agentId,
        packetId: packetId || null,
        entryType: (entryType as "STANDARD" | "MANUAL" | "REVERSE") || "MANUAL",
        quantityAdded: finalQuantityAdded,
        remarks: formattedRemarks,
      })
      .returning();

    const [machineRecord] = await tx
      .update(machines)
      .set({ updatedAt: new Date() })
      .where(eq(machines.id, machine.id))
      .returning();

    return { log: insertedLog, updatedMachine: machineRecord };
  });

  return reply.status(201).send({
    statusCode: 201,
    message:
      entryType === "REVERSE"
        ? "Reversal entry recorded successfully"
        : "Manual inventory entry recorded successfully",
    data: {
      logId: log.id,
      machineId: updatedMachine.id,
      entryType: log.entryType,
      quantityAdded: log.quantityAdded,
      remarks: log.remarks,
      createdAt: log.createdAt,
    },
  });
}

/**
 * Cash Collection: Records physical cash collected and calculates discrepancy
 */
export async function cashCollectionHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const tenantId = request.tenantId;
  const agentId = request.userId;

  const parseResult = CashCollectionSchema.safeParse(request.body);

  if (!parseResult.success) {
    return reply.status(400).send({
      statusCode: 400,
      error: "Bad Request",
      message: "Validation failed",
      issues: parseResult.error.issues,
    });
  }

  const { machineId, collectedAmount, remarks, stockCleared } = parseResult.data;

  // Resolve the fuzzy identifier (id, serial, or QR) to a machine row. Read-only,
  // not part of the race, so no lock needed yet.
  const machine = await db.query.machines.findFirst({
    where: and(
      eq(machines.tenantId, tenantId),
      or(eq(machines.id, machineId), eq(machines.serialNumber, machineId), eq(machines.qrCode, machineId))
    ),
  });

  if (!machine) {
    return reply.status(404).send({
      statusCode: 404,
      error: "Not Found",
      message: "Machine not found in your organization",
    });
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Lock the machine row for the duration of the transaction. Two
      // double-tapped (or otherwise concurrent) collection requests for the same
      // machine now serialize instead of both reading the same pre-collection
      // totals and both independently passing the overage guardrail.
      const [lockedMachine] = await tx
        .select()
        .from(machines)
        .where(and(eq(machines.id, machine.id), eq(machines.tenantId, tenantId)))
        .for("update");

      if (!lockedMachine) {
        throw new CashCollectionError(404, "Machine not found in your organization");
      }

      // Same unified formula used by the machine detail, fleet list, and
      // dashboard endpoints — recomputed inside the lock so it reflects any
      // collection that just committed from a prior, now-unblocked request.
      const { virtualCashBalance: expectedAmount } = await computeVirtualCashBalanceForMachine(
        tx,
        tenantId,
        lockedMachine
      );

      // Safety guardrail: any mismatch — shortage OR overage — requires both a
      // remark explaining it and explicit "Stock Cleared / Force Reconcile"
      // acknowledgement that the agent collected anyway despite the discrepancy.
      // (Previously only overage required a remark; a shortage — e.g. expected
      // $25, collected $20 — went through silently, which is exactly the kind
      // of shrinkage/theft signal that most needs a paper trail.)
      const hasMismatch = collectedAmount !== expectedAmount;
      if (hasMismatch) {
        const direction = collectedAmount > expectedAmount ? "overage" : "shortage";
        if (!remarks || remarks.trim().length === 0) {
          throw new CashCollectionError(
            400,
            `A remark explaining the ${direction} is required (expected $${expectedAmount.toFixed(2)}, collected $${collectedAmount.toFixed(2)}).`
          );
        }
        if (!stockCleared) {
          throw new CashCollectionError(
            400,
            `Confirm "Stock Cleared / Force Reconcile" to proceed with a mismatched (${direction}) collection.`
          );
        }
      }

      const discrepancy = expectedAmount - collectedAmount;
      const isShortage = discrepancy > 0;

      const [insertedCashLog] = await tx
        .insert(cashLogs)
        .values({
          tenantId,
          machineId: lockedMachine.id,
          agentId,
          collectedAmount: String(collectedAmount),
          expectedAmount: String(expectedAmount),
          discrepancy: String(discrepancy),
          remarks: remarks || null,
          stockCleared: hasMismatch ? Boolean(stockCleared) : false,
        })
        .returning();

      const [updatedMachine] = await tx
        .update(machines)
        .set({ updatedAt: new Date() })
        .where(and(eq(machines.id, lockedMachine.id), eq(machines.tenantId, tenantId)))
        .returning();

      // Recompute from the now-updated ledger (same unified formula) rather than
      // trusting a stored column, so the reported post-collection balance is exact.
      const { virtualCashBalance: newVirtualCashBalance } = await computeVirtualCashBalanceForMachine(
        tx,
        tenantId,
        updatedMachine
      );

      return { cashLog: insertedCashLog, updatedMachine, newVirtualCashBalance };
    });

    return reply.status(201).send({
      statusCode: 201,
      message: "Cash collection processed and virtual balance updated",
      data: {
        cashLogId: result.cashLog.id,
        machineId: result.updatedMachine.id,
        collectedAmount: Number(result.cashLog.collectedAmount),
        expectedAmount: Number(result.cashLog.expectedAmount),
        discrepancy: Number(result.cashLog.discrepancy),
        isShortage: Number(result.cashLog.discrepancy) > 0,
        stockCleared: result.cashLog.stockCleared,
        remarks: result.cashLog.remarks,
        newVirtualCashBalance: result.newVirtualCashBalance,
        createdAt: result.cashLog.createdAt,
      },
    });
  } catch (err) {
    if (err instanceof CashCollectionError) {
      return reply.status(err.statusCode).send({
        statusCode: err.statusCode,
        error: err.statusCode === 404 ? "Not Found" : "Bad Request",
        message: err.message,
      });
    }

    request.log.error(err);
    return reply.status(500).send({
      statusCode: 500,
      error: "Internal Server Error",
      message: "Failed to process cash collection",
    });
  }
}

/**
 * Get all Inventory Logs for the authenticated tenant (with optional machineId filter)
 * When machineId is provided, combines both inventory and cash collection history into a single timeline.
 */
export async function getInventoryLogsHandler(
  request: FastifyRequest<{ Querystring: { machineId?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const tenantId = request.tenantId;
  const { machineId } = request.query;

  try {
    let resolvedMachineId = machineId;
    if (machineId) {
      const machineRecord = await db.query.machines.findFirst({
        where: and(
          eq(machines.tenantId, tenantId),
          or(eq(machines.id, machineId), eq(machines.serialNumber, machineId), eq(machines.qrCode, machineId))
        ),
      });
      if (machineRecord) {
        resolvedMachineId = machineRecord.id;
      }
    }

    const whereCondition = resolvedMachineId
      ? and(eq(inventoryLogs.tenantId, tenantId), eq(inventoryLogs.machineId, resolvedMachineId))
      : eq(inventoryLogs.tenantId, tenantId);

    const invLogs = await db.query.inventoryLogs.findMany({
      where: whereCondition,
      with: {
        machine: {
          columns: {
            id: true,
            serialNumber: true,
            location: true,
          },
        },
        agent: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        packet: {
          columns: {
            id: true,
            name: true,
            brand: true,
          },
        },
      },
      orderBy: [desc(inventoryLogs.createdAt)],
      limit: 100,
    });

    const formattedInvLogs = invLogs.map((log) => ({
      ...log,
      logType: "INVENTORY" as const,
    }));

    // If machineId is provided, also fetch cash drop logs for this machine
    let formattedCashLogs: any[] = [];
    if (resolvedMachineId) {
      const cLogs = await db.query.cashLogs.findMany({
        where: and(eq(cashLogs.tenantId, tenantId), eq(cashLogs.machineId, resolvedMachineId)),
        with: {
          machine: {
            columns: {
              id: true,
              serialNumber: true,
              location: true,
            },
          },
          agent: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [desc(cashLogs.createdAt)],
        limit: 100,
      });

      formattedCashLogs = cLogs.map((log) => ({
        id: log.id,
        logType: "CASH" as const,
        tenantId: log.tenantId,
        machineId: log.machineId,
        agentId: log.agentId,
        entryType: "CASH_COLLECT",
        quantityAdded: null,
        collectedAmount: Number(log.collectedAmount),
        expectedAmount: Number(log.expectedAmount),
        discrepancy: Number(log.discrepancy),
        isShortage: Number(log.discrepancy) > 0,
        stockCleared: log.stockCleared,
        remarks: log.remarks || `Physical cash collect: $${Number(log.collectedAmount).toFixed(2)} collected`,
        createdAt: log.createdAt,
        machine: log.machine,
        agent: log.agent,
        packet: null,
      }));
    }

    const combinedLogs = [...formattedInvLogs, ...formattedCashLogs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return reply.send({
      statusCode: 200,
      data: combinedLogs,
    });
  } catch {
    return reply.send({
      statusCode: 200,
      data: [],
    });
  }
}

/**
 * Get the authenticated agent's own activity history (restocks, manual entries,
 * reversals, and cash collections they personally performed), across all
 * machines, most recent first. Scoped by `agentId = request.userId` — an
 * agent can only ever see their own logs, regardless of role.
 */
export async function getMyLogsHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const tenantId = request.tenantId;
  const agentId = request.userId;

  try {
    const invLogs = await db.query.inventoryLogs.findMany({
      where: and(eq(inventoryLogs.tenantId, tenantId), eq(inventoryLogs.agentId, agentId)),
      with: {
        machine: {
          columns: {
            id: true,
            serialNumber: true,
            location: true,
          },
        },
        packet: {
          columns: {
            id: true,
            name: true,
            brand: true,
          },
        },
      },
      orderBy: [desc(inventoryLogs.createdAt)],
      limit: 100,
    });

    const formattedInvLogs = invLogs.map((log) => ({
      ...log,
      logType: "INVENTORY" as const,
    }));

    const cLogs = await db.query.cashLogs.findMany({
      where: and(eq(cashLogs.tenantId, tenantId), eq(cashLogs.agentId, agentId)),
      with: {
        machine: {
          columns: {
            id: true,
            serialNumber: true,
            location: true,
          },
        },
      },
      orderBy: [desc(cashLogs.createdAt)],
      limit: 100,
    });

    const formattedCashLogs = cLogs.map((log) => ({
      id: log.id,
      logType: "CASH" as const,
      tenantId: log.tenantId,
      machineId: log.machineId,
      agentId: log.agentId,
      entryType: "CASH_COLLECT",
      quantityAdded: null,
      collectedAmount: Number(log.collectedAmount),
      expectedAmount: Number(log.expectedAmount),
      discrepancy: Number(log.discrepancy),
      isShortage: Number(log.discrepancy) > 0,
      stockCleared: log.stockCleared,
      remarks: log.remarks || `Physical cash collect: $${Number(log.collectedAmount).toFixed(2)} collected`,
      createdAt: log.createdAt,
      machine: log.machine,
      packet: null,
    }));

    const combinedLogs = [...formattedInvLogs, ...formattedCashLogs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 100);

    return reply.send({
      statusCode: 200,
      data: combinedLogs,
    });
  } catch (err) {
    request.log.error(err);
    return reply.send({
      statusCode: 200,
      data: [],
    });
  }
}

/**
 * Get all Cash Logs for the authenticated tenant with date range & store filters
 */
export async function getCashLogsHandler(
  request: FastifyRequest<{
    Querystring: {
      fromDate?: string;
      toDate?: string;
      storeId?: string;
      machineId?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const tenantId = request.tenantId;
  const { fromDate, toDate, storeId, machineId } = request.query;

  try {
    const conditions = [eq(cashLogs.tenantId, tenantId)];

    if (fromDate) {
      const start = new Date(fromDate.includes("T") ? fromDate : `${fromDate}T00:00:00.000Z`);
      if (!isNaN(start.getTime())) {
        conditions.push(gte(cashLogs.createdAt, start));
      }
    }

    if (toDate) {
      const end = new Date(toDate.includes("T") ? toDate : `${toDate}T23:59:59.999Z`);
      if (!isNaN(end.getTime())) {
        conditions.push(lte(cashLogs.createdAt, end));
      }
    }

    if (machineId && machineId !== "ALL" && machineId !== "all") {
      let resolvedMachineId: string = machineId;
      const machineRecord = await db.query.machines.findFirst({
        where: and(
          eq(machines.tenantId, tenantId),
          or(eq(machines.id, machineId), eq(machines.serialNumber, machineId), eq(machines.qrCode, machineId))
        ),
      });
      if (machineRecord) {
        resolvedMachineId = machineRecord.id;
      }
      conditions.push(eq(cashLogs.machineId, resolvedMachineId));
    }

    const cashLogList = await db.query.cashLogs.findMany({
      where: and(...conditions),
      with: {
        machine: {
          with: {
            store: {
              with: {
                location: true,
              },
            },
          },
        },
        agent: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [desc(cashLogs.createdAt)],
      limit: 200,
    });

    const filtered = storeId && storeId !== "ALL" && storeId !== "all"
      ? cashLogList.filter((l) => l.machine?.storeId === storeId || l.machine?.store?.id === storeId)
      : cashLogList;

    return reply.send({
      statusCode: 200,
      data: filtered.map((log) => ({
        ...log,
        isShortage: Number(log.discrepancy) > 0,
      })),
    });
  } catch {
    return reply.send({
      statusCode: 200,
      data: [],
    });
  }
}

/**
 * Financial Reports & Reconciliation Handler:
 * Aggregates cash collections by date range (inclusive of entire day) and optional storeId filter.
 */
export async function getReportsHandler(
  request: FastifyRequest<{
    Querystring: {
      fromDate?: string;
      toDate?: string;
      storeId?: string;
      machineId?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const tenantId = request.tenantId;
  const { fromDate, toDate, storeId, machineId } = request.query;

  try {
    // 1. Fetch machines belonging to this tenant, optionally filtered by storeId
    const machineWhereConditions = [eq(machines.tenantId, tenantId)];
    if (storeId && storeId !== "ALL" && storeId !== "all") {
      machineWhereConditions.push(eq(machines.storeId, storeId));
    }
    if (machineId && machineId !== "ALL" && machineId !== "all") {
      const matchCondition = or(
        eq(machines.id, machineId),
        eq(machines.serialNumber, machineId),
        eq(machines.qrCode, machineId)
      );
      if (matchCondition) {
        machineWhereConditions.push(matchCondition);
      }
    }

    const tenantMachines = await db.query.machines.findMany({
      where: and(...machineWhereConditions),
      with: {
        store: {
          with: {
            location: true,
          },
        },
      },
      orderBy: [desc(machines.createdAt)],
    });

    // 2. Build cash logs date range filter with inclusive full-day boundaries
    const cashLogConditions = [eq(cashLogs.tenantId, tenantId)];

    if (fromDate) {
      const start = new Date(fromDate.includes("T") ? fromDate : `${fromDate}T00:00:00.000Z`);
      if (!isNaN(start.getTime())) {
        cashLogConditions.push(gte(cashLogs.createdAt, start));
      }
    }

    if (toDate) {
      const end = new Date(toDate.includes("T") ? toDate : `${toDate}T23:59:59.999Z`);
      if (!isNaN(end.getTime())) {
        cashLogConditions.push(lte(cashLogs.createdAt, end));
      }
    }

    // 3. Fetch all matching cash logs in the date range
    const logs = await db.query.cashLogs.findMany({
      where: and(...cashLogConditions),
      with: {
        machine: {
          with: {
            store: {
              with: {
                location: true,
              },
            },
          },
        },
        agent: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [desc(cashLogs.createdAt)],
    });

    // Filter logs matching tenant machines
    const validMachineIds = new Set(tenantMachines.map((m) => m.id));
    const filteredLogs = logs.filter((l) => validMachineIds.has(l.machineId));

    // Aggregate cash collected by machineId
    const cashMap = new Map<string, { totalCash: number; count: number; lastDate: string }>();
    for (const log of filteredLogs) {
      const current = cashMap.get(log.machineId) || {
        totalCash: 0,
        count: 0,
        lastDate: log.createdAt ? new Date(log.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      };
      current.totalCash += Number(log.collectedAmount || 0);
      current.count += 1;
      cashMap.set(log.machineId, current);
    }

    // 4. Construct machine payout breakdown records
    const records = tenantMachines.map((m) => {
      const cashData = cashMap.get(m.id);
      const totalCash = Number((cashData?.totalCash || 0).toFixed(2));
      const shopPercent = Number(m.store?.shopCutPercent ?? 30);
      const bizPercent = Number(m.store?.businessCutPercent ?? (100 - shopPercent));
      const shopCut = Number((totalCash * (shopPercent / 100)).toFixed(2));
      const businessCut = Number((totalCash * (bizPercent / 100)).toFixed(2));

      return {
        id: `rec-${m.id}`,
        machineId: m.serialNumber,
        storeId: m.storeId,
        storeName: m.store?.name || m.location || "Store Unit",
        locationName: m.store?.location?.name || "Venue",
        date: cashData?.lastDate || (toDate || new Date().toISOString().split("T")[0]),
        totalCash,
        shopCut,
        businessCut,
        splitRatio: `${shopPercent}% / ${bizPercent}%`,
        collectionsCount: cashData?.count || 0,
      };
    });

    // 5. Calculate summary aggregates
    const totalCollected = Number(records.reduce((sum, r) => sum + r.totalCash, 0).toFixed(2));
    const totalShopCut = Number(records.reduce((sum, r) => sum + r.shopCut, 0).toFixed(2));
    const totalBusinessCut = Number(records.reduce((sum, r) => sum + r.businessCut, 0).toFixed(2));

    return reply.send({
      statusCode: 200,
      data: {
        summary: {
          totalCollected,
          totalShopCut,
          totalBusinessCut,
          collectionsCount: filteredLogs.length,
          machinesCount: records.length,
          fromDate: fromDate || null,
          toDate: toDate || null,
        },
        records,
        detailedLogs: filteredLogs.map((log) => ({
          id: log.id,
          createdAt: log.createdAt,
          date: log.createdAt ? new Date(log.createdAt).toISOString().split("T")[0] : "",
          machineId: log.machine?.serialNumber || log.machineId,
          storeName: log.machine?.store?.name || log.machine?.location || "Store Unit",
          locationName: log.machine?.store?.location?.name || "Venue",
          collectedAmount: Number(log.collectedAmount || 0),
          expectedAmount: Number(log.expectedAmount || 0),
          discrepancy: Number(log.discrepancy || 0),
          isShortage: Number(log.discrepancy || 0) > 0,
          stockCleared: log.stockCleared,
          remarks: log.remarks,
          agentName: log.agent?.name || "Field Agent",
        })),
      },
    });
  } catch (err: any) {
    request.log.error(err);
    return reply.status(500).send({
      statusCode: 500,
      error: "Internal Server Error",
      message: "Failed to generate reconciliation reports",
      data: {
        summary: {
          totalCollected: 0,
          totalShopCut: 0,
          totalBusinessCut: 0,
          collectionsCount: 0,
          machinesCount: 0,
        },
        records: [],
        detailedLogs: [],
      },
    });
  }
}

/**
 * Direct Log Reversal / Undo Handler:
 * Reverses a single, specific inventory log identified by `logId`. The server — not the
 * client — determines which machine/quantity/packet are affected, by reading the
 * original log itself. Guardrails enforced (all tenant-scoped):
 *   1. Cash Collect entries can never be reversed.
 *   2. Only the single, absolute most recent Restock entry for a machine may be reversed.
 *   3. A REVERSE entry can never itself be reversed, and a log cannot be reversed twice.
 *   4. Reversal always negates the original quantity exactly once (no compounding sign bugs).
 * On any failure — validation or database — a proper HTTP error is returned. Nothing is
 * ever reported as a fake success.
 */
export async function reverseEntryHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const tenantId = request.tenantId;
  const agentId = request.userId;

  const parseResult = ReverseEntrySchema.safeParse(request.body);

  if (!parseResult.success) {
    return reply.status(400).send({
      statusCode: 400,
      error: "Bad Request",
      message: "Validation failed",
      issues: parseResult.error.issues,
    });
  }

  const { logId, remarks } = parseResult.data;

  // Distinguish "not found" from "this is a Cash Collect entry" for a clear error message.
  const candidateLog = await db.query.inventoryLogs.findFirst({
    where: and(eq(inventoryLogs.id, logId), eq(inventoryLogs.tenantId, tenantId)),
  });

  if (!candidateLog) {
    const cashLogMatch = await db.query.cashLogs.findFirst({
      where: and(eq(cashLogs.id, logId), eq(cashLogs.tenantId, tenantId)),
    });

    if (cashLogMatch) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "Cash Collect entries cannot be reversed",
      });
    }

    return reply.status(404).send({
      statusCode: 404,
      error: "Not Found",
      message: "Inventory log entry not found in your organization",
    });
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Lock the machine row for the duration of the transaction so concurrent reversal
      // attempts against the same machine serialize instead of racing past each other.
      const [lockedMachine] = await tx
        .select({ id: machines.id })
        .from(machines)
        .where(and(eq(machines.id, candidateLog.machineId), eq(machines.tenantId, tenantId)))
        .for("update");

      if (!lockedMachine) {
        throw new ReversalError(404, "Machine not found in your organization");
      }

      // Re-fetch inside the lock: authoritative, race-free view of the log.
      const originalLog = await tx.query.inventoryLogs.findFirst({
        where: and(eq(inventoryLogs.id, logId), eq(inventoryLogs.tenantId, tenantId)),
      });

      if (!originalLog) {
        throw new ReversalError(404, "Inventory log entry not found in your organization");
      }

      if (originalLog.entryType === "REVERSE") {
        throw new ReversalError(400, "A reversal entry cannot itself be reversed");
      }

      if (originalLog.quantityAdded <= 0) {
        throw new ReversalError(400, "Only a positive Restock entry can be reversed");
      }

      const alreadyReversed = await tx.query.inventoryLogs.findFirst({
        where: and(
          eq(inventoryLogs.tenantId, tenantId),
          eq(inventoryLogs.reversedLogId, originalLog.id)
        ),
      });

      if (alreadyReversed) {
        throw new ReversalError(409, "This entry has already been reversed");
      }

      // The absolute most recent Restock (STANDARD or MANUAL, positive quantity) entry
      // for this machine — must be exactly the entry being reversed.
      const mostRecentRestock = await tx.query.inventoryLogs.findFirst({
        where: and(
          eq(inventoryLogs.tenantId, tenantId),
          eq(inventoryLogs.machineId, originalLog.machineId),
          or(eq(inventoryLogs.entryType, "STANDARD"), eq(inventoryLogs.entryType, "MANUAL")),
          gt(inventoryLogs.quantityAdded, 0)
        ),
        orderBy: [desc(inventoryLogs.createdAt)],
      });

      if (!mostRecentRestock || mostRecentRestock.id !== originalLog.id) {
        throw new ReversalError(
          400,
          "Only the most recent Restock entry for this machine can be reversed"
        );
      }

      const [reversalLog] = await tx
        .insert(inventoryLogs)
        .values({
          tenantId,
          machineId: originalLog.machineId,
          agentId,
          packetId: originalLog.packetId,
          entryType: "REVERSE",
          quantityAdded: -originalLog.quantityAdded,
          reversedLogId: originalLog.id,
          remarks: `[REVERSAL of ${originalLog.id}] ${remarks}`,
        })
        .returning();

      const [updatedMachine] = await tx
        .update(machines)
        .set({ updatedAt: new Date() })
        .where(and(eq(machines.id, originalLog.machineId), eq(machines.tenantId, tenantId)))
        .returning();

      return { reversalLog, updatedMachine };
    });

    return reply.status(201).send({
      statusCode: 201,
      message: "Inventory reversal entry recorded successfully",
      data: {
        logId: result.reversalLog.id,
        machineId: result.updatedMachine.id,
        entryType: result.reversalLog.entryType,
        quantityAdded: result.reversalLog.quantityAdded,
        remarks: result.reversalLog.remarks,
        createdAt: result.reversalLog.createdAt,
      },
    });
  } catch (err) {
    if (err instanceof ReversalError) {
      return reply.status(err.statusCode).send({
        statusCode: err.statusCode,
        error:
          err.statusCode === 404 ? "Not Found" : err.statusCode === 409 ? "Conflict" : "Bad Request",
        message: err.message,
      });
    }

    request.log.error(err);
    return reply.status(500).send({
      statusCode: 500,
      error: "Internal Server Error",
      message: "Failed to process inventory reversal",
    });
  }
}
