import { FastifyInstance } from "fastify";
import { getAuditLogsHandler } from "./audit.controller";
import { tenantHandler } from "../../core/middlewares/tenantHandler";
import { requireRole } from "../../core/middlewares/rbac";
import { UserRole } from "@vending/shared-types";

export async function auditRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", tenantHandler);

  app.get("/", { onRequest: [requireRole(UserRole.ADMIN)] }, getAuditLogsHandler);
}

export default auditRoutes;
