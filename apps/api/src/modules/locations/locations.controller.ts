import { FastifyReply, FastifyRequest } from "fastify";
import { eq, and, desc } from "drizzle-orm";
import { db, locations, machines } from "../../core/db";

export async function getLocationsHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const tenantId = request.tenantId;

  if (!tenantId) {
    return reply.status(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: "Missing tenant identification",
    });
  }

  try {
    const [locationList, machineList] = await Promise.all([
      db.query.locations.findMany({
        where: eq(locations.tenantId, tenantId),
        with: {
          stores: true,
        },
        orderBy: [desc(locations.createdAt)],
      }),
      db
        .select({ location: machines.location })
        .from(machines)
        .where(eq(machines.tenantId, tenantId)),
    ]);

    const formatted = locationList.map((loc) => {
      const machineCount = machineList.filter(
        (m) =>
          m.location.toLowerCase() === loc.name.toLowerCase() ||
          m.location.toLowerCase().includes(loc.name.toLowerCase())
      ).length;

      return {
        id: loc.id,
        name: loc.name,
        address: loc.address || "Commercial Zone",
        storeCount: loc.stores?.length ?? 0,
        machineCount,
        status: "ACTIVE" as const,
        createdAt: loc.createdAt,
      };
    });

    return reply.send({
      statusCode: 200,
      data: formatted,
    });
  } catch (error: any) {
    return reply.status(500).send({
      statusCode: 500,
      error: "Internal Server Error",
      message: error.message || "Failed to fetch locations",
      data: [],
    });
  }
}

export async function getLocationByIdHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const tenantId = request.tenantId;
  const { id } = request.params;

  if (!tenantId) {
    return reply.status(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: "Missing tenant identification",
    });
  }

  try {
    const location = await db.query.locations.findFirst({
      where: and(eq(locations.id, id), eq(locations.tenantId, tenantId)),
    });

    if (!location) {
      return reply.status(404).send({
        statusCode: 404,
        error: "Not Found",
        message: "Location not found",
      });
    }

    return reply.send({
      statusCode: 200,
      data: location,
    });
  } catch (error: any) {
    return reply.status(500).send({
      statusCode: 500,
      error: "Internal Server Error",
      message: error.message || "Failed to fetch location",
    });
  }
}

export async function createLocationHandler(
  request: FastifyRequest<{
    Body: { name: string; address?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const tenantId = request.tenantId;

  if (!tenantId) {
    return reply.status(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: "Missing tenant identification",
    });
  }

  const { name, address } = request.body || {};

  if (!name || typeof name !== "string" || !name.trim()) {
    return reply.status(400).send({
      statusCode: 400,
      error: "Bad Request",
      message: "Location name is required",
    });
  }

  try {
    const [location] = await db
      .insert(locations)
      .values({
        tenantId,
        name: name.trim(),
        address: address ? address.trim() : null,
      })
      .returning();

    return reply.status(201).send({
      statusCode: 201,
      message: "Location created successfully",
      data: {
        id: location.id,
        name: location.name,
        address: location.address || "Commercial Zone",
        storeCount: 0,
        machineCount: 0,
        status: "ACTIVE",
        createdAt: location.createdAt,
      },
    });
  } catch (error: any) {
    return reply.status(500).send({
      statusCode: 500,
      error: "Internal Server Error",
      message: error.message || "Failed to create location",
    });
  }
}

export async function updateLocationHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { name: string; address?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const tenantId = request.tenantId;
  const { id } = request.params;
  const { name, address } = request.body || {};

  if (!tenantId) {
    return reply.status(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: "Missing tenant identification",
    });
  }

  if (!name || typeof name !== "string" || !name.trim()) {
    return reply.status(400).send({
      statusCode: 400,
      error: "Bad Request",
      message: "Location name is required",
    });
  }

  try {
    const updated = await db
      .update(locations)
      .set({
        name: name.trim(),
        address: address ? address.trim() : null,
      })
      .where(and(eq(locations.id, id), eq(locations.tenantId, tenantId)))
      .returning();

    if (updated.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: "Not Found",
        message: "Location not found or unauthorized",
      });
    }

    return reply.send({
      statusCode: 200,
      message: "Location updated successfully",
      data: { id, name, address },
    });
  } catch (error: any) {
    return reply.status(500).send({
      statusCode: 500,
      error: "Internal Server Error",
      message: error.message || "Failed to update location",
    });
  }
}
