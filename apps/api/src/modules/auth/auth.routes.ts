import { FastifyInstance } from "fastify";
import { loginHandler } from "./auth.controller";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/login", loginHandler);
}

export default authRoutes;
