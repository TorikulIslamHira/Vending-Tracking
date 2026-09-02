import { FastifyReply, FastifyRequest } from "fastify";
import { eq, and, desc } from "drizzle-orm";
import { db, stores, locations, machines } from "../../core/db";

export async function getStoresByLocationHandler(
  request: FastifyRequest<{ Params: { locationId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const tenantId = request.tenantId;
  const { locationId } = request.params;

  if (!tenantId) {
    return reply.status(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: "Missing tenant identification",
    });
  }

  try {
    const [location, storeList, machineList] = await Promise.all([
      db.query.locations.findFirst({
        where: and(eq(locations.id, locationId), eq(locations.tenantId, tenantId)),
      }),
      db.query.stores.findMany({
        where: and(eq(stores.locationId, locationId), eq(stores.tenantId, tenantId)),
        orderBy: [desc(stores.createdAt)],
      }),
      db
        .select({ location: machines.location })
        .from(machines)
        .where(eq(machines.tenantId, tenantId)),
    ]);

    if (!location) {
      return reply.status(404).send({
        statusCode: 404,
        error: "Not Found",
        message: "Location not found or unauthorized",
      });
    }

    const formattedStores = storeList.map((st) => {
      const machineCount = machineList.filter(
        (m) =>
          m.location.toLowerCase() === st.name.toLowerCase() ||
          m.location.toLowerCase().includes(st.name.toLowerCase()) ||
          m.location.toLowerCase().includes(location.name.toLowerCase())
      ).length;

      return {
        id: st.id,
        name: st.name,
        category: st.category || "Novelty Vending",
        shopCutPercent: st.shopCutPercent,
        businessCutPercent: st.businessCutPercent,
        machineCount,
        createdAt: st.createdAt,
      };
    });

    return reply.send({
      statusCode: 200,
      data: {
        locationName: location.name,
        address: location.address || "Commercial Zone",
        stores: formattedStores,
      },
    });
  } catch (error: any) {
    return reply.status(500).send({
      statusCode: 500,
      error: "Internal Server Error",
      message: error.message || "Failed to fetch stores for location",
    });
  }
}

export async function getAllStoresHandler(
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
    const [storeList, machineList] = await Promise.all([
      db.query.stores.findMany({
        where: eq(stores.tenantId, tenantId),
        with: {
          location: true,
        },
        orderBy: [desc(stores.createdAt)],
      }),
      db
        .select({ location: machines.location })
        .from(machines)
        .where(eq(machines.tenantId, tenantId)),
    ]);

    const formattedStores = storeList.map((st) => {
      const machineCount = machineList.filter(
        (m) =>
          m.location.toLowerCase() === st.name.toLowerCase() ||
          m.location.toLowerCase().includes(st.name.toLowerCase()) ||
          (st.location && m.location.toLowerCase().includes(st.location.name.toLowerCase()))
      ).length;

      return {
        id: st.id,
        name: st.name,
        category: st.category || "Novelty Vending",
        locationId: st.locationId,
        locationName: st.location?.name || "Assigned Location",
        shopCutPercent: st.shopCutPercent,
        businessCutPercent: st.businessCutPercent,
        machineCount,
        createdAt: st.createdAt,
      };
    });

    return reply.send({
      statusCode: 200,
      data: formattedStores,
    });
  } catch (error: any) {
    return reply.status(500).send({
      statusCode: 500,
      error: "Internal Server Error",
      message: error.message || "Failed to fetch stores",
    });
  }
}

export async function getStoreByIdHandler(
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
    const store = await db.query.stores.findFirst({
      where: and(eq(stores.id, id), eq(stores.tenantId, tenantId)),
      with: {
        location: true,
      },
    });

    if (!store) {
      return reply.status(404).send({
        statusCode: 404,
        error: "Not Found",
        message: "Store not found",
      });
    }

    return reply.send({
      statusCode: 200,
      data: {
        id: store.id,
        name: store.name,
        category: store.category || "Novelty Vending",
        locationId: store.locationId,
        locationName: store.location?.name || "Assigned Location",
        locationAddress: store.location?.address || "Commercial Zone",
        shopCutPercent: store.shopCutPercent,
        businessCutPercent: store.businessCutPercent,
        createdAt: store.createdAt,
      },
    });
  } catch (error: any) {
    return reply.status(500).send({
      statusCode: 500,
      error: "Internal Server Error",
      message: error.message || "Failed to fetch store",
    });
  }
}

