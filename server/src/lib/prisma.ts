import { PrismaClient } from "@prisma/client";

// Single shared Prisma instance. tsx watch re-executes the module on every
// reload in dev, so stash it on globalThis to avoid exhausting connections.
const g = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = g.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  g.prisma = prisma;
}
