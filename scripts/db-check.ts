import { PrismaClient } from "@prisma/client";

type Check = {
  name: string;
  passed: boolean;
  details?: string;
};

const prisma = new PrismaClient();

async function tableExists(tableName: string) {
  const rows = await prisma.$queryRaw<Array<{ exists: string | null }>>`
    SELECT to_regclass(${`public.${tableName}`}) AS "exists"
  `;
  return Boolean(rows[0]?.exists);
}

async function columnExists(tableName: string, columnName: string) {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS "count"
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
      AND column_name = ${columnName}
  `;
  return Number(rows[0]?.count ?? 0) > 0;
}

async function indexExists(indexName: string) {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS "count"
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = ${indexName}
  `;
  return Number(rows[0]?.count ?? 0) > 0;
}

async function constraintExists(constraintName: string) {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS "count"
    FROM pg_constraint
    WHERE conname = ${constraintName}
  `;
  return Number(rows[0]?.count ?? 0) > 0;
}

async function roleCount(role: "VENDOR" | "CUSTOMER") {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS "count"
    FROM "User"
    WHERE "role" = CAST(${role} AS "Role")
  `;
  return Number(rows[0]?.count ?? 0);
}

async function migrationApplied(migrationName: string) {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS "count"
    FROM "_prisma_migrations"
    WHERE "migration_name" = ${migrationName}
      AND "finished_at" IS NOT NULL
  `;
  return Number(rows[0]?.count ?? 0) > 0;
}

async function main() {
  const checks: Check[] = [];

  const requiredTables = [
    "User",
    "Product",
    "Installment",
    "Payment",
    "WalletWithdrawal",
    "ProductPackage",
    "ProductPackageItem",
    "VendorPolicyTemplate",
    "AuditLog",
  ];

  for (const table of requiredTables) {
    checks.push({
      name: `table:${table}`,
      passed: await tableExists(table),
    });
  }

  const requiredColumns: Array<[string, string]> = [
    ["Product", "imageUrl"],
    ["Product", "kind"],
    ["Installment", "policyTemplateId"],
    ["Installment", "policyTemplateName"],
    ["Installment", "policyTemplateContent"],
    ["Installment", "policyAppliedAt"],
    ["Installment", "policyAcceptedAt"],
  ];

  for (const [table, column] of requiredColumns) {
    checks.push({
      name: `column:${table}.${column}`,
      passed: await columnExists(table, column),
    });
  }

  const requiredIndexes = [
    "Installment_policyTemplateId_idx",
    "VendorPolicyTemplate_vendorId_idx",
    "VendorPolicyTemplate_vendorId_name_key",
    "WalletWithdrawal_vendorId_idx",
  ];

  for (const index of requiredIndexes) {
    checks.push({
      name: `index:${index}`,
      passed: await indexExists(index),
    });
  }

  const requiredConstraints = [
    "Installment_policyTemplateId_fkey",
    "VendorPolicyTemplate_vendorId_fkey",
    "WalletWithdrawal_vendorId_fkey",
  ];

  for (const constraint of requiredConstraints) {
    checks.push({
      name: `constraint:${constraint}`,
      passed: await constraintExists(constraint),
    });
  }

  checks.push({
    name: "migration:0006_policy_templates",
    passed: await migrationApplied("0006_policy_templates"),
  });
  checks.push({
    name: "migration:0007_policy_schema_repair",
    passed: await migrationApplied("0007_policy_schema_repair"),
  });

  const vendors = await roleCount("VENDOR");
  const customers = await roleCount("CUSTOMER");
  checks.push({
    name: "seed:vendor_user_exists",
    passed: vendors > 0,
    details: `count=${vendors}`,
  });
  checks.push({
    name: "seed:customer_user_exists",
    passed: customers > 0,
    details: `count=${customers}`,
  });

  let failed = 0;
  for (const check of checks) {
    const status = check.passed ? "OK" : "MISSING";
    const details = check.details ? ` (${check.details})` : "";
    console.log(`[${status}] ${check.name}${details}`);
    if (!check.passed) failed += 1;
  }

  if (failed > 0) {
    console.error(`\nDB CHECK FAILED: ${failed} item(s) missing.`);
    process.exitCode = 1;
    return;
  }

  console.log("\nDB CHECK PASSED: vendor-hub database checklist is complete.");
}

main()
  .catch((error) => {
    console.error("DB CHECK ERROR:", error?.message ?? error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
