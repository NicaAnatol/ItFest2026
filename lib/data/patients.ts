import type {
  PatientFlowsData,
  PatientGraph,
  PatientNode,
  PatientEdge,
} from "@/lib/types/patient";

// ─── Cache ───

let _cache: PatientFlowsData | null = null;

async function loadData(): Promise<PatientFlowsData> {
  if (_cache) return _cache;

  const res = await fetch("/api/patients");
  if (!res.ok) throw new Error("Failed to load patient data");
  const data: PatientFlowsData = await res.json();
  _cache = data;
  return data;
}

/** Force reload data (e.g. after HMR) */
export function invalidateCache() {
  _cache = null;
}

// ─── Queries ───

/** Get all patients (graph metadata only, no full node data to keep light) */
export async function getAllPatients(): Promise<PatientGraph[]> {
  const data = await loadData();
  return data.patients;
}

/** Get a single patient by ID */
export async function getPatientById(
  id: string,
): Promise<PatientGraph | undefined> {
  const data = await loadData();
  return data.patients.find((p) => p.patient_id === id);
}

/** Get all nodes for a patient */
export async function getPatientNodes(id: string): Promise<PatientNode[]> {
  const patient = await getPatientById(id);
  return patient?.nodes ?? [];
}

/** Get a single node by patientId + nodeId */
export async function getNodeById(
  patientId: string,
  nodeId: string,
): Promise<PatientNode | undefined> {
  const nodes = await getPatientNodes(patientId);
  return nodes.find((n) => n.node_id === nodeId);
}

/** Get edge list for a patient (for graph rendering) */
export async function getPatientEdges(id: string): Promise<PatientEdge[]> {
  const patient = await getPatientById(id);
  return patient?.edges ?? [];
}

/** Get global metadata & statistics */
export async function getMetadata() {
  const data = await loadData();
  return data.metadata;
}
