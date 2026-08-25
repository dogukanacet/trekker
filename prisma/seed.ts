import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const hashedPassword = await bcrypt.hash("password123", 10);
  const tenant = await prisma.tenant.create({
    data: {
      name: "Seed Tenant",
    },
  });
  await prisma.depot.create({
    data: {
      name: "Seed Depot",
      tenantId: tenant.id,
    },
  });
  await prisma.user.create({
    data: {
      email: "admin@trekker.dev",
      passwordHash: hashedPassword,
      tenantId: tenant.id,
      role: "ADMIN",
    },
  });
  console.log("Seed tamamlandı");
}

main().catch((e) => {
  console.log("Seed sırasında hata oluştu:", e);
});
