/**
 * Next.js Instrumentation — runs once at server startup, before any route handler.
 * Resolves MongoDB Atlas hostnames to IPv4 addresses so the Prisma engine
 * doesn't need to do DNS (its Rust DNS resolver fails on Windows when IPv6
 * is half-configured but has no route).
 */
export async function register() {
  // Only run on Node.js runtime, not Edge
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }

  // ── Force IPv4-first globally ────────────────────────────────────────
  // Must happen before any network call (Prisma, fetch, etc.).
  const dns = await import("node:dns");
  dns.setDefaultResultOrder("ipv4first");
  console.log("[instrumentation] dns.setDefaultResultOrder → ipv4first");

  const url = process.env.DATABASE_URL;
  if (!url || !url.includes("mongodb")) return;

  try {
    const dnsPromises = await import("node:dns/promises");

    // Extract the hosts section: everything between @ and /dbname
    const hostMatch = url.match(/@([^/?]+)/);
    if (!hostMatch) return;

    const hostsStr = hostMatch[1];
    const hosts = hostsStr.split(",");

    const resolved = await Promise.all(
      hosts.map(async (hostPort) => {
        const colonIdx = hostPort.lastIndexOf(":");
        const host = colonIdx !== -1 ? hostPort.slice(0, colonIdx) : hostPort;
        const port = colonIdx !== -1 ? hostPort.slice(colonIdx) : "";

        // Already an IP — skip
        if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return hostPort;

        // ── Primary: dns.lookup (uses OS resolver) ───────────────────
        try {
          const { address } = await dnsPromises.lookup(host, { family: 4 });
          console.log(`[instrumentation] dns.lookup  ${host} → ${address}`);
          return address + port;
        } catch (lookupErr) {
          console.warn(
            `[instrumentation] dns.lookup FAILED for ${host}:`,
            lookupErr instanceof Error ? lookupErr.message : lookupErr,
          );
        }

        // ── Fallback: dns.resolve4 (queries DNS directly, bypasses OS) ─
        try {
          const addresses = await dnsPromises.resolve4(host);
          const address = addresses[0];
          console.log(`[instrumentation] dns.resolve4 ${host} → ${address}`);
          return address + port;
        } catch (resolveErr) {
          console.error(
            `[instrumentation] dns.resolve4 ALSO FAILED for ${host}:`,
            resolveErr instanceof Error ? resolveErr.message : resolveErr,
          );
        }

        // Both methods failed — keep original so the error surfaces clearly
        console.error(
          `[instrumentation] ⚠ Could not resolve ${host} — Prisma will likely fail to connect`,
        );
        return hostPort;
      }),
    );

    let resolvedUrl = url.replace(hostsStr, resolved.join(","));

    // Skip certificate hostname check (cert is for *.mongodb.net, not the resolved IP).
    // Prisma's MongoDB connector supports tlsAllowInvalidCertificates, NOT tlsAllowInvalidHostnames.
    if (!resolvedUrl.includes("tlsAllowInvalidCertificates")) {
      resolvedUrl += resolvedUrl.includes("?")
        ? "&tlsAllowInvalidCertificates=true"
        : "?tlsAllowInvalidCertificates=true";
    }

    process.env.DATABASE_URL = resolvedUrl;
    console.log("[instrumentation] Resolved MongoDB hostnames to IPv4");
  } catch (err) {
    console.warn("[instrumentation] DNS pre-resolution failed:", err);
  }
}

