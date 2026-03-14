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

  // Auto-create medic record on first visit
  await findOrCreateMedic({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    profilePictureUrl: user.profilePictureUrl,
  });

  return <DashboardShell>{children}</DashboardShell>;
}
