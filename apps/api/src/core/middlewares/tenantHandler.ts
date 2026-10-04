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
    // Only ever non-zero for UserRole.PRESENTATION — GET handlers that
    // return financial figures run them through applyModifier() using this
    // value (see core/applyModifier.ts). Always 0 for every other role, so
    // a handler never needs to check the role itself, only this number.
    dataModifierPercentage: number;
  }
}

// Presentation accounts are strictly read-only: they exist purely to show a
// percentage-skewed view of real data for demos, never to touch it. Every
// mutating HTTP method is blocked here — the one onRequest hook every
// module's routes already register — rather than scattered per-handler
// checks, so no new mutating endpoint can ever accidentally skip it.
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

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
      columns: { id: true, isActive: true, tenantId: true, dataModifierPercentage: true },
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
    request.dataModifierPercentage = account.dataModifierPercentage
      ? Number(account.dataModifierPercentage)
      : 0;

    // WRITE PROTECTION — see MUTATING_METHODS comment above.
    if (decoded.userRole === UserRole.PRESENTATION && MUTATING_METHODS.has(request.method)) {
      return reply.status(403).send({
        statusCode: 403,
        error: "Forbidden",
        message: "Presentation accounts are strictly read-only and cannot modify data.",
      });
    }
  } catch (err: any) {
    return reply.status(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: err.message || "Invalid or expired authentication token",
    });
  }
}

export default tenantHandler;
