import { FastifyReply, FastifyRequest } from "fastify";
import { eq, desc } from "drizzle-orm";
import { db, users, adminAuditLogs } from "../../core/db";
import { isRootSuperAdminEmail } from "../../core/rootAdmin";

/**
 * Sensitive administrative actions (currently: machine deletion) are recorded
 * in admin_audit_logs but only ever surfaced to the root Super Admin — not
 * even a delegated Admin who was granted the underlying power gets to see
 * the trail of who used it.
 */
export async function getAuditLogsHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const tenantId = request.tenantId;

  try {
    const actor = await db.query.users.findFirst({
      where: eq(users.id, request.userId),
      columns: { email: true },
    });

    if (!actor || !isRootSuperAdminEmail(actor.email)) {
      return reply.status(403).send({
        statusCode: 403,
        error: "Forbidden",
        message: "Only the root Super Admin can view the audit log",
      });
    }

    const logs = await db.query.adminAuditLogs.findMany({
      where: eq(adminAuditLogs.tenantId, tenantId),
      orderBy: [desc(adminAuditLogs.createdAt)],
      with: {
        actor: {
          columns: { id: true, name: true, email: true },
        },
      },
    });

    return reply.send({
      statusCode: 200,
      data: logs,
    });
  } catch (error: any) {
    return reply.status(500).send({
      statusCode: 500,
      error: "Internal Server Error",
      message: error.message || "Failed to fetch audit logs",
    });
  }
}
