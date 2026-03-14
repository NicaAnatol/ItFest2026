import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function getJsonPath() {
  return join(process.cwd(), "public", "data", "patient-flows.json");
}

function readData() {
  const raw = readFileSync(getJsonPath(), "utf-8");
  return JSON.parse(raw);
}

function writeData(data: unknown) {
  writeFileSync(getJsonPath(), JSON.stringify(data, null, 2), "utf-8");
}

/** POST — add a new patient to patient-flows.json */
export async function POST(req: NextRequest) {
  try {
    const patient = await req.json();
    if (!patient?.patient_id) {
      return NextResponse.json({ error: "Missing patient_id" }, { status: 400 });
    }

    const data = readData();
    // Check for duplicate
    const existing = data.patients.findIndex(
      (p: { patient_id: string }) => p.patient_id === patient.patient_id,
    );
    if (existing === -1) {
      data.patients.push(patient);
    } else {
      data.patients[existing] = patient; // overwrite
    }

    // Update metadata counts
    data.metadata.total_patients = data.patients.length;
    data.metadata.statistics.total_patients = data.patients.length;

    writeData(data);

    return NextResponse.json({ ok: true, patient_id: patient.patient_id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

