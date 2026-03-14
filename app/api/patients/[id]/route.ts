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

/** DELETE — remove a patient from patient-flows.json */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const data = readData();
    const idx = data.patients.findIndex(
      (p: { patient_id: string }) => p.patient_id === id,
    );
    if (idx === -1) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    data.patients.splice(idx, 1);
    data.metadata.total_patients = data.patients.length;
    data.metadata.statistics.total_patients = data.patients.length;

    writeData(data);

    return NextResponse.json({ ok: true, deleted: id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

