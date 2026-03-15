import { handleAuth } from "@workos-inc/authkit-nextjs";
import { NextResponse, type NextRequest } from "next/server";

/**
 * WorkOS OAuth callback handler.
 *
 * Wraps `handleAuth` so that transient OAuth errors (expired auth codes,
 * invalid_client during Secrets Manager rotation, etc.) redirect the user
 * back to the sign-in page instead of showing a raw 500.
 */
const workosHandler = handleAuth({ returnPathname: "/dashboard" });

export async function GET(request: NextRequest) {
  try {
    return await workosHandler(request);
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : String(err);

    // Log for CloudWatch visibility
    console.error("[auth/callback] OAuth exchange failed:", msg);

    // Redirect to home (sign-in page) instead of crashing
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = ""; // strip ?code=… so the stale code isn't retried
    return NextResponse.redirect(url);
  }
}
