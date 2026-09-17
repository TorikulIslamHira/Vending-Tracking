import { FastifyInstance } from "fastify";
import {
  getLocationsHandler,
  getLocationByIdHandler,
  createLocationHandler,
  updateLocationHandler,
  deleteLocationHandler,
} from "./locations.controller";
import { tenantHandler } from "../../core/middlewares/tenantHandler";
import { requireRole } from "../../core/middlewares/rbac";
import { UserRole } from "@vending/shared-types";

export async function locationsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", tenantHandler);

  app.get("/", getLocationsHandler);
  app.get("/:id", getLocationByIdHandler);
  app.post("/", createLocationHandler);
  app.put("/:id", updateLocationHandler);
  app.delete<{ Params: { id: string } }>(
    "/:id",
    { onRequest: [requireRole(UserRole.ADMIN)] },
    deleteLocationHandler
  );
}

export default locationsRoutes;
