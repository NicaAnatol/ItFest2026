import type { PatientGraph, PatientNode } from "@/lib/types/patient";
import type { Flag } from "@/lib/types/historical";
import type { ComplicationTimelineEntry, CostAnalysis } from "@/lib/types/patient";
import { getAllPatients, getPatientById } from "./patients";

// ─── Global Analytics ───

export async function getOutcomeDistribution() {
  const patients = await getAllPatients();
  const total = patients.length;
  const healed = patients.filter((p) => p.final_outcome.status === "HEALED").length;
  const complicated = patients.filter((p) => p.final_outcome.status === "HEALED_WITH_COMPLICATIONS").length;
  const deceased = patients.filter((p) => p.final_outcome.status === "DECEASED").length;

  return {
    total,
    healed: { count: healed, percentage: total ? (healed / total) * 100 : 0 },
    complicated: { count: complicated, percentage: total ? (complicated / total) * 100 : 0 },
    deceased: { count: deceased, percentage: total ? (deceased / total) * 100 : 0 },
  };
}

export async function getDiagnosisDistribution() {
  const patients = await getAllPatients();
  const map: Record<string, number> = {};
  for (const p of patients) {
    const diag = p.nodes[0]?.patient_state?.diagnosis?.primary?.name ?? "unknown";
    map[diag] = (map[diag] || 0) + 1;
  }
  return Object.entries(map)
    .map(([name, count]) => ({ name, count, percentage: (count / patients.length) * 100 }))
    .sort((a, b) => b.count - a.count);
}

export async function getAvgLOS() {
  const patients = await getAllPatients();
  if (!patients.length) return 0;
  return patients.reduce((s, p) => s + p.discharge.duration_days, 0) / patients.length;
}

export async function getTotalCost() {
  const patients = await getAllPatients();
  return patients.reduce((s, p) => s + (p.final_outcome.summary.total_cost_eur || 0), 0);
}

// ─── Per-Patient Analytics ───

export async function getFlaggedDecisions(patientId: string): Promise<{ node: PatientNode; flags: Flag[] }[]> {
  const patient = await getPatientById(patientId);
  if (!patient) return [];
  return patient.nodes
    .filter((n) => n.historical_analysis.flags.length > 0)
    .map((n) => ({ node: n, flags: n.historical_analysis.flags }));
}

export async function getComplicationsTimeline(patientId: string): Promise<ComplicationTimelineEntry[]> {
  const patient = await getPatientById(patientId);
  if (!patient) return [];
  return [...patient.flow_analytics.complication_tracking.timeline].sort(
    (a, b) => {
      // Sort by introduced_at node number
      const aNum = parseInt(a.introduced_at.replace("NODE_", ""), 10);
      const bNum = parseInt(b.introduced_at.replace("NODE_", ""), 10);
      return aNum - bNum;
    },
  );
}

export async function getCostBreakdown(patientId: string): Promise<CostAnalysis | null> {
  const patient = await getPatientById(patientId);
  if (!patient) return null;
  return patient.flow_analytics.cost_analysis;
}

export async function getDecisionQualityMetrics(patientId: string) {
  const patient = await getPatientById(patientId);
  if (!patient) return null;
  const { total_decisions, appropriate, suboptimal } = patient.flow_analytics.decision_quality_analysis;
  return {
    total_decisions,
    appropriate,
    suboptimal,
    appropriate_pct: total_decisions ? (appropriate / total_decisions) * 100 : 0,
    suboptimal_pct: total_decisions ? (suboptimal / total_decisions) * 100 : 0,
  };
}

/** Get a quick overview for each patient (for patient list) */
export function getPatientSummary(patient: PatientGraph) {
  const firstNode = patient.nodes[0];
  return {
    patient_id: patient.patient_id,
    patient_name: patient.patient_name,
    age: firstNode?.patient_state?.demographics?.age ?? 0,
    gender: firstNode?.patient_state?.demographics?.gender ?? "unknown",
    primary_diagnosis: firstNode?.patient_state?.diagnosis?.primary?.name ?? "unknown",
    diagnosis_icd10: firstNode?.patient_state?.diagnosis?.primary?.icd10 ?? "",
    outcome: patient.final_outcome.status,
    triage_code: patient.admission.triage_code,
    admission_date: patient.admission.timestamp,
    admission_method: patient.admission.method,
    chief_complaint: patient.admission.chief_complaint,
    los_days: patient.discharge.duration_days,
    total_cost_eur: patient.final_outcome.summary.total_cost_eur,
    total_nodes: patient.final_outcome.summary.total_nodes,
    total_departments: patient.final_outcome.summary.total_departments,
    complications_total: patient.final_outcome.summary.complications_total,
    discharge_destination: patient.final_outcome.discharge_destination,
    quality_score: patient.flow_analytics.outcome_quality.quality_score,
  };
}

