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

  const [packet] = await db
    .insert(packetConfigs)
    .values({
      tenantId,
      name,
      brand,
      quantityPerPacket,
      pricePerItem: String(pricePerItem),
    })
    .returning();

  return reply.status(201).send({
    statusCode: 201,
    message: "Packet configuration created successfully",
    data: packet,
  });
}
