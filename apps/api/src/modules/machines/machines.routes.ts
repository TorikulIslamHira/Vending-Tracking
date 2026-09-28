import { FastifyInstance } from "fastify";
import {
  getMachinesHandler,
  getMachineByIdHandler,
  createMachineHandler,
  getDashboardMetricsHandler,
  deleteMachineHandler,
  updateMachineHandler,
  resolveIssueHandler,
  getMachineIssuesHandler,
} from "./machines.controller";
import { tenantHandler } from "../../core/middlewares/tenantHandler";
import { requireRole } from "../../core/middlewares/rbac";
import { UserRole } from "@vending/shared-types";

export async function machineRoutes(app: FastifyInstance): Promise<void> {
  // Attach tenant authentication middleware to all machine routes
  app.addHook("onRequest", tenantHandler);

  app.get("/", getMachinesHandler);
  app.get("/metrics", getDashboardMetricsHandler);
  app.get("/:id", getMachineByIdHandler);
  app.post("/", { onRequest: [requireRole(UserRole.ADMIN)] }, createMachineHandler);
  app.delete<{ Params: { id: string }; Body: { password: string } }>(
    "/:id",
    { onRequest: [requireRole(UserRole.ADMIN)] },
    deleteMachineHandler
  );
  // Not admin-gated: a Field Agent edits a key number or resolves an issue
  // on-site the same as they already report cash collections/issues.
  app.put<{ Params: { id: string }; Body: unknown }>("/:id", updateMachineHandler);
  app.patch<{ Params: { id: string }; Body: unknown }>("/:id/resolve-issue", resolveIssueHandler);
  app.get<{ Params: { id: string } }>("/:id/issues", getMachineIssuesHandler);
}

export default machineRoutes;
