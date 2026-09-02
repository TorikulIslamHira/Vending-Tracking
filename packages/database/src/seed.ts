import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { tenants, users } from "./schema.js";

async function main() {
  console.log("🌱 Starting Drizzle Super Admin Provisioning (Clean Database)...");

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
  const adminEmail = "admin@example.com";
  const rawPassword = "Admin1234!";
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

  console.log(`🔒 Credentials -> Email: ${adminEmail} | Password: ${rawPassword}`);
  console.log("✨ Zero demo machines, packets, or logs seeded. Database is pristine clean.");
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Seeding failed:", e);
  process.exit(1);
});
