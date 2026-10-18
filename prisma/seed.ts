import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@kreddt.dev" },
    update: {
      name: "Ngozi Admin",
      role: "ADMIN",
      passwordHash: password,
    },
    create: {
      name: "Ngozi Admin",
      email: "admin@kreddt.dev",
      passwordHash: password,
      role: "ADMIN",
    },
  });

  const members = await Promise.all(
    [
      "Amaka",
      "Bola",
      "Collins",
      "Frank",
      "Richard",
      "Justin",
      "Chidi",
      "Efe",
      "Grace",
      "Kingsley",
    ].map((name, i) =>
      prisma.user.upsert({
        where: { email: `${name.toLowerCase()}@kreddt.dev` },
        update: {
          name,
          role: "MEMBER",
          passwordHash: password,
        },
        create: {
          name,
          email: `${name.toLowerCase()}@kreddt.dev`,
          passwordHash: password,
          role: "MEMBER",
        },
      }),
    ),
  );

  const vendor = await prisma.user.upsert({
    where: { email: "vendor@kreddt.dev" },
    update: {
      name: "Tunde Vendor",
      role: "VENDOR",
      passwordHash: password,
    },
    create: {
      name: "Tunde Vendor",
      email: "vendor@kreddt.dev",
      passwordHash: password,
      role: "VENDOR",
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: "customer@kreddt.dev" },
    update: {
      name: "Sade Customer",
      role: "CUSTOMER",
      passwordHash: password,
    },
    create: {
      name: "Sade Customer",
      email: "customer@kreddt.dev",
      passwordHash: password,
      role: "CUSTOMER",
    },
  });

  const group = await prisma.group.create({
    data: {
      name: "Market Women Monthly Ajo",
      contributionAmount: 5000,
      frequency: "MONTHLY",
      startDate: new Date(),
      totalMembers: members.length,
      adminId: admin.id,
    },
  });

  await Promise.all(
    members.map((m, i) =>
      prisma.groupMember.create({
        data: { groupId: group.id, userId: m.id, payoutOrder: i + 1 },
      }),
    ),
  );

  const product = await prisma.product.create({
    data: { vendorId: vendor.id, name: "Samsung A15 Phone", price: 120000 },
  });

  await prisma.installment.create({
    data: {
      productId: product.id,
      customerId: customer.id,
      totalAmount: 120000,
      amountPaid: 0,
      balance: 120000,
      status: "ACTIVE",
    },
  });

  const templates = [
    {
      name: "Small Small",
      content:
        "1) Customer agrees to pay on the exact due dates in this plan. 2) A missed payment of more than 7 days may attract a restructuring review. 3) Full ownership transfers after total settlement. 4) Vendor may pause new deliveries until arrears are cleared.",
    },
    {
      name: "Phone Payment",
      content:
        "1) Device warranty terms remain under manufacturer policy. 2) Customer must keep device traceable until final payment. 3) Two consecutive missed payments may trigger default status and recovery workflow.",
    },
    {
      name: "Furniture Payment",
      content:
        "1) Delivery confirmation starts the installment timeline. 2) Customer accepts item condition at handover. 3) Payment delays beyond 14 days may incur follow-up charges based on agreed terms.",
    },
  ];

  for (const template of templates) {
    await prisma.vendorPolicyTemplate.upsert({
      where: {
        vendorId_name: {
          vendorId: vendor.id,
          name: template.name,
        },
      },
      update: {
        content: template.content,
      },
      create: {
        vendorId: vendor.id,
        name: template.name,
        content: template.content,
      },
    });
  }

  console.log(
    "Seed complete. Demo login password for all accounts: password123",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
