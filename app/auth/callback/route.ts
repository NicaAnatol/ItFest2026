import { handleAuth } from "@workos-inc/authkit-nextjs";

// baseURL tells WorkOS the real public origin so the post-auth redirect
// doesn't use the container's internal HOSTNAME (e.g. 0.0.0.0:3000).
const publicOrigin = process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI
  ? new URL(process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI).origin
  : undefined;

export const GET = handleAuth({
  returnPathname: "/dashboard",
  baseURL: publicOrigin,
});
