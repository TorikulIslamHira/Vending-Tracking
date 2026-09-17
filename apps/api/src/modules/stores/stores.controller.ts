import { FastifyReply, FastifyRequest } from "fastify";
import { eq, and, or, ne, ilike, desc, isNull } from "drizzle-orm";
import { StoreCreateSchema, StoreUpdateSchema } from "@vending/validation";
import { db, stores, locations, machines } from "../../core/db";

/**
 * Resolves the creatable location combobox's typed name to a location id —
 * reusing an existing location case-insensitively rather than creating a
 * near-duplicate (e.g. typing "Main Street" when "main street" already
 * exists reuses it instead of adding a second one). Takes `any` for the
 * transaction handle — Drizzle's full transaction type with the relational
 * query builder attached isn't easily nameable outside the callback that
 * creates it (see machines/virtualCashBalance.service.ts's own QueryExecutor
 * alias for the same tradeoff with a plain PgDatabase, which drops
 * `.query.*` typing entirely).
 */
async function resolveOrCreateLocation(
  tx: any,
  tenantId: string,
  name: string
): Promise<string> {
  const trimmed = name.trim();
  const existing = await tx.query.locations.findFirst({
    where: and(eq(locations.tenantId, tenantId), ilike(locations.name, trimmed)),
  });
  if (existing) {
    return existing.id;
  }
  const [created] = await tx.insert(locations).values({ tenantId, name: trimmed }).returning();
  return created.id;
}

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
    const [location, storeList] = await Promise.all([
      db.query.locations.findFirst({
        where: and(eq(locations.id, locationId), eq(locations.tenantId, tenantId)),
      }),
      db.query.stores.findMany({
        where: and(eq(stores.locationId, locationId), eq(stores.tenantId, tenantId)),
        with: {
          // Soft-deleted machines must never count toward machineCount.
          machines: {
            where: isNull(machines.deletedAt),
          },
        },
        orderBy: [desc(stores.createdAt)],
      }),
    ]);

    if (!location) {
      return reply.status(404).send({
        statusCode: 404,
        error: "Not Found",
        message: "Location not found or unauthorized",
      });
    }

    const formattedStores = storeList.map((st) => ({
      id: st.id,
      name: st.name,
      category: st.category || "Novelty Vending",
      shopCutPercent: st.shopCutPercent,
      businessCutPercent: st.businessCutPercent,
      eircode: st.eircode,
      paymentMode: st.paymentMode,
      qrCode: st.qrCode,
      machineCount: st.machines?.length || 0,
      machines: (st.machines || []).map((m) => ({
        id: m.id,
        serialNumber: m.serialNumber,
        category: m.category || "Standard Confectionery",
        type: m.type || "Spiral Chute",
        capacity: m.capacity || 100,
        status: m.status,
        keyNumber: m.keyNumber || "",
        qrCode: m.qrCode,
        virtualCashBalance: Number(m.virtualCashBalance || 0),
        createdAt: m.createdAt,
      })),
      createdAt: st.createdAt,
    }));

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
    const storeList = await db.query.stores.findMany({
      where: eq(stores.tenantId, tenantId),
      with: {
        location: true,
        machines: {
          where: isNull(machines.deletedAt),
        },
      },
      orderBy: [desc(stores.createdAt)],
    });

    const formattedStores = storeList.map((st) => ({
      id: st.id,
      name: st.name,
      category: st.category || "Novelty Vending",
      locationId: st.locationId,
      locationName: st.location?.name || null,
      shopCutPercent: st.shopCutPercent,
      businessCutPercent: st.businessCutPercent,
      eircode: st.eircode,
      paymentMode: st.paymentMode,
      qrCode: st.qrCode,
      machineCount: st.machines?.length || 0,
      machines: (st.machines || []).map((m) => ({
        id: m.id,
        serialNumber: m.serialNumber,
        category: m.category || "Standard Confectionery",
        type: m.type || "Spiral Chute",
        capacity: m.capacity || 100,
        status: m.status,
        keyNumber: m.keyNumber || "",
        qrCode: m.qrCode,
        virtualCashBalance: Number(m.virtualCashBalance || 0),
        createdAt: m.createdAt,
      })),
      createdAt: st.createdAt,
    }));

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
      where: and(eq(stores.tenantId, tenantId), or(eq(stores.id, id), eq(stores.qrCode, id))),
      with: {
        location: true,
        machines: {
          where: isNull(machines.deletedAt),
        },
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
        locationName: store.location?.name || null,
        locationAddress: store.location?.address || null,
        shopCutPercent: store.shopCutPercent,
        businessCutPercent: store.businessCutPercent,
        eircode: store.eircode,
        paymentMode: store.paymentMode,
        qrCode: store.qrCode,
        machineCount: store.machines?.length || 0,
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
    Body: unknown;
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

  const parseResult = StoreCreateSchema.safeParse(request.body);
  if (!parseResult.success) {
    return reply.status(400).send({
      statusCode: 400,
      error: "Bad Request",
      message: "Validation failed",
      issues: parseResult.error.issues,
    });
  }

  const { name, category, shopCutPercent, eircode, paymentMode, qrCode, newLocationName } =
    parseResult.data;
  // A store no longer requires a location — this is only ever populated when
  // one was actually supplied (via the nested route param or the body).
  const targetLocationId = request.params?.locationId || parseResult.data.locationId || null;

  try {
    // Verify the location belongs to this tenant, but only when an existing
    // one was referenced by id — a store can be created with no location at
    // all, or with a brand-new one via newLocationName (handled below).
    if (targetLocationId) {
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
    }

    // qrCode has no DB-level unique constraint (see schema.ts comment), so
    // uniqueness is enforced here instead.
    if (qrCode) {
      const existingQr = await db.query.stores.findFirst({
        where: and(eq(stores.tenantId, tenantId), eq(stores.qrCode, qrCode)),
      });
      if (existingQr) {
        return reply.status(409).send({
          statusCode: 409,
          error: "Conflict",
          message: "A store with this QR code already exists for your organization",
        });
      }
    }

    const shopCut =
      typeof shopCutPercent === "number" ? Math.max(0, Math.min(100, shopCutPercent)) : 30;
    const bizCut = 100 - shopCut;

    const store = await db.transaction(async (tx) => {
      // newLocationName (from the creatable combobox) only takes effect when
      // no existing location was explicitly selected.
      const resolvedLocationId =
        targetLocationId || (newLocationName ? await resolveOrCreateLocation(tx, tenantId, newLocationName) : null);

      const [inserted] = await tx
        .insert(stores)
        .values({
          tenantId,
          locationId: resolvedLocationId,
          name: name.trim(),
          category: category ? category.trim() : "Novelty Vending",
          shopCutPercent: shopCut,
          businessCutPercent: bizCut,
          eircode: eircode?.trim() || null,
          paymentMode,
          qrCode: qrCode || null,
        })
        .returning();
      return inserted;
    });

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
        eircode: store.eircode,
        paymentMode: store.paymentMode,
        qrCode: store.qrCode,
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
    Body: unknown;
  }>,
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

  const parseResult = StoreUpdateSchema.safeParse(request.body);
  if (!parseResult.success) {
    return reply.status(400).send({
      statusCode: 400,
      error: "Bad Request",
      message: "Validation failed",
      issues: parseResult.error.issues,
    });
  }

  const { name, category, shopCutPercent, eircode, paymentMode, qrCode, locationId, newLocationName } =
    parseResult.data;

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

    // Reassigning (not unassigning) must still point at a real location
    // owned by this tenant.
    if (locationId) {
      const location = await db.query.locations.findFirst({
        where: and(eq(locations.id, locationId), eq(locations.tenantId, tenantId)),
      });
      if (!location) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Location not found or unauthorized",
        });
      }
    }

    if (qrCode) {
      const existingQr = await db.query.stores.findFirst({
        where: and(eq(stores.tenantId, tenantId), eq(stores.qrCode, qrCode), ne(stores.id, id)),
      });
      if (existingQr) {
        return reply.status(409).send({
          statusCode: 409,
          error: "Conflict",
          message: "A store with this QR code already exists for your organization",
        });
      }
    }

    const dataToUpdate: any = {};
    if (name && name.trim()) {
      dataToUpdate.name = name.trim();
    }
    if (category !== undefined) {
      dataToUpdate.category = category?.trim() ?? null;
    }
    if (typeof shopCutPercent === "number") {
      const shopCut = Math.max(0, Math.min(100, shopCutPercent));
      dataToUpdate.shopCutPercent = shopCut;
      dataToUpdate.businessCutPercent = 100 - shopCut;
    }
    if (eircode !== undefined) {
      dataToUpdate.eircode = eircode?.trim() || null;
    }
    // newLocationName (from the creatable combobox typing a brand-new name)
    // always wins over locationId when both are present — the combobox sends
    // locationId: null alongside newLocationName when creating, which must
    // NOT be read as "unassign". Only fall back to plain locationId semantics
    // (undefined = no change, null = unassign, string = reassign) otherwise.
    if (!newLocationName && locationId !== undefined) {
      dataToUpdate.locationId = locationId;
    }
    if (paymentMode !== undefined) {
      dataToUpdate.paymentMode = paymentMode;
    }
    if (qrCode !== undefined) {
      dataToUpdate.qrCode = qrCode || null;
    }

    const updated = await db.transaction(async (tx) => {
      if (newLocationName) {
        dataToUpdate.locationId = await resolveOrCreateLocation(tx, tenantId, newLocationName);
      }

      const [row] = await tx
        .update(stores)
        .set(dataToUpdate)
        .where(and(eq(stores.id, id), eq(stores.tenantId, tenantId)))
        .returning();
      return row;
    });

    return reply.send({
      statusCode: 200,
      message: "Store updated successfully",
      data: {
        id: updated.id,
        name: updated.name,
        locationId: updated.locationId,
        category: updated.category,
        shopCutPercent: updated.shopCutPercent,
        businessCutPercent: updated.businessCutPercent,
        eircode: updated.eircode,
        paymentMode: updated.paymentMode,
        qrCode: updated.qrCode,
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
