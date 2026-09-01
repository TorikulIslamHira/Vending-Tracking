import { FastifyInstance } from "fastify";
import { tenantHandler } from "../../core/middlewares/tenantHandler";
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

  // Direct stores endpoints
  app.get("/", getAllStoresHandler);
  app.get("/:id", getStoreByIdHandler);
  app.post("/", createStoreHandler);
  app.put("/:id", updateStoreHandler);
  app.delete("/:id", deleteStoreHandler);
}

export async function locationStoresRoutes(app: FastifyInstance): Promise<void> {
  // Apply tenant authentication hook
  app.addHook("onRequest", tenantHandler);

  // Nested routes under /locations/:locationId/stores
  app.get("/:locationId/stores", getStoresByLocationHandler);
  app.post("/:locationId/stores", createStoreHandler);
}
