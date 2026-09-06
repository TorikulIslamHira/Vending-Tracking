import { FastifyReply, FastifyRequest } from "fastify";
import { eq, desc } from "drizzle-orm";
import { PacketConfigCreateSchema } from "@vending/validation";
import { db, packetConfigs } from "../../core/db";

/**
 * Get all Packet Configurations for authenticated tenant
 */
export async function getPacketsHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const tenantId = request.tenantId;

  const packets = await db.query.packetConfigs.findMany({
    where: eq(packetConfigs.tenantId, tenantId),
    orderBy: [desc(packetConfigs.createdAt)],
  });

  return reply.send({
    statusCode: 200,
    data: packets.map((p) => ({
      id: p.id,
      tenantId: p.tenantId,
      name: p.name,
      brand: p.brand,
      quantityPerPacket: p.quantityPerPacket,
      pricePerItem: Number(p.pricePerItem || 0),
      packetCost: Number(p.packetCost || 0),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
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

  const { name, brand, quantityPerPacket, pricePerItem, packetCost } = parseResult.data;

  const [packet] = await db
    .insert(packetConfigs)
    .values({
      tenantId,
      name,
      brand,
      quantityPerPacket,
      pricePerItem: String(pricePerItem),
      packetCost: packetCost !== undefined && packetCost !== null ? String(packetCost) : "0.00",
    })
    .returning();

  return reply.status(201).send({
    statusCode: 201,
    message: "Packet configuration created successfully",
    data: {
      ...packet,
      pricePerItem: Number(packet.pricePerItem || 0),
      packetCost: Number(packet.packetCost || 0),
    },
  });
}
