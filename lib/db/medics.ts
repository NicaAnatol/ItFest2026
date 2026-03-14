import { prisma } from "@/lib/db/prisma";
import type { Medic as MedicType } from "@/lib/types/medic";

/**
 * Find an existing medic by WorkOS user ID, or create one.
 * Also links seed medics (matched by email) to the real WorkOS user.
 */
export async function findOrCreateMedic(workosUser: {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePictureUrl?: string | null;
}): Promise<MedicType> {
  // 1. Fast path — find by WorkOS user ID
  const byWorkos = await prisma.medic.findUnique({
    where: { workosUserId: workosUser.id },
  });
  if (byWorkos) return toMedicType(byWorkos);

  // 2. Link seed record (matched by email) to real WorkOS identity
  const byEmail = await prisma.medic.findUnique({
    where: { email: workosUser.email },
  });
  if (byEmail) {
    const updated = await prisma.medic.update({
      where: { id: byEmail.id },
      data: {
        workosUserId: workosUser.id,
        name:
          [workosUser.firstName, workosUser.lastName]
            .filter(Boolean)
            .join(" ") || byEmail.name,
        avatarUrl: workosUser.profilePictureUrl ?? byEmail.avatarUrl,
      },
    });
    return toMedicType(updated);
  }

  // 3. Brand new medic — ensure default org exists
  const org = await prisma.organization.upsert({
    where: { slug: "uvt-medical" },
    create: { name: "UVT Medical", slug: "uvt-medical" },
    update: {},
  });

  const medic = await prisma.medic.create({
    data: {
      workosUserId: workosUser.id,
      email: workosUser.email,
      name:
        [workosUser.firstName, workosUser.lastName]
          .filter(Boolean)
          .join(" ") || workosUser.email,
      avatarUrl: workosUser.profilePictureUrl ?? undefined,
      organizationId: org.id,
    },
  });

  return toMedicType(medic);
}

/**
 * Get medic by WorkOS user ID.
 */
export async function getMedicByWorkosId(
  workosUserId: string,
): Promise<MedicType | null> {
  const medic = await prisma.medic.findUnique({ where: { workosUserId } });
  return medic ? toMedicType(medic) : null;
}

// ─── Helpers ───

function toMedicType(row: {
  id: string;
  workosUserId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  organizationId: string;
  createdAt: Date;
}): MedicType {
  return {
    _id: row.id,
    workosUserId: row.workosUserId,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatarUrl ?? undefined,
    organizationId: row.organizationId,
    createdAt: row.createdAt.toISOString(),
  };
}
