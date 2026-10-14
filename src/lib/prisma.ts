import { PrismaClient } from "@prisma/client";

// Prevent multiple PrismaClient instances from being created during hot reload
// in Next.js development mode by using a global singleton pattern.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
