import { FastifyInstance } from "fastify";
import {
  getMachinesHandler,
  getMachineByIdHandler,
  createMachineHandler,
  getDashboardMetricsHandler,
  deleteMachineHandler,
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
}

export default machineRoutes;
