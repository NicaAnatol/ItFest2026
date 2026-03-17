import { NextRequest, NextResponse } from "next/server";
import { getCurrentMedic } from "@/lib/auth/get-current-medic";
import { getPatientById, deletePatient } from "@/lib/db/patients";

/** GET — get a single patient by ID (globally accessible with optional scope) */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope'); // 'own' or 'all'

    let patient;

    if (scope === 'own') {
      // Get only if it belongs to authenticated user
      const medic = await getCurrentMedic();
      patient = await getPatientById(medic._id, id);
    } else {
      // Get globally (for simulation viewing)
      patient = await getPatientById(null, id);
    }

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json(patient);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE — remove a patient (scoped to authenticated medic) */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const medic = await getCurrentMedic();
    const deleted = await deletePatient(medic._id, id);

    if (!deleted) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, deleted: id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
