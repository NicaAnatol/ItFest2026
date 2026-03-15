import { handleAuth } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";

const handler = handleAuth({ returnPathname: "/dashboard" });

/**
 * Wrapper around WorkOS handleAuth that fixes the redirect origin
 * when running behind a reverse proxy (ALB, nginx, Cloudflare, etc.).
 *
 * Without this, the standalone Next.js server may build redirect URLs
 * using its internal hostname (e.g. 0.0.0.0:3000) instead of the
 * public domain.
 */
export async function GET(request: NextRequest) {
  const response = await handler(request);

  // If it's a redirect, ensure the origin matches the public domain
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (location) {
      const forwardedHost =
        request.headers.get("x-forwarded-host") ?? request.headers.get("host");
      const forwardedProto =
        request.headers.get("x-forwarded-proto") ?? "https";

      if (forwardedHost) {
        try {
          const url = new URL(location);
          const publicOrigin = `${forwardedProto}://${forwardedHost}`;
          const fixedUrl = new URL(url.pathname + url.search, publicOrigin);

          if (fixedUrl.href !== location) {
            return NextResponse.redirect(fixedUrl, response.status);
          }
        } catch {
          // URL parsing failed — fall through to original response
        }
      }
    }
  }

  return response;
}
