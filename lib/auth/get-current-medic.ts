import { withAuth } from "@workos-inc/authkit-nextjs";
import { findOrCreateMedic } from "@/lib/db/medics";
import type { Medic } from "@/lib/types/medic";

/**
 * Server-side helper: resolve the currently authenticated medic.
 * Call from API routes and server components.
 * Throws redirect if not signed in.
 */
export async function getCurrentMedic(): Promise<Medic> {
  const { user } = await withAuth({ ensureSignedIn: true });

  const medic = await findOrCreateMedic({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    profilePictureUrl: user.profilePictureUrl,
  });

  return medic;
}

