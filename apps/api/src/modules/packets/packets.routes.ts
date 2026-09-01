import { FastifyInstance } from "fastify";
import { getPacketsHandler, createPacketHandler } from "./packets.controller";
import { tenantHandler } from "../../core/middlewares/tenantHandler";

export async function packetRoutes(app: FastifyInstance): Promise<void> {
  // Attach tenant authentication middleware to all packet routes
  app.addHook("onRequest", tenantHandler);

  app.get("/", getPacketsHandler);
  app.post("/", createPacketHandler);
}

export default packetRoutes;
