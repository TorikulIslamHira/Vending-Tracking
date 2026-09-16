import { FastifyInstance } from "fastify";
import { tenantHandler } from "../../core/middlewares/tenantHandler";
import { requireRole } from "../../core/middlewares/rbac";
import { UserRole } from "@vending/shared-types";
import {
  getAllStoresHandler,
  getStoreByIdHandler,
  createStoreHandler,
  updateStoreHandler,
  deleteStoreHandler,
  getStoresByLocationHandler,
} from "./stores.controller";

export async function storesRoutes(app: FastifyInstance): Promise<void> {
  // Apply tenant authentication hook to all store routes
  app.addHook("onRequest", tenantHandler);

  // Direct stores endpoints. Reads are open to any authenticated tenant user
  // (field agents need to browse stores); mutations are ADMIN-only, matching
  // the machines module's create/delete pattern.
  app.get("/", getAllStoresHandler);
  app.get("/:id", getStoreByIdHandler);
  app.post<{ Params?: { locationId?: string }; Body: unknown }>(
    "/",
    { onRequest: [requireRole(UserRole.ADMIN)] },
    createStoreHandler
  );
  app.put<{ Params: { id: string }; Body: unknown }>(
    "/:id",
    { onRequest: [requireRole(UserRole.ADMIN)] },
    updateStoreHandler
  );
  app.delete<{ Params: { id: string } }>(
    "/:id",
    { onRequest: [requireRole(UserRole.ADMIN)] },
    deleteStoreHandler
  );
}

export async function locationStoresRoutes(app: FastifyInstance): Promise<void> {
  // Apply tenant authentication hook
  app.addHook("onRequest", tenantHandler);

  // Nested routes under /locations/:locationId/stores
  app.get("/:locationId/stores", getStoresByLocationHandler);
  app.post<{ Params?: { locationId?: string }; Body: unknown }>(
    "/:locationId/stores",
    { onRequest: [requireRole(UserRole.ADMIN)] },
    createStoreHandler
  );
}
