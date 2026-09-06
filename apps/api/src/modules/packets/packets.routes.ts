import { FastifyInstance } from "fastify";
import { getPacketsHandler, createPacketHandler } from "./packets.controller";
import { tenantHandler } from "../../core/middlewares/tenantHandler";
import { requireRole } from "../../core/middlewares/rbac";
import { UserRole } from "@vending/shared-types";

export async function packetRoutes(app: FastifyInstance): Promise<void> {
  // Attach tenant authentication middleware to all packet routes
  app.addHook("onRequest", tenantHandler);

  app.get("/", getPacketsHandler);
  app.post("/", { onRequest: [requireRole(UserRole.ADMIN)] }, createPacketHandler);
}

export default packetRoutes;
