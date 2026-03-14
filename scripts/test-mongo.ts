/**
 * Quick MongoDB connectivity test.
 * Runs the same DNS resolution logic as instrumentation.ts, then connects via Prisma.
 *
 * Usage:  npx tsx scripts/test-mongo.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

import dns from "node:dns";
import dnsPromises from "node:dns/promises";
import { PrismaClient } from "@prisma/client";

// ── 1. Force IPv4-first ────────────────────────────────────────────────
dns.setDefaultResultOrder("ipv4first");
console.log("✅ dns.setDefaultResultOrder → ipv4first\n");

const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set in .env.local");
  process.exit(1);
}

// Mask credentials for display
const safeUrl = DATABASE_URL.replace(
  /\/\/([^:]+):([^@]+)@/,
  "//$1:****@",
);
console.log(`📎 DATABASE_URL (masked): ${safeUrl}\n`);

// ── 2. Resolve each host to IPv4 ──────────────────────────────────────
async function resolveHost(host: string): Promise<string> {
  // Already an IP
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return host;

  // Strategy 1: dns.lookup (OS resolver)
  try {
    const { address } = await dnsPromises.lookup(host, { family: 4 });
    console.log(`   dns.lookup   ${host} → ${address}`);
    return address;
  } catch (e) {
    console.warn(
      `   ⚠ dns.lookup FAILED for ${host}: ${(e as Error).message}`,
    );
  }

  // Strategy 2: dns.resolve4 (direct A record)
  try {
    const addrs = await dnsPromises.resolve4(host);
    if (addrs.length > 0) {
      console.log(`   dns.resolve4 ${host} → ${addrs[0]}`);
      return addrs[0];
    }
  } catch (e) {
    console.warn(
      `   ⚠ dns.resolve4 FAILED for ${host}: ${(e as Error).message}`,
    );
  }

  console.error(`   ❌ Could not resolve ${host}`);
  return host;
}

async function resolveDatabaseUrl(url: string): Promise<string> {
  const hostMatch = url.match(/@([^/?]+)/);
  if (!hostMatch) return url;

  const hostsStr = hostMatch[1];
  const hosts = hostsStr.split(",");

  console.log(`🔍 Resolving ${hosts.length} host(s)...`);

  const resolved = await Promise.all(
    hosts.map(async (hostPort) => {
      const colonIdx = hostPort.lastIndexOf(":");
      const host = colonIdx !== -1 ? hostPort.slice(0, colonIdx) : hostPort;
      const port = colonIdx !== -1 ? hostPort.slice(colonIdx) : "";
      const ip = await resolveHost(host);
      return ip + port;
    }),
  );

  let resolvedUrl = url.replace(hostsStr, resolved.join(","));

  if (!resolvedUrl.includes("tlsAllowInvalidCertificates")) {
    resolvedUrl += resolvedUrl.includes("?")
      ? "&tlsAllowInvalidCertificates=true"
      : "?tlsAllowInvalidCertificates=true";
  }

  return resolvedUrl;
}

// ── 3. Connect via Prisma ──────────────────────────────────────────────
async function main() {
  const resolvedUrl = await resolveDatabaseUrl(DATABASE_URL);

  const resolvedSafe = resolvedUrl.replace(
    /\/\/([^:]+):([^@]+)@/,
    "//$1:****@",
  );
  console.log(`\n📎 Resolved URL (masked): ${resolvedSafe}\n`);

  const prisma = new PrismaClient({
    datasourceUrl: resolvedUrl,
    log: ["query", "info", "warn", "error"],
  });

  try {
    console.log("🔌 Connecting to MongoDB via Prisma...");
    await prisma.$connect();
    console.log("✅ Connected!\n");

    // Quick read test — count organizations & medics
    const [orgCount, medicCount] = await Promise.all([
      prisma.organization.count(),
      prisma.medic.count(),
    ]);
    console.log(`   Organizations: ${orgCount}`);
    console.log(`   Medics:        ${medicCount}`);
    console.log("\n✅ All good — MongoDB is reachable and Prisma works.");
  } catch (err) {
    console.error("\n❌ Prisma connection failed:");
    console.error(err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

