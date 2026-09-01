import "dotenv/config";
import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { tenantHandler } from "./core/middlewares/tenantHandler";
import { prisma } from "./core/prisma";
import { authRoutes } from "./modules/auth";
import { machineRoutes } from "./modules/machines";
import { packetRoutes } from "./modules/packets";
import { inventoryRoutes } from "./modules/inventory";
import { usersRoutes } from "./modules/users";
import { locationsRoutes } from "./modules/locations";
import { storesRoutes, locationStoresRoutes } from "./modules/stores";

export function buildServer(): FastifyInstance {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
    },
  });

  // Register CORS
  app.register(cors, {
    origin: true,
    credentials: true,
  });

  // Register JWT
  app.register(jwt, {
    secret: process.env.JWT_SECRET || "vending-saas-default-dev-secret-key-change-in-prod",
  });

  // Decorate with authenticateTenant hook
  app.decorate("authenticateTenant", tenantHandler);

  // Health Check Endpoint
  app.get("/ping", async (_request, _reply) => {
    return {
      status: "ok",
      service: "vending-saas-api",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  // Database Connection Health Check
  app.get("/health", async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: "healthy",
        database: "connected",
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      reply.status(500);
      return {
        status: "unhealthy",
        database: "disconnected",
        error: error.message,
      };
    }
  });

  // Register Core API Routes under /api/v1 prefix
  app.register(authRoutes, { prefix: "/api/v1/auth" });
  app.register(machineRoutes, { prefix: "/api/v1/machines" });
  app.register(locationsRoutes, { prefix: "/api/v1/locations" });
  app.register(locationStoresRoutes, { prefix: "/api/v1/locations" });
  app.register(storesRoutes, { prefix: "/api/v1/stores" });
  app.register(packetRoutes, { prefix: "/api/v1/packets" });
  app.register(inventoryRoutes, { prefix: "/api/v1/inventory" });
  app.register(usersRoutes, { prefix: "/api/v1/users" });

  return app;
}

export async function start(): Promise<void> {
  const app = buildServer();
  const port = Number(process.env.PORT) || 3001;
  const host = process.env.HOST || "0.0.0.0";

  try {
    const address = await app.listen({ port, host });
    app.log.info(`🚀 Vending Machine SaaS API running at ${address}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Start server if executed directly
if (process.env.NODE_ENV !== "test") {
  start();
}

export default buildServer;
