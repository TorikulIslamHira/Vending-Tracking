import { FastifyInstance } from "fastify";
import {
  getUsersHandler,
  createUserHandler,
  updateUserHandler,
  toggleUserStatusHandler,
  toggleDeletePermissionHandler,
} from "./users.controller";
import { tenantHandler } from "../../core/middlewares/tenantHandler";
import { requireRole } from "../../core/middlewares/rbac";
import { UserRole } from "@vending/shared-types";

export async function usersRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", tenantHandler);

  app.get("/", getUsersHandler);
  app.post("/", { onRequest: [requireRole(UserRole.ADMIN)] }, createUserHandler);
  app.patch<{ Params: { id: string } }>(
    "/:id",
    { onRequest: [requireRole(UserRole.ADMIN)] },
    updateUserHandler
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
