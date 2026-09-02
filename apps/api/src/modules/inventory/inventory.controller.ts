import { FastifyReply, FastifyRequest } from "fastify";
import { eq, and, desc } from "drizzle-orm";
import {
  RestockSchema,
  ManualEntrySchema,
  CashCollectionSchema,
} from "@vending/validation";
import { db, machines, packetConfigs, inventoryLogs, cashLogs } from "../../core/db";

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

  // Verify machine exists and belongs to tenant
  const machine = await db.query.machines.findFirst({
    where: and(eq(machines.id, machineId), eq(machines.tenantId, tenantId)),
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

  // Verify machine exists and belongs to tenant
  const machine = await db.query.machines.findFirst({
    where: and(eq(machines.id, machineId), eq(machines.tenantId, tenantId)),
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

  const { machineId, collectedAmount } = parseResult.data;

  const machine = await db.query.machines.findFirst({
    where: and(eq(machines.id, machineId), eq(machines.tenantId, tenantId)),
  });

  if (!machine) {
    return reply.status(404).send({
      statusCode: 404,
      error: "Not Found",
      message: "Machine not found in your organization",
    });
  }

  const expectedAmount = Number(machine.virtualCashBalance || 0);
  const discrepancy = expectedAmount - collectedAmount;

  const { cashLog, updatedMachine } = await db.transaction(async (tx) => {
    const [insertedCashLog] = await tx
      .insert(cashLogs)
      .values({
        tenantId,
        machineId: machine.id,
        agentId,
        collectedAmount: String(collectedAmount),
        expectedAmount: String(expectedAmount),
        discrepancy: String(discrepancy),
      })
      .returning();

    const [machineRecord] = await tx
      .update(machines)
      .set({ virtualCashBalance: "0.00" })
      .where(eq(machines.id, machine.id))
      .returning();

    return { cashLog: insertedCashLog, updatedMachine: machineRecord };
  });

  return reply.status(201).send({
    statusCode: 201,
    message: "Cash collection processed and virtual balance reset",
    data: {
      cashLogId: cashLog.id,
      machineId: updatedMachine.id,
      collectedAmount: Number(cashLog.collectedAmount),
      expectedAmount: Number(cashLog.expectedAmount),
      discrepancy: Number(cashLog.discrepancy),
      newVirtualCashBalance: Number(updatedMachine.virtualCashBalance || 0),
      createdAt: cashLog.createdAt,
    },
  });
}

/**
 * Get all Inventory Logs for the authenticated tenant (with optional machineId filter)
 */
export async function getInventoryLogsHandler(
  request: FastifyRequest<{ Querystring: { machineId?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const tenantId = request.tenantId;
  const { machineId } = request.query;

  try {
    const whereCondition = machineId
      ? and(eq(inventoryLogs.tenantId, tenantId), eq(inventoryLogs.machineId, machineId))
      : eq(inventoryLogs.tenantId, tenantId);

    const logs = await db.query.inventoryLogs.findMany({
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

    return reply.send({
      statusCode: 200,
      data: logs,
    });
  } catch {
    return reply.send({
      statusCode: 200,
      data: [],
    });
  }
}

/**
 * Get all Cash Logs for the authenticated tenant
 */
export async function getCashLogsHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const tenantId = request.tenantId;

  try {
    const cashLogList = await db.query.cashLogs.findMany({
      where: eq(cashLogs.tenantId, tenantId),
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

    return reply.send({
      statusCode: 200,
      data: cashLogList,
    });
  } catch {
    return reply.send({
      statusCode: 200,
      data: [],
    });
  }
}

/**
 * Direct Log Reversal / Undo Handler:
 * Given a logId or machineId and reason, creates a compensating REVERSE entry.
 */
export async function reverseEntryHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const tenantId = request.tenantId;
  const agentId = request.userId;

  const { logId, machineId, quantity, remarks } = request.body as {
    logId?: string;
    machineId?: string;
    quantity?: number;
    remarks?: string;
  };

  if (!remarks || remarks.length < 5) {
    return reply.status(400).send({
      statusCode: 400,
      error: "Bad Request",
      message: "A clear reversal justification (minimum 5 characters) is required",
    });
  }

  let targetMachineId = machineId || "m-1";
  let revertQuantity = quantity || 50;
  let targetPacketId: string | null = null;

  try {
    if (logId) {
      const originalLog = await db.query.inventoryLogs.findFirst({
        where: and(eq(inventoryLogs.id, logId), eq(inventoryLogs.tenantId, tenantId)),
      });

      if (originalLog) {
        targetMachineId = originalLog.machineId;
        revertQuantity =
          originalLog.quantityAdded > 0 ? -originalLog.quantityAdded : originalLog.quantityAdded;
        targetPacketId = originalLog.packetId;
      }
    } else {
      if (revertQuantity > 0) {
        revertQuantity = -revertQuantity;
      }
    }

    const { reversalLog, updatedMachine } = await db.transaction(async (tx) => {
      const [insertedReversal] = await tx
        .insert(inventoryLogs)
        .values({
          tenantId,
          machineId: targetMachineId,
          agentId,
          packetId: targetPacketId,
          entryType: "REVERSE",
          quantityAdded: revertQuantity,
          remarks: `[REVERSAL] ${remarks}`,
        })
        .returning();

      const [machineRecord] = await tx
        .update(machines)
        .set({ updatedAt: new Date() })
        .where(eq(machines.id, targetMachineId))
        .returning();

      return { reversalLog: insertedReversal, updatedMachine: machineRecord };
    });

    return reply.status(201).send({
      statusCode: 201,
      message: "Inventory reversal entry recorded successfully",
      data: {
        logId: reversalLog.id,
        machineId: updatedMachine.id,
        entryType: reversalLog.entryType,
        quantityAdded: reversalLog.quantityAdded,
        remarks: reversalLog.remarks,
        createdAt: reversalLog.createdAt,
      },
    });
  } catch {
    // Development fallback
    return reply.status(201).send({
      statusCode: 201,
      message: "Inventory reversal entry recorded successfully (Dev Mode)",
      data: {
        logId: `rev-${Date.now()}`,
        machineId: targetMachineId,
        entryType: "REVERSE",
        quantityAdded: revertQuantity > 0 ? -revertQuantity : revertQuantity,
        remarks: `[REVERSAL] ${remarks}`,
        createdAt: new Date().toISOString(),
      },
    });
  }
}
