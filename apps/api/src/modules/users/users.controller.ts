import { FastifyReply, FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";
import { eq, and, desc } from "drizzle-orm";
import { db, users } from "../../core/db";
import { isRootSuperAdminEmail } from "../../core/rootAdmin";

export async function getUsersHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const tenantId = request.tenantId;

  try {
    const userList = await db.query.users.findMany({
      where: eq(users.tenantId, tenantId),
      orderBy: [desc(users.createdAt)],
    });

    const formattedUsers = userList.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.isActive ? ("ACTIVE" as const) : ("INACTIVE" as const),
      assignedCount: 0,
      isRootAdmin: isRootSuperAdminEmail(u.email),
      canDeleteMachines: isRootSuperAdminEmail(u.email) || u.canDeleteMachines,
    }));

    return reply.send({
      statusCode: 200,
      data: formattedUsers,
    });
  } catch {
    return reply.send({
      statusCode: 200,
      data: [],
    });
  }
}

export async function createUserHandler(
  request: FastifyRequest<{
    Body: { name: string; email: string; role?: "ADMIN" | "FIELD_AGENT" };
  }>,
  reply: FastifyReply
): Promise<void> {
  const tenantId = request.tenantId;
  const { name, email, role } = request.body;

  if (!name || !email) {
    return reply.status(400).send({
      statusCode: 400,
      error: "Bad Request",
      message: "Name and email are required",
    });
  }

  try {
    const defaultHashedPassword = await bcrypt.hash("Password123!", 10);

    const [createdUser] = await db
      .insert(users)
      .values({
        tenantId,
        name,
        email,
        role: role === "ADMIN" ? "ADMIN" : "FIELD_AGENT",
        passwordHash: defaultHashedPassword,
      })
      .returning();

    return reply.status(201).send({
      statusCode: 201,
      message: "User created successfully",
      data: {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
        status: "ACTIVE",
        assignedCount: 0,
        isRootAdmin: isRootSuperAdminEmail(createdUser.email),
        canDeleteMachines: isRootSuperAdminEmail(createdUser.email) || createdUser.canDeleteMachines,
      },
    });
  } catch (err: any) {
    return reply.status(500).send({
      statusCode: 500,
      error: "Internal Server Error",
      message: err?.message || "Failed to create user",
    });
  }
}

/**
 * Toggle a user's active/inactive status. Deactivation takes effect immediately:
 * `tenantHandler` re-checks `isActive` on every subsequent authenticated request,
 * so an already-issued JWT stops working right away rather than at its 7-day expiry.
 */
export async function toggleUserStatusHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const tenantId = request.tenantId;
  const { id } = request.params;

  if (id === request.userId) {
    return reply.status(400).send({
      statusCode: 400,
      error: "Bad Request",
      message: "You cannot deactivate your own account",
    });
  }

  try {
    const targetUser = await db.query.users.findFirst({
      where: and(eq(users.id, id), eq(users.tenantId, tenantId)),
    });

    if (!targetUser) {
      return reply.status(404).send({
        statusCode: 404,
        error: "Not Found",
        message: "User not found in your organization",
      });
    }

    if (isRootSuperAdminEmail(targetUser.email)) {
      return reply.status(403).send({
        statusCode: 403,
        error: "Forbidden",
        message: "The root Super Admin account cannot be deactivated",
      });
    }

    const [updatedUser] = await db
      .update(users)
      .set({ isActive: !targetUser.isActive })
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
      .returning();

    return reply.send({
      statusCode: 200,
      message: `User ${updatedUser.isActive ? "reactivated" : "deactivated"} successfully`,
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.isActive ? "ACTIVE" : "INACTIVE",
        assignedCount: 0,
        isRootAdmin: isRootSuperAdminEmail(updatedUser.email),
        canDeleteMachines: isRootSuperAdminEmail(updatedUser.email) || updatedUser.canDeleteMachines,
      },
    });
  } catch (err: any) {
    return reply.status(500).send({
      statusCode: 500,
      error: "Internal Server Error",
      message: err?.message || "Failed to update user status",
    });
  }
}

/**
 * Grants or revokes a non-root ADMIN user's delegated power to delete machines.
 * Only the root Super Admin (identified by SUPER_ADMIN_EMAIL, not a role check)
 * may call this — machine deletion is a root-owned power by default, delegable
 * one Admin at a time at the root's discretion.
 */
export async function toggleDeletePermissionHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: { canDeleteMachines: boolean } }>,
  reply: FastifyReply
): Promise<void> {
  const tenantId = request.tenantId;
  const { id } = request.params;
  const { canDeleteMachines } = request.body;

  try {
    const actor = await db.query.users.findFirst({
      where: eq(users.id, request.userId),
      columns: { email: true },
    });

    if (!actor || !isRootSuperAdminEmail(actor.email)) {
      return reply.status(403).send({
        statusCode: 403,
        error: "Forbidden",
        message: "Only the root Super Admin can delegate machine deletion permission",
      });
    }

    const targetUser = await db.query.users.findFirst({
      where: and(eq(users.id, id), eq(users.tenantId, tenantId)),
    });

    if (!targetUser) {
      return reply.status(404).send({
        statusCode: 404,
        error: "Not Found",
        message: "User not found in your organization",
      });
    }

    if (targetUser.role !== "ADMIN" || isRootSuperAdminEmail(targetUser.email)) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "Machine deletion permission can only be delegated to a non-root Admin user",
      });
    }

    const [updatedUser] = await db
      .update(users)
      .set({ canDeleteMachines })
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
      .returning();

    return reply.send({
      statusCode: 200,
      message: `Machine deletion permission ${canDeleteMachines ? "granted to" : "revoked from"} ${updatedUser.name}`,
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.isActive ? "ACTIVE" : "INACTIVE",
        assignedCount: 0,
        isRootAdmin: isRootSuperAdminEmail(updatedUser.email),
        canDeleteMachines: isRootSuperAdminEmail(updatedUser.email) || updatedUser.canDeleteMachines,
      },
    });
  } catch (err: any) {
    return reply.status(500).send({
      statusCode: 500,
      error: "Internal Server Error",
      message: err?.message || "Failed to update machine deletion permission",
    });
  }
}
