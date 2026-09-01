import { FastifyInstance } from "fastify";
import { getUsersHandler, createUserHandler } from "./users.controller";
import { tenantHandler } from "../../core/middlewares/tenantHandler";

export async function usersRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", tenantHandler);

  app.get("/", getUsersHandler);
  app.post("/", createUserHandler);
}

export default usersRoutes;
