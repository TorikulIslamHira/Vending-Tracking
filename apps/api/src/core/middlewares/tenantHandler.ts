import { FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import { UserRole } from "@vending/shared-types";
import { db, users } from "../db";

/**
 * JWT payload contract containing multi-tenant session metadata
 */
export interface JWTPayload {
  userId: string;
  tenantId: string;
  userRole: UserRole;
  email?: string;
}

/**
 * Fastify Request augmentation for multi-tenant context injection
 */
declare module "fastify" {
  interface FastifyRequest {
    tenantId: string;
    userId: string;
    userRole: UserRole;
    userPayload?: JWTPayload;
  }
}

/**
 * Multi-Tenant Middleware / Hook
 * Verifies JWT token, extracts tenantId, userId, and userRole, and injects them
 * into the Fastify request context for strict data isolation.
 */
export async function tenantHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const decoded = await request.jwtVerify<JWTPayload>();

    if (!decoded || !decoded.tenantId) {
      return reply.status(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "Missing or invalid tenant context in authentication token",
      });
    }

    // Re-check live account status on every request: a JWT issued before deactivation
    // must stop working immediately, not just after it naturally expires.
    const account = await db.query.users.findFirst({
      where: eq(users.id, decoded.userId),
      columns: { id: true, isActive: true, tenantId: true },
    });

    if (!account || account.tenantId !== decoded.tenantId) {
      return reply.status(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "Account no longer exists",
      });
    }

    if (!account.isActive) {
      return reply.status(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "This account has been deactivated. Contact your administrator.",
      });
    }

    // Inject tenant scoping parameters into global request context
    request.tenantId = decoded.tenantId;
    request.userId = decoded.userId;
    request.userRole = decoded.userRole;
    request.userPayload = decoded;
  } catch (err: any) {
    return reply.status(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: err.message || "Invalid or expired authentication token",
    });
  }
}

export default tenantHandler;
