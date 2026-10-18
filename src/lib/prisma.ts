import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const datasourceUrl =
  process.env.PRISMA_USE_DIRECT_URL === "true"
    ? (process.env.DIRECT_URL ?? process.env.DATABASE_URL)
    : (process.env.DATABASE_URL ?? process.env.DIRECT_URL);

export const prisma =
  global.__prisma ??
  new PrismaClient({
    datasourceUrl,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
