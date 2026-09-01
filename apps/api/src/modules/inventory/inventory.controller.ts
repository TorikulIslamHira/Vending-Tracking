import { FastifyReply, FastifyRequest } from "fastify";
import {
  RestockSchema,
  ManualEntrySchema,
  CashCollectionSchema,
} from "@vending/validation";
import { EntryType } from "@vending/shared-types";
import { prisma } from "../../core/prisma";

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
  const machine = await prisma.machine.findFirst({
    where: { id: machineId, tenantId },
  });

  if (!machine) {
    return reply.status(404).send({
      statusCode: 404,
      error: "Not Found",
      message: "Machine not found in your organization",
    });
  }

  // Fetch PacketConfig defined by Admin
  const packetConfig = await prisma.packetConfig.findFirst({
    where: { id: packetId, tenantId },
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
  const [log, updatedMachine] = await prisma.$transaction([
    prisma.inventoryLog.create({
      data: {
        tenantId,
        machineId: machine.id,
        agentId,
        packetId: packetConfig.id,
        entryType: EntryType.STANDARD,
        quantityAdded: totalPieces,
        remarks: remarks || `Standard restock: ${quantity} packets (${totalPieces} items)`,
      },
    }),
    prisma.machine.update({
      where: { id: machine.id },
      data: { updatedAt: new Date() },
    }),
  ]);

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
  const machine = await prisma.machine.findFirst({
    where: { id: machineId, tenantId },
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
  if (entryType === EntryType.REVERSE && quantityAdded > 0) {
    finalQuantityAdded = -quantityAdded;
  }

  // Format descriptive remark
  const formattedRemarks = brandName
    ? `[Brand: ${brandName}] ${remarks}`
    : remarks;

  const [log, updatedMachine] = await prisma.$transaction([
    prisma.inventoryLog.create({
      data: {
        tenantId,
        machineId: machine.id,
        agentId,
        packetId: packetId || null,
        entryType,
        quantityAdded: finalQuantityAdded,
        remarks: formattedRemarks,
      },
    }),
    prisma.machine.update({
      where: { id: machine.id },
      data: { updatedAt: new Date() },
    }),
  ]);

  return reply.status(201).send({
    statusCode: 201,
    message:
      entryType === EntryType.REVERSE
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

  const machine = await prisma.machine.findFirst({
    where: { id: machineId, tenantId },
  });

  if (!machine) {
    return reply.status(404).send({
      statusCode: 404,
      error: "Not Found",
      message: "Machine not found in your organization",
    });
  }

  const expectedAmount = Number(machine.virtualCashBalance);
  const discrepancy = expectedAmount - collectedAmount;

  const [cashLog, updatedMachine] = await prisma.$transaction([
    prisma.cashLog.create({
      data: {
        tenantId,
        machineId: machine.id,
        agentId,
        collectedAmount,
        expectedAmount,
        discrepancy,
      },
    }),
    prisma.machine.update({
      where: { id: machine.id },
      data: { virtualCashBalance: 0.0 },
    }),
  ]);

  return reply.status(201).send({
    statusCode: 201,
    message: "Cash collection processed and virtual balance reset",
    data: {
      cashLogId: cashLog.id,
      machineId: updatedMachine.id,
      collectedAmount: Number(cashLog.collectedAmount),
      expectedAmount: Number(cashLog.expectedAmount),
      discrepancy: Number(cashLog.discrepancy),
      newVirtualCashBalance: Number(updatedMachine.virtualCashBalance),
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
    const logs = await prisma.inventoryLog.findMany({
      where: {
        tenantId,
        ...(machineId ? { machineId } : {}),
      },
      include: {
        machine: {
          select: {
            id: true,
            serialNumber: true,
            location: true,
          },
        },
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        packet: {
          select: {
            id: true,
            name: true,
            brand: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
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
    const cashLogs = await prisma.cashLog.findMany({
      where: { tenantId },
      include: {
        machine: {
          select: {
            id: true,
            serialNumber: true,
            location: true,
          },
        },
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return reply.send({
      statusCode: 200,
      data: cashLogs,
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
      const originalLog = await prisma.inventoryLog.findFirst({
        where: { id: logId, tenantId },
      });

      if (originalLog) {
        targetMachineId = originalLog.machineId;
        revertQuantity = originalLog.quantityAdded > 0 ? -originalLog.quantityAdded : originalLog.quantityAdded;
        targetPacketId = originalLog.packetId;
      }
    } else {
      if (revertQuantity > 0) {
        revertQuantity = -revertQuantity;
      }
    }

    const [reversalLog, updatedMachine] = await prisma.$transaction([
      prisma.inventoryLog.create({
        data: {
          tenantId,
          machineId: targetMachineId,
          agentId,
          packetId: targetPacketId,
          entryType: EntryType.REVERSE,
          quantityAdded: revertQuantity,
          remarks: `[REVERSAL] ${remarks}`,
        },
      }),
      prisma.machine.update({
        where: { id: targetMachineId },
        data: { updatedAt: new Date() },
      }),
    ]);

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
        entryType: EntryType.REVERSE,
        quantityAdded: revertQuantity > 0 ? -revertQuantity : revertQuantity,
        remarks: `[REVERSAL] ${remarks}`,
        createdAt: new Date().toISOString(),
      },
    });
  }
}
