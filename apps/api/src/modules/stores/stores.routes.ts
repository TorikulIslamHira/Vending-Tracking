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
} from "./stores.controller";

export async function storesRoutes(app: FastifyInstance): Promise<void> {
  // Apply tenant authentication hook to all store routes
  app.addHook("onRequest", tenantHandler);

  // Reads are open to any authenticated tenant user (field agents need to
  // browse stores); mutations are ADMIN-only, matching the machines module's
  // create/delete pattern.
  app.get("/", getAllStoresHandler);
  app.get("/:id", getStoreByIdHandler);
  app.post<{ Body: unknown }>(
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

export default storesRoutes;
