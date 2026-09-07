import { FastifyInstance } from "fastify";
import {
  getUsersHandler,
  createUserHandler,
  toggleUserStatusHandler,
  toggleDeletePermissionHandler,
} from "./users.controller";
import { tenantHandler } from "../../core/middlewares/tenantHandler";
import { requireRole } from "../../core/middlewares/rbac";
import { UserRole } from "@vending/shared-types";

export async function usersRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", tenantHandler);

  app.get("/", getUsersHandler);
  app.post<{ Body: { name: string; email: string; role?: "ADMIN" | "FIELD_AGENT" } }>(
    "/",
    { onRequest: [requireRole(UserRole.ADMIN)] },
    createUserHandler
  );
  app.patch<{ Params: { id: string } }>(
    "/:id/status",
    { onRequest: [requireRole(UserRole.ADMIN)] },
    toggleUserStatusHandler
  );
  app.patch<{ Params: { id: string }; Body: { canDeleteMachines: boolean } }>(
    "/:id/delete-permission",
    { onRequest: [requireRole(UserRole.ADMIN)] },
    toggleDeletePermissionHandler
  );
}

export default usersRoutes;
