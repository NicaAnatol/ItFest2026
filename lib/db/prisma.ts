/**
 * Prisma Client singleton — lazy-initialized after instrumentation resolves
 * MongoDB hostnames to IPv4 addresses.
 *
 * Prisma manages auth only (Organization, Medic).
 * Patient graph data lives in Neo4j — see lib/db/neo4j-patients.ts.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  __prisma: PrismaClient | undefined;
};

/**
 * Lazy getter — the PrismaClient is created on first property access,
 * ensuring instrumentation.ts has already resolved DNS.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    if (!globalForPrisma.__prisma) {
      globalForPrisma.__prisma = new PrismaClient({
        log:
          process.env.NODE_ENV === "development"
            ? ["warn", "error"]
            : ["error"],
      });
    }
    return (globalForPrisma.__prisma as unknown as Record<string | symbol, unknown>)[prop];
  },
});
