import { FastifyInstance } from "fastify";
import {
  standardRestockHandler,
  manualRestockHandler,
  cashCollectionHandler,
  getInventoryLogsHandler,
  getMyLogsHandler,
  getCashLogsHandler,
  getReportsHandler,
  reverseEntryHandler,
} from "./inventory.controller";
import { tenantHandler } from "../../core/middlewares/tenantHandler";
import { requireRole } from "../../core/middlewares/rbac";
import { UserRole } from "@vending/shared-types";

export async function inventoryRoutes(app: FastifyInstance): Promise<void> {
  // Attach tenant authentication middleware to all inventory routes
  app.addHook("onRequest", tenantHandler);

  app.get("/logs", getInventoryLogsHandler);
  app.get("/logs/me", getMyLogsHandler);
  app.get("/cash-logs", getCashLogsHandler);
  app.get("/reports", getReportsHandler);
  app.post("/restock/standard", standardRestockHandler);
  app.post("/restock/manual", manualRestockHandler);
  // Field agents must be able to self-correct restock typos on-site, so both roles are allowed.
  app.post(
    "/reverse",
    { onRequest: [requireRole(UserRole.ADMIN, UserRole.FIELD_AGENT)] },
    reverseEntryHandler
  );
  app.post("/cash-collection", cashCollectionHandler);
}

export default inventoryRoutes;
