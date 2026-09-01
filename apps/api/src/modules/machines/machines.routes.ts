import { FastifyInstance } from "fastify";
import {
  getMachinesHandler,
  getMachineByIdHandler,
  createMachineHandler,
  getDashboardMetricsHandler,
} from "./machines.controller";
import { tenantHandler } from "../../core/middlewares/tenantHandler";

export async function machineRoutes(app: FastifyInstance): Promise<void> {
  // Attach tenant authentication middleware to all machine routes
  app.addHook("onRequest", tenantHandler);

  app.get("/", getMachinesHandler);
  app.get("/metrics", getDashboardMetricsHandler);
  app.get("/:id", getMachineByIdHandler);
  app.post("/", createMachineHandler);
}

export default machineRoutes;
