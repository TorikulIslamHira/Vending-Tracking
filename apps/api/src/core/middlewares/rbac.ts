import { FastifyRequest, FastifyReply } from "fastify";
import { UserRole } from "@vending/shared-types";

/**
 * Role-Based Access Control Hook Factory
 * Must run after `tenantHandler` (which populates `request.userRole` from the JWT).
 * Rejects the request with 403 if the authenticated user's role is not in `allowedRoles`.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return async function roleHandler(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    if (!request.userRole || !allowedRoles.includes(request.userRole)) {
      return reply.status(403).send({
        statusCode: 403,
        error: "Forbidden",
        message: "You do not have permission to perform this action",
      });
    }
  };
}

export default requireRole;
