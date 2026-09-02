import "dotenv/config";
import bcrypt from "bcryptjs";
import { db, queryClient } from "./client";
import { tenants, users } from "./schema";

async function main() {
  console.log("🌱 Starting Drizzle Super Admin Provisioning (Clean Database)...");

  // 1. Upsert Primary Tenant
  const tenantValues = {
    id: "tenant-bee-novelty",
    name: "Bee Novelty Vending",
    isActive: true,
    themeConfig: {
      companyName: "Bee Novelty Vending",
      primaryColor: "#eab308",
      secondaryColor: "#3b82f6",
    },
  };

  const [tenant] = await db
    .insert(tenants)
    .values(tenantValues)
    .onConflictDoUpdate({
      target: tenants.id,
      set: {
        name: tenantValues.name,
        isActive: tenantValues.isActive,
        themeConfig: tenantValues.themeConfig,
      },
    })
    .returning();

  console.log(`✅ Tenant Provisioned: ${tenant.name} (${tenant.id})`);

  // 2. Hash Super Admin password with bcrypt (10 rounds)
  const passwordHash = await bcrypt.hash("Admin1234!", 10);

  // 3. Upsert Super Admin User
  const adminValues = {
    tenantId: tenant.id,
    name: "Super Admin",
    email: "admin@example.com",
    passwordHash,
    role: "ADMIN" as const,
  };

  const [adminUser] = await db
    .insert(users)
    .values(adminValues)
    .onConflictDoUpdate({
      target: [users.tenantId, users.email],
      set: {
        passwordHash: adminValues.passwordHash,
        role: adminValues.role,
        name: adminValues.name,
      },
    })
    .returning();

  console.log(
    `✅ Super Admin Provisioned: ${adminUser.name} <${adminUser.email}> (Role: ${adminUser.role})`
  );
  console.log("🔒 Credentials -> Email: admin@example.com | Password: Admin1234!");
  console.log("✨ Zero demo machines, packets, or logs seeded. Database is pristine clean.");
}

main()
  .catch((e) => {
    console.error("❌ Seed Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await queryClient.end();
  });
