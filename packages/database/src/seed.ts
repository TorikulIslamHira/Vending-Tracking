import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { tenants, users } from "./schema.js";

async function main() {
  console.log("🌱 Starting Drizzle Super Admin Provisioning (Clean Database)...");

  // Fail fast: the Super Admin is bootstrapped strictly from the environment —
  // no hardcoded fallback credentials. Additional users are created via the
  // in-app admin UI (POST /api/v1/users) from this point on.
  const adminEmail = process.env.SUPER_ADMIN_EMAIL;
  const rawPassword = process.env.SUPER_ADMIN_PASSWORD;

  if (!adminEmail || !rawPassword) {
    throw new Error(
      "SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD environment variables are required to seed the Super Admin user. Set them in your .env file."
    );
  }

  // 1. Upsert Default Tenant
  const tenantId = "tenant-bee-novelty";
  const [tenant] = await db
    .insert(tenants)
    .values({
      id: tenantId,
      name: "Bee Novelty Vending",
      isActive: true,
      themeConfig: {
        primaryColor: "#059669",
        companyName: "Bee Novelty Vending Ltd.",
      },
    })
    .onConflictDoUpdate({
      target: tenants.id,
      set: {
        name: "Bee Novelty Vending",
        isActive: true,
      },
    })
    .returning();

  console.log(`✅ Tenant Provisioned: ${tenant.name} (${tenant.id})`);

  // 2. Hash Password and Provision Super Admin
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(rawPassword, saltRounds);

  const existingAdmin = await db.query.users.findFirst({
    where: eq(users.email, adminEmail),
  });

  if (existingAdmin) {
    await db
      .update(users)
      .set({
        name: "Super Admin",
        role: "ADMIN",
        passwordHash: hashedPassword,
        tenantId: tenant.id,
        // Re-running the seed also reactivates the account, so rotating
        // SUPER_ADMIN_PASSWORD doubles as a recovery path if it was deactivated.
        isActive: true,
      })
      .where(eq(users.id, existingAdmin.id));
    console.log(`✅ Super Admin Password & Tenant Updated for: ${adminEmail}`);
  } else {
    await db.insert(users).values({
      tenantId: tenant.id,
      name: "Super Admin",
      role: "ADMIN",
      email: adminEmail,
      passwordHash: hashedPassword,
    });
    console.log(`✅ Super Admin Provisioned: Super Admin <${adminEmail}> (Role: ADMIN)`);
  }

  console.log(`🔒 Super Admin credentials applied for: ${adminEmail} (password not logged)`);
  console.log("✨ Zero demo machines, packets, or logs seeded. Database is pristine clean.");
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Seeding failed:", e);
  process.exit(1);
});
