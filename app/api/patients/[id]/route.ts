import { NextRequest, NextResponse } from "next/server";
import { getCurrentMedic } from "@/lib/auth/get-current-medic";
import { getPatientById, deletePatient } from "@/lib/db/patients";

/** GET — get a single patient by ID (scoped to authenticated medic) */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const medic = await getCurrentMedic();
    const patient = await getPatientById(medic._id, id);

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
