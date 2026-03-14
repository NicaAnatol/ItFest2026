import type { NextRequest } from "next/server";
import {
  authkit,
  handleAuthkitHeaders,
} from "@workos-inc/authkit-nextjs";

export async function proxy(request: NextRequest) {
  const { session, headers, authorizationUrl } = await authkit(request);
  const { pathname } = request.nextUrl;

  // Protected routes: redirect unauthenticated users to sign-in
  if (!session.user && pathname.startsWith("/dashboard")) {
    if (authorizationUrl) {
      return handleAuthkitHeaders(request, headers, {
        redirect: authorizationUrl,
      });
    }
    return handleAuthkitHeaders(request, headers, { redirect: "/" });
  }

  // For all other requests, continue with session headers (handles cookie refresh)
  return handleAuthkitHeaders(request, headers);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|data/).*)",
  ],
};