export async function createStoreHandler(
  request: FastifyRequest<{
    Params?: { locationId?: string };
    Body: {
      name: string;
      locationId?: string;
      category?: string;
      shopCutPercent?: number;
      businessCutPercent?: number;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const tenantId = request.tenantId;
  const targetLocationId = request.params?.locationId || request.body?.locationId;
  const { name, category, shopCutPercent } = request.body || {};

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
      message: "Store name is required",
    });
  }

  if (!targetLocationId) {
    return reply.status(400).send({
      statusCode: 400,
      error: "Bad Request",
      message: "Location ID is required",
    });
  }

  try {
    // Verify location belongs to tenant
    const location = await db.query.locations.findFirst({
      where: and(eq(locations.id, targetLocationId), eq(locations.tenantId, tenantId)),
    });

    if (!location) {
      return reply.status(404).send({
        statusCode: 404,
        error: "Not Found",
        message: "Location not found or unauthorized",
      });
    }

    const shopCut =
      typeof shopCutPercent === "number" ? Math.max(0, Math.min(100, shopCutPercent)) : 30;
    const bizCut = 100 - shopCut;

    const [store] = await db
      .insert(stores)
      .values({
        tenantId,
        locationId: targetLocationId,
        name: name.trim(),
        category: category ? category.trim() : "Novelty Vending",
        shopCutPercent: shopCut,
        businessCutPercent: bizCut,
      })
      .returning();

    return reply.status(201).send({
      statusCode: 201,
      message: "Store created successfully",
      data: {
        id: store.id,
        name: store.name,
        category: store.category,
        locationId: store.locationId,
        shopCutPercent: store.shopCutPercent,
        businessCutPercent: store.businessCutPercent,
        machineCount: 0,
        createdAt: store.createdAt,
      },
    });
  } catch (error: any) {
    return reply.status(500).send({
      statusCode: 500,
      error: "Internal Server Error",
      message: error.message || "Failed to create store",
    });
  }
}

export async function updateStoreHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      name?: string;
      category?: string;
      shopCutPercent?: number;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const tenantId = request.tenantId;
  const { id } = request.params;
  const { name, category, shopCutPercent } = request.body || {};

  if (!tenantId) {
    return reply.status(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: "Missing tenant identification",
    });
  }

  try {
    const existing = await db.query.stores.findFirst({
      where: and(eq(stores.id, id), eq(stores.tenantId, tenantId)),
    });

    if (!existing) {
      return reply.status(404).send({
        statusCode: 404,
        error: "Not Found",
        message: "Store not found or unauthorized",
      });
    }

    const dataToUpdate: any = {};
    if (name && typeof name === "string" && name.trim()) {
      dataToUpdate.name = name.trim();
    }
    if (category !== undefined) {
      dataToUpdate.category = category.trim();
    }
    if (typeof shopCutPercent === "number") {
      const shopCut = Math.max(0, Math.min(100, shopCutPercent));
      dataToUpdate.shopCutPercent = shopCut;
      dataToUpdate.businessCutPercent = 100 - shopCut;
    }

    const [updated] = await db
      .update(stores)
      .set(dataToUpdate)
      .where(and(eq(stores.id, id), eq(stores.tenantId, tenantId)))
      .returning();

    return reply.send({
      statusCode: 200,
      message: "Store updated successfully",
      data: {
        id: updated.id,
        name: updated.name,
        category: updated.category,
        shopCutPercent: updated.shopCutPercent,
        businessCutPercent: updated.businessCutPercent,
      },
    });
  } catch (error: any) {
    return reply.status(500).send({
      statusCode: 500,
      error: "Internal Server Error",
      message: error.message || "Failed to update store",
    });
  }
}

export async function deleteStoreHandler(
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
    const deleted = await db
      .delete(stores)
      .where(and(eq(stores.id, id), eq(stores.tenantId, tenantId)))
      .returning();

    if (deleted.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: "Not Found",
        message: "Store not found or unauthorized",
      });
    }

    return reply.send({
      statusCode: 200,
      message: "Store deleted successfully",
    });
  } catch (error: any) {
    return reply.status(500).send({
      statusCode: 500,
      error: "Internal Server Error",
      message: error.message || "Failed to delete store",
    });
  }
}
