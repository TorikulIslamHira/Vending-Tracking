import { FastifyReply, FastifyRequest } from "fastify";
import { PacketConfigCreateSchema } from "@vending/validation";
import { prisma } from "../../core/prisma";

/**
 * Get all Packet Configurations for authenticated tenant
 */
export async function getPacketsHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const tenantId = request.tenantId;

  const packets = await prisma.packetConfig.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  return reply.send({
    statusCode: 200,
    data: packets,
  });
}

/**
 * Create a new Packet Configuration (Admin Master Data)
 */
export async function createPacketHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const tenantId = request.tenantId;

  const parseResult = PacketConfigCreateSchema.safeParse(request.body);

  if (!parseResult.success) {
    return reply.status(400).send({
      statusCode: 400,
      error: "Bad Request",
      message: "Validation failed",
      issues: parseResult.error.issues,
    });
  }

  const { name, brand, quantityPerPacket, pricePerItem } = parseResult.data;

  const packet = await prisma.packetConfig.create({
    data: {
      tenantId,
      name,
      brand,
      quantityPerPacket,
      pricePerItem,
    },
  });

  return reply.status(201).send({
    statusCode: 201,
    message: "Packet configuration created successfully",
    data: packet,
  });
}
