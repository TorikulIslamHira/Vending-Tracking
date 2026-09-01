import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Super Admin Provisioning (Clean Database)...");

  // 1. Create or Find Primary Tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: "tenant-bee-novelty" },
    update: {},
    create: {
      id: "tenant-bee-novelty",
      name: "Bee Novelty Vending",
      isActive: true,
      themeConfig: {
        companyName: "Bee Novelty Vending",
        primaryColor: "#eab308",
        secondaryColor: "#3b82f6",
      },
    },
  });

  console.log(`✅ Tenant Provisioned: ${tenant.name} (${tenant.id})`);

  // 2. Create EXACTLY ONE Super Admin User
  const adminUser = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: "admin@example.com",
      },
    },
    update: {
      passwordHash: "Admin1234!",
      role: UserRole.ADMIN,
      name: "Super Admin",
    },
    create: {
      tenantId: tenant.id,
      name: "Super Admin",
      email: "admin@example.com",
      passwordHash: "Admin1234!",
      role: UserRole.ADMIN,
    },
  });

  console.log(`✅ Super Admin Provisioned: ${adminUser.name} <${adminUser.email}> (Role: ${adminUser.role})`);
  console.log("🔒 Credentials -> Email: admin@example.com | Password: Admin1234!");
  console.log("✨ Zero demo machines, packets, or logs seeded. Database is pristine clean.");
}

main()
  .catch((e) => {
    console.error("❌ Seed Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
