import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

import dns from "node:dns";
import dnsPromises from "node:dns/promises";
import { PrismaClient } from "@prisma/client";

// Force Node.js to prefer IPv4 — prevents IPv6 timeouts on Windows
dns.setDefaultResultOrder("ipv4first");

const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) {
  console.error("❌ Missing DATABASE_URL in .env.local");
  process.exit(1);
}

const DEFAULT_MEDIC_EMAIL = "emanuel.rusu03@e-uvt.ro";
const DEFAULT_MEDIC_NAME = "Rusu Emanuel";

/**
 * Resolve a single hostname to IPv4, trying multiple strategies.
 */
async function resolveHost(host: string): Promise<string> {
  // Strategy 1: dns.lookup with family:4
  try {
    const { address } = await dnsPromises.lookup(host, { family: 4 });
    return address;
  } catch (e) {
    console.warn(`   ⚠️  dns.lookup failed for ${host}: ${(e as Error).message}`);
  }

  // Strategy 2: dns.resolve4 (direct A record query)
  try {
    const addresses = await dnsPromises.resolve4(host);
    if (addresses.length > 0) return addresses[0];
  } catch (e) {
    console.warn(`   ⚠️  dns.resolve4 failed for ${host}: ${(e as Error).message}`);
  }

  // All strategies failed — return original
  console.error(`   ❌ Could not resolve ${host} to IPv4`);
  return host;
}

/**
 * Resolve MongoDB Atlas hostnames to IPv4 — same logic as instrumentation.ts
 * but runs standalone (outside Next.js).
 */
async function resolveDatabaseUrl(url: string): Promise<string> {
  const hostMatch = url.match(/@([^/?]+)/);
  if (!hostMatch) return url;

  const hostsStr = hostMatch[1];
  const hosts = hostsStr.split(",");

  const resolved = await Promise.all(
    hosts.map(async (hostPort) => {
      const colonIdx = hostPort.lastIndexOf(":");
      const host = colonIdx !== -1 ? hostPort.slice(0, colonIdx) : hostPort;
      const port = colonIdx !== -1 ? hostPort.slice(colonIdx) : "";

      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return hostPort;

      const ip = await resolveHost(host);
      if (ip !== host) {
        console.log(`   DNS: ${host} → ${ip}`);
      }
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

/**
 * Seeds MongoDB with auth data only (Organization + Medic).
 * Patient graph data is seeded into Neo4j via `npm run seed:neo4j`.
 */
async function main() {
  console.log("🔍 Resolving MongoDB hostnames...");
  const resolvedUrl = await resolveDatabaseUrl(DATABASE_URL);
  process.env.DATABASE_URL = resolvedUrl;

  const prisma = new PrismaClient({
    datasourceUrl: resolvedUrl,
    log: ["warn", "error"],
  });

  console.log("🔌 Connecting to MongoDB via Prisma...");
  await prisma.$connect();
  console.log("✅ Connected!");

  try {
    // ─── 1. Ensure default organization ───
    const org = await prisma.organization.upsert({
      where: { slug: "uvt-medical" },
      create: { name: "UVT Medical", slug: "uvt-medical" },
      update: {},
    });
    console.log(`🏥 Organization: ${org.name} (${org.id})`);

    // ─── 2. Ensure default medic ───
    let medic = await prisma.medic.findUnique({
      where: { email: DEFAULT_MEDIC_EMAIL },
    });

    if (!medic) {
      medic = await prisma.medic.create({
        data: {
          workosUserId: "__seed_placeholder__",
          email: DEFAULT_MEDIC_EMAIL,
          name: DEFAULT_MEDIC_NAME,
          organizationId: org.id,
        },
      });
      console.log(`👨‍⚕️ Created medic: ${DEFAULT_MEDIC_NAME} (${DEFAULT_MEDIC_EMAIL})`);
    } else {
      console.log(`👨‍⚕️ Medic exists: ${medic.name} (${medic.email})`);
    }

    console.log(`\n🎉 Auth seed complete!`);
    console.log(`   Organization: UVT Medical`);
    console.log(`   Medic: ${medic.name} <${medic.email}> (${medic.id})`);
    console.log(`\n💡 Now run: npm run seed:neo4j  (to seed patient graph data)`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
