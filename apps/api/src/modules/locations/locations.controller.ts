import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../core/prisma";

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
    const [locations, machines] = await Promise.all([
      prisma.location.findMany({
        where: { tenantId },
        include: {
          _count: {
            select: { stores: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.machine.findMany({
        where: { tenantId },
        select: { location: true },
      }),
    ]);

    const formatted = locations.map((loc) => {
      const machineCount = machines.filter(
        (m) =>
          m.location.toLowerCase() === loc.name.toLowerCase() ||
          m.location.toLowerCase().includes(loc.name.toLowerCase())
      ).length;

      return {
        id: loc.id,
        name: loc.name,
        address: loc.address || "Commercial Zone",
        storeCount: loc._count?.stores ?? 0,
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
    const location = await prisma.location.findFirst({
      where: {
        id,
        tenantId,
      },
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
    const location = await prisma.location.create({
      data: {
        tenantId,
        name: name.trim(),
        address: address ? address.trim() : null,
      },
    });

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
    const updated = await prisma.location.updateMany({
      where: {
        id,
        tenantId,
      },
      data: {
        name: name.trim(),
        address: address ? address.trim() : null,
      },
    });

    if (updated.count === 0) {
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
