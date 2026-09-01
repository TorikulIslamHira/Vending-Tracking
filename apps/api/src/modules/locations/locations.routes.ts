import { FastifyInstance } from "fastify";
import {
  getLocationsHandler,
  getLocationByIdHandler,
  createLocationHandler,
  updateLocationHandler,
} from "./locations.controller";
import { tenantHandler } from "../../core/middlewares/tenantHandler";

export async function locationsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", tenantHandler);

  app.get("/", getLocationsHandler);
  app.get("/:id", getLocationByIdHandler);
  app.post("/", createLocationHandler);
  app.put("/:id", updateLocationHandler);
}

export default locationsRoutes;
