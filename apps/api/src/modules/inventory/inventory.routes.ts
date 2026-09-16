import { FastifyInstance } from "fastify";
import {
  standardRestockHandler,
  manualRestockHandler,
  cashCollectionHandler,
  updateCashLogPaymentHandler,
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
  // Restocking and cash collection are core field-agent duties performed
  // on-site, so both roles are explicitly allowed (previously had no role
  // check at all, which happened to work the same but left the door open to
  // any future role slipping through unnoticed).
  app.post(
    "/restock/standard",
    { onRequest: [requireRole(UserRole.ADMIN, UserRole.FIELD_AGENT)] },
    standardRestockHandler
  );
  app.post(
    "/restock/manual",
    { onRequest: [requireRole(UserRole.ADMIN, UserRole.FIELD_AGENT)] },
    manualRestockHandler
  );
  // Field agents must be able to self-correct restock typos on-site, so both roles are allowed.
  app.post(
    "/reverse",
    { onRequest: [requireRole(UserRole.ADMIN, UserRole.FIELD_AGENT)] },
    reverseEntryHandler
  );
  app.post(
    "/cash-collection",
    { onRequest: [requireRole(UserRole.ADMIN, UserRole.FIELD_AGENT)] },
    cashCollectionHandler
  );
  app.patch<{ Params: { id: string } }>(
    "/cash-logs/:id/payment",
    { onRequest: [requireRole(UserRole.ADMIN, UserRole.FIELD_AGENT)] },
    updateCashLogPaymentHandler
  );
}

export default inventoryRoutes;
