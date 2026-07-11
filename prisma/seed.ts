import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@ajoflow.dev" },
    update: {
      name: "Ngozi Admin",
      role: "ADMIN",
      passwordHash: password
    },
    create: { name: "Ngozi Admin", email: "admin@ajoflow.dev", passwordHash: password, role: "ADMIN" }
  });

  const members = await Promise.all(
    ["Amaka", "Bola", "Collins", "Frank", "Richard", "Justin", "Chidi", "Efe", "Grace", "Kingsley"].map((name, i) =>
      prisma.user.upsert({
        where: { email: `${name.toLowerCase()}@ajoflow.dev` },
        update: {
          name,
          role: "MEMBER",
          passwordHash: password
        },
        create: { name, email: `${name.toLowerCase()}@ajoflow.dev`, passwordHash: password, role: "MEMBER" }
      })
    )
  );

  const vendor = await prisma.user.upsert({
    where: { email: "vendor@ajoflow.dev" },
    update: {
      name: "Tunde Vendor",
      role: "VENDOR",
      passwordHash: password
    },
    create: { name: "Tunde Vendor", email: "vendor@ajoflow.dev", passwordHash: password, role: "VENDOR" }
  });

  const customer = await prisma.user.upsert({
    where: { email: "customer@ajoflow.dev" },
    update: {
      name: "Sade Customer",
      role: "CUSTOMER",
      passwordHash: password
    },
    create: { name: "Sade Customer", email: "customer@ajoflow.dev", passwordHash: password, role: "CUSTOMER" }
  });

  const group = await prisma.group.create({
    data: {
      name: "Market Women Monthly Ajo",
      contributionAmount: 5000,
      frequency: "MONTHLY",
      startDate: new Date(),
      totalMembers: members.length,
      adminId: admin.id
    }
  });

  await Promise.all(
    members.map((m, i) =>
      prisma.groupMember.create({ data: { groupId: group.id, userId: m.id, payoutOrder: i + 1 } })
    )
  );

  const product = await prisma.product.create({
    data: { vendorId: vendor.id, name: "Samsung A15 Phone", price: 120000 }
  });

  await prisma.installment.create({
    data: {
      productId: product.id,
      customerId: customer.id,
      totalAmount: 120000,
      amountPaid: 0,
      balance: 120000,
      status: "ACTIVE"
    }
  });

  console.log("Seed complete. Demo login password for all accounts: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
