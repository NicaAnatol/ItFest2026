import { withAuth } from "@workos-inc/authkit-nextjs";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { findOrCreateMedic } from "@/lib/db/medics";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirect to WorkOS sign-in if not authenticated
  const { user } = await withAuth({ ensureSignedIn: true });

  // Auto-create medic record on first visit (optional - skip if DB unavailable)
  try {
    await findOrCreateMedic({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePictureUrl: user.profilePictureUrl,
    });
  } catch (error) {
    // Log but don't block - allow dashboard to work without MongoDB
    console.warn('[Dashboard] MongoDB unavailable, skipping medic creation:', error instanceof Error ? error.message : 'Unknown error');
  }

  return <DashboardShell>{children}</DashboardShell>;
}
