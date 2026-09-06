import { FastifyInstance } from "fastify";
import { getSettingsHandler, updateSettingsHandler } from "./settings.controller";
import { tenantHandler } from "../../core/middlewares/tenantHandler";

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  // Attach tenant authentication middleware to all settings routes
  app.addHook("onRequest", tenantHandler);

  app.get("/", getSettingsHandler);
  app.patch("/", updateSettingsHandler);
  app.put("/", updateSettingsHandler);
}

export default settingsRoutes;
