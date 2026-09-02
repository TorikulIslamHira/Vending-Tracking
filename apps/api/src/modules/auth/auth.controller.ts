import { FastifyReply, FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";
import { UserLoginSchema } from "@vending/validation";
import { UserRole } from "@vending/shared-types";
import { prisma } from "../../core/prisma";
import { JWTPayload } from "../../core/middlewares/tenantHandler";

export async function loginHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const parseResult = UserLoginSchema.safeParse(request.body);

  if (!parseResult.success) {
    return reply.status(400).send({
      statusCode: 400,
      error: "Bad Request",
      message: "Validation failed",
      issues: parseResult.error.issues,
    });
  }

  const { email, password } = parseResult.data;

  try {
    // Attempt to query User from database
    const user = await prisma.user.findFirst({
      where: { email },
      include: { tenant: true },
    });

    if (user) {
      let isValidPassword = false;
      if (
        user.passwordHash.startsWith("$2a$") ||
        user.passwordHash.startsWith("$2b$") ||
        user.passwordHash.startsWith("$2y$")
      ) {
        isValidPassword = await bcrypt.compare(password, user.passwordHash);
      } else {
        isValidPassword = user.passwordHash === password;
      }

      if (!isValidPassword) {
        return reply.status(401).send({
          statusCode: 401,
          error: "Unauthorized",
          message: "Invalid email or password",
        });
      }

      const jwtPayload: JWTPayload = {
        userId: user.id,
        tenantId: user.tenantId,
        userRole: user.role as unknown as UserRole,
        email: user.email,
      };

      const token = request.server.jwt.sign(jwtPayload, {
        expiresIn: "7d",
      });

      return reply.send({
        statusCode: 200,
        message: "Login successful",
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          tenantName: user.tenant?.name,
        },
      });
    }

    return reply.status(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: "Invalid email or password",
    });
  } catch (err: any) {
    return reply.status(500).send({
      statusCode: 500,
      error: "Internal Server Error",
      message: err?.message || "Authentication service failed",
    });
  }
}
