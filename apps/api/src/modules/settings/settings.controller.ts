import { FastifyReply, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import { TenantSettingsSchema } from "@vending/validation";
import { db, tenants } from "../../core/db";

/**
 * Get Settings Handler:
 * Returns the current tenant configuration (currency, commissions, notifications).
 */
export async function getSettingsHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const tenantId = request.tenantId;

  try {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!tenant) {
      return reply.status(404).send({
        statusCode: 404,
        error: "Not Found",
        message: "Tenant organization not found",
      });
    }

    const theme = (tenant.themeConfig as any) || {};

    return reply.send({
      statusCode: 200,
      data: {
        currency: tenant.currency || "USD",
        defaultShopCut: theme.defaultShopCut ?? 30,
        defaultBizCut: theme.defaultBizCut ?? 70,
        lowStockAlerts: theme.lowStockAlerts ?? true,
        cashDropAlerts: theme.cashDropAlerts ?? true,
        dailyReports: theme.dailyReports ?? false,
      },
    });
  } catch (err: any) {
    request.log.error(err);
    return reply.status(500).send({
      statusCode: 500,
      error: "Internal Server Error",
      message: "Failed to fetch tenant configuration",
    });
  }
}

/**
 * Update Settings Handler:
 * Updates operating currency and configuration options on the tenant record.
 */
export async function updateSettingsHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const tenantId = request.tenantId;

  const parseResult = TenantSettingsSchema.safeParse(request.body);
  if (!parseResult.success) {
    return reply.status(400).send({
      statusCode: 400,
      error: "Bad Request",
      message: "Validation failed",
      issues: parseResult.error.issues,
    });
  }

  const {
    currency,
    defaultShopCut,
    defaultBizCut,
    lowStockAlerts,
    cashDropAlerts,
    dailyReports,
  } = parseResult.data;

  try {
    const existingTenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    if (!existingTenant) {
      return reply.status(404).send({
        statusCode: 404,
        error: "Not Found",
        message: "Tenant organization not found",
      });
    }

    const currentTheme = (existingTenant.themeConfig as any) || {};
    const updatedTheme = {
      ...currentTheme,
      ...(defaultShopCut !== undefined ? { defaultShopCut } : {}),
      ...(defaultBizCut !== undefined ? { defaultBizCut } : {}),
      ...(lowStockAlerts !== undefined ? { lowStockAlerts } : {}),
      ...(cashDropAlerts !== undefined ? { cashDropAlerts } : {}),
      ...(dailyReports !== undefined ? { dailyReports } : {}),
    };

    const updatePayload: any = {
      themeConfig: updatedTheme,
      updatedAt: new Date(),
    };

    if (currency) {
      updatePayload.currency = currency.toUpperCase();
    }

    const [updatedTenant] = await db
      .update(tenants)
      .set(updatePayload)
      .where(eq(tenants.id, tenantId))
      .returning();

    return reply.send({
      statusCode: 200,
      message: "Tenant configuration updated successfully",
      data: {
        currency: updatedTenant.currency,
        defaultShopCut: updatedTheme.defaultShopCut ?? 30,
        defaultBizCut: updatedTheme.defaultBizCut ?? 70,
        lowStockAlerts: updatedTheme.lowStockAlerts ?? true,
        cashDropAlerts: updatedTheme.cashDropAlerts ?? true,
        dailyReports: updatedTheme.dailyReports ?? false,
      },
    });
  } catch (err: any) {
    request.log.error(err);
    return reply.status(500).send({
      statusCode: 500,
      error: "Internal Server Error",
      message: "Failed to update tenant configuration",
    });
  }
}
