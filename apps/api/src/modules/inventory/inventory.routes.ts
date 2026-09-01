import { FastifyInstance } from "fastify";
import {
  standardRestockHandler,
  manualRestockHandler,
  cashCollectionHandler,
  getInventoryLogsHandler,
  getCashLogsHandler,
  reverseEntryHandler,
} from "./inventory.controller";
import { tenantHandler } from "../../core/middlewares/tenantHandler";

export async function inventoryRoutes(app: FastifyInstance): Promise<void> {
  // Attach tenant authentication middleware to all inventory routes
  app.addHook("onRequest", tenantHandler);

  app.get("/logs", getInventoryLogsHandler);
  app.get("/cash-logs", getCashLogsHandler);
  app.post("/restock/standard", standardRestockHandler);
  app.post("/restock/manual", manualRestockHandler);
  app.post("/reverse", reverseEntryHandler);
  app.post("/cash-collection", cashCollectionHandler);
}

export default inventoryRoutes;
