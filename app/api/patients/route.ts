import { NextRequest, NextResponse } from "next/server";
import { getCurrentMedic } from "@/lib/auth/get-current-medic";
import { getAllPatients, upsertPatient } from "@/lib/db/patients";

/** GET — list all patients (globally accessible for simulation viewing) */
export async function GET(request: NextRequest) {
  try {
    // Check if user wants their own patients or all patients
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope'); // 'own' or 'all'

    let patients;
    let medicId: string | undefined;

    if (scope === 'own') {
      // Get only authenticated user's patients
      const medic = await getCurrentMedic();
      medicId = medic._id;
      patients = await getAllPatients(medicId);
    } else {
      // Get all patients globally (for simulation viewing)
      patients = await getAllPatients();
    }

    // Build lightweight metadata on-the-fly
    const healed = patients.filter((p) => p.final_outcome.status === "HEALED").length;
    const complicated = patients.filter(
      (p) => p.final_outcome.status === "HEALED_WITH_COMPLICATIONS",
    ).length;
    const deceased = patients.filter((p) => p.final_outcome.status === "DECEASED").length;

    const metadata = {
      description: "MedGraph AI patient flows (MongoDB)",
      version: "3.0.0",
      schema: "patient-decision-graph",
      generated_at: new Date().toISOString(),
      total_patients: patients.length,
      scope: scope === 'own' ? 'personal' : 'global',
      statistics: {
        total_patients: patients.length,
        outcomes: { healed, healed_with_complications: complicated, deceased },
        diagnoses: {} as Record<string, number>,
        avg_los_days: 0,
        avg_nodes_per_patient: 0,
        total_cost_eur: 0,
        avg_cost_per_patient_eur: 0,
        total_complications: 0,
        generated_at: new Date().toISOString(),
      },
    };

    // Compute statistics
    if (patients.length > 0) {
      let totalLos = 0;
      let totalNodes = 0;
      let totalCost = 0;
      let totalComplications = 0;

      for (const p of patients) {
        totalLos += p.discharge.duration_days;
        totalNodes += p.nodes.length;
        totalCost += p.flow_analytics?.cost_analysis?.total_cost_eur ?? 0;
        totalComplications += p.final_outcome.final_complications?.length ?? 0;

        const diag = p.nodes[0]?.patient_state?.diagnosis?.primary?.name;
        if (diag) {
          metadata.statistics.diagnoses[diag] =
            (metadata.statistics.diagnoses[diag] ?? 0) + 1;
        }
      }

      metadata.statistics.avg_los_days = totalLos / patients.length;
      metadata.statistics.avg_nodes_per_patient = totalNodes / patients.length;
      metadata.statistics.total_cost_eur = totalCost;
      metadata.statistics.avg_cost_per_patient_eur = totalCost / patients.length;
      metadata.statistics.total_complications = totalComplications;
    }

    return NextResponse.json({ metadata, patients });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST — add/update a patient for the authenticated medic */
export async function POST(req: NextRequest) {
  try {
    const medic = await getCurrentMedic();
    const patient = await req.json();

    if (!patient?.patient_id) {
      return NextResponse.json({ error: "Missing patient_id" }, { status: 400 });
    }

    await upsertPatient(medic._id, patient);

    return NextResponse.json({ ok: true, patient_id: patient.patient_id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
