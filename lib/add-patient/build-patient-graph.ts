// Converts wizard data into a PatientGraph structure matching patient-flows.json schema.

import type { PatientGraph, PatientNode, PatientEdge } from "@/lib/types/patient";
import type { ActionCategory } from "@/lib/types/decision";
import type { AdmissionData } from "@/components/add-patient/admission-step";
import type { TriageData } from "@/components/add-patient/triage-step";
import type { DiagnosticData } from "@/components/add-patient/diagnostic-step";
import type { TreatmentData } from "@/components/add-patient/treatment-step";
import type { OutcomeData } from "@/components/add-patient/outcome-step";

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replaceAll(/[xy]/g, (c) => {
    const r = Math.trunc(Math.random() * 16);
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

interface NodeBuildInput {
  patientId: string;
  sequence: number;
  admission: AdmissionData;
  triage: TriageData;
  diagnosis: DiagnosticData;
  action: string;
  actionCategory: ActionCategory;
  reasoning: string;
  guidelines: string;
  medications: Array<{ name: string; dose: string; route: string }>;
  orders: string[];
}

function buildNode(input: NodeBuildInput): PatientNode {
  const { patientId, sequence, admission, triage, diagnosis } = input;
  const now = new Date();
  const nodeTime = new Date(now.getTime() + sequence * 3_600_000);
  const nodeId = `${patientId}_NODE_${String(sequence).padStart(3, "0")}`;

  const meds = input.medications.map((m) => ({
    medication: m.name,
    dose: m.dose,
    status: "active",
  }));

  return {
    node_id: nodeId,
    patient_id: patientId,
    sequence,
    timestamp: {
      exact: nodeTime.toISOString(),
      day_of_week: nodeTime.toLocaleDateString("en-US", { weekday: "long" }),
      day_of_month: nodeTime.getDate(),
      month: nodeTime.getMonth() + 1,
      year: nodeTime.getFullYear(),
      hour: nodeTime.getHours(),
      minute: nodeTime.getMinutes(),
      time_of_day: nodeTime.getHours() < 12 ? "morning" : nodeTime.getHours() < 17 ? "afternoon" : "evening",
      shift: nodeTime.getHours() < 15 ? "day_shift" : nodeTime.getHours() < 23 ? "evening_shift" : "night_shift",
      is_weekend: nodeTime.getDay() === 0 || nodeTime.getDay() === 6,
      is_holiday: false,
    },
    duration: {
      time_since_admission: `${sequence}h`,
      time_since_admission_seconds: sequence * 3600,
      time_since_last_transition: sequence > 0 ? "1h" : null,
      time_since_last_transition_seconds: sequence > 0 ? 3600 : null,
      time_in_this_node: "1h",
      time_in_this_node_seconds: 3600,
    },
    patient_state: {
      demographics: {
        age: admission.age,
        gender: admission.gender,
        weight_kg: admission.weight_kg,
        height_cm: admission.height_cm,
        bmi: Math.round((admission.weight_kg / ((admission.height_cm / 100) ** 2)) * 100) / 100,
        ethnicity: "unknown",
        insurance_type: "public",
      },
      medical_history: {
        chronic_conditions: admission.chronic_conditions.map((c) => ({
          condition: c, icd10: "", severity: "moderate", controlled: true, medications: [],
        })),
        allergies: admission.allergies.map((a) => ({
          allergen: a, reaction: "unknown", severity: "moderate",
        })),
        risk_factors: admission.risk_factors,
      },
      diagnosis: {
        primary: {
          name: diagnosis.primary_name,
          icd10: diagnosis.primary_icd10,
          confidence: diagnosis.confidence,
          diagnosed_at_node: nodeId,
          severity: diagnosis.severity,
          acuity: diagnosis.acuity,
        },
        differential_diagnosis: (diagnosis.differentials ?? []).map((d) => ({
          name: d.name, probability: d.probability,
        })),
      },
      vitals: {
        blood_pressure: { systolic: triage.systolic, diastolic: triage.diastolic },
        heart_rate: { value: triage.heart_rate },
        respiratory_rate: { value: triage.respiratory_rate },
        oxygen_saturation: { value: triage.oxygen_saturation, on_oxygen: triage.on_oxygen },
        temperature: { value: triage.temperature, unit: "C" },
        consciousness: { level: triage.gcs >= 14 ? "alert" : "drowsy", gcs: triage.gcs },
        pain_score: triage.pain_score,
      },
      lab_results: {
        hematology: {
          hemoglobin: { value: diagnosis.hemoglobin ?? 13, unit: "g/dL", status: "normal" },
          white_blood_cells: { value: diagnosis.white_blood_cells ?? 7, unit: "10^9/L", status: "normal" },
        },
        chemistry: {
          creatinine: { value: diagnosis.creatinine ?? 1.0, unit: "mg/dL", status: "normal" },
          glucose: { value: diagnosis.glucose ?? 100, unit: "mg/dL", status: "normal" },
          potassium: { value: diagnosis.potassium ?? 4.0, unit: "mEq/L", status: "normal" },
        },
        cardiac: {
          troponin: { value: diagnosis.troponin ?? 0.01, unit: "ng/mL", status: "normal" },
        },
      },
      medications_active: meds,
      complications_active: [],
    },
    logistics: {
      location: {
        department: { id: "DEPT_EMERGENCY", name: "Emergency_Department", type: "emergency" },
      },
      personnel_assigned: {
        attending_physician: { id: "DR_001", name: "Dr. Assigned", experience_years: 10 },
        primary_nurse: { id: "NURSE_001", name: "Nurse Assigned", experience_years: 5 },
      },
      equipment_in_use: [],
    },
    decision: {
      action: input.action,
      action_category: input.actionCategory,
      made_by: {
        person_id: "DR_001", name: "Dr. Assigned", role: "attending_physician",
        experience_years: 10, decision_confidence: 0.85,
      },
      reasoning: {
        primary_reason: input.reasoning,
        supporting_evidence: [],
        guidelines_followed: input.guidelines ? [input.guidelines] : [],
      },
      alternatives_considered: [],
      orders: input.orders.map((o) => ({
        order_id: `ORD_${uuid().slice(0, 8)}`, type: "general", tests: [o],
      })),
      expected_outcome: {
        primary: "improvement",
        expected_timeline: { "24h": "reassess" },
      },
    },
    risk_assessment: {
      mortality_risk: { baseline: 0.03, from_this_decision: 0.01, total: 0.04 },
      complication_risk: { overall: 0.1 },
      potential_complications: [],
      interaction_risks: [],
      overlapping_decisions: [],
    },
    historical_analysis: {
      similar_cases: {
        total: 0,
        outcomes: {
          healed: { count: 0, percentage: 0 },
          healed_with_complications: { count: 0, percentage: 0 },
          died: { count: 0, percentage: 0 },
        },
      },
      flags: [],
      pattern_matching: { matched_standard_patterns: [], deadly_pattern_matches: [] },
    },
    execution: {
      status: "completed",
      started_at: nodeTime.toISOString(),
      completed_at: new Date(nodeTime.getTime() + 3600_000).toISOString(),
      duration: { total: "1h", total_seconds: 3600 },
      resources_consumed: { personnel: [], medications: [], equipment: [], consumables: [] },
      total_cost: { personnel: 50, medications: 20, equipment: 10, consumables: 5, total: 85 },
    },
    state_after: {
      location: { department: { id: "DEPT_EMERGENCY", name: "Emergency_Department" } },
      vitals: {
        blood_pressure: { systolic: triage.systolic, diastolic: triage.diastolic },
        heart_rate: { value: triage.heart_rate },
        oxygen_saturation: { value: triage.oxygen_saturation, on_oxygen: triage.on_oxygen },
      },
      complications_active: [],
      overall_status: { condition: "stable", trajectory: "improving" },
    },
    transition_outcome: {
      success: true,
      as_expected: true,
      net_impact: {
        patient_state_change: "stable",
        cost: 85,
        overall_assessment: "appropriate",
        decision_quality: "appropriate",
      },
    },
    metadata: {
      node_created_at: new Date().toISOString(),
      data_quality: { completeness: 0.8, accuracy_confidence: 0.75 },
    },
  };
}

export function buildPatientGraph(
  admission: AdmissionData,
  triage: TriageData,
  diagnostic: DiagnosticData,
  treatment: TreatmentData,
  assessments: DiagnosticData[],
  cycleTreatments: TreatmentData[],
  outcome: OutcomeData,
): PatientGraph {
  const patientId = `PAT_NEW_${Date.now().toString(36).toUpperCase()}`;
  const now = new Date();

  // Build nodes in order:
  // 0: initial (admission + triage + diagnostic + treatment)
  // then alternating: assessment node, cycle-treatment node, ...
  const nodes: PatientNode[] = [];
  let seq = 0;

  // Node 0: initial
  nodes.push(buildNode({
    patientId, sequence: seq++, admission, triage,
    diagnosis: diagnostic,
    action: treatment.action, actionCategory: treatment.action_category,
    reasoning: treatment.reasoning, guidelines: treatment.guidelines,
    medications: treatment.medications, orders: treatment.orders,
  }));

  // Cycle nodes: assessment → treatment pairs
  for (let i = 0; i < assessments.length; i++) {
    const assess = assessments[i];
    // Assessment node (diagnostic evaluation)
    nodes.push(buildNode({
      patientId, sequence: seq++, admission, triage,
      diagnosis: assess,
      action: "post_treatment_assessment", actionCategory: "diagnostic",
      reasoning: `Re-evaluation of patient status after treatment cycle ${i + 1}.`,
      guidelines: "", medications: [], orders: [],
    }));

    // Treatment node (if a follow-up treatment was given)
    if (i < cycleTreatments.length) {
      const treat = cycleTreatments[i];
      nodes.push(buildNode({
        patientId, sequence: seq++, admission, triage,
        diagnosis: assess, // latest diagnosis from the assessment
        action: treat.action, actionCategory: treat.action_category,
        reasoning: treat.reasoning, guidelines: treat.guidelines,
        medications: treat.medications, orders: treat.orders,
      }));
    }
  }

  // Build edges
  const edges: PatientEdge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      from: nodes[i].node_id,
      to: nodes[i + 1].node_id,
      type: "temporal",
      time_elapsed_seconds: 3600,
    });
  }

  const totalCost = nodes.length * 85;

  const finalComplications = outcome.complications.map((c) => ({
    complication_id: `COMP_${uuid().slice(0, 8)}`,
    type: c,
    icd10: "",
    severity: "moderate",
    permanent: outcome.status !== "HEALED",
    caused_by_node: nodes[nodes.length - 1].node_id,
    quality_of_life_impact: 0.1,
    requires_ongoing_treatment: outcome.status === "HEALED_WITH_COMPLICATIONS",
    estimated_lifetime_cost_eur: 5000,
  }));

  return {
    patient_id: patientId,
    patient_name: admission.patient_name,
    admission: {
      timestamp: now.toISOString(),
      method: admission.admission_method,
      chief_complaint: admission.chief_complaint,
      triage_code: admission.triage_code,
    },
    discharge: {
      timestamp: new Date(now.getTime() + nodes.length * 3600_000).toISOString(),
      duration_days: Math.max(1, Math.round(nodes.length / 6)),
      duration_hours: nodes.length,
    },
    final_outcome: {
      status: outcome.status,
      final_complications: finalComplications,
      discharge_destination: outcome.discharge_destination,
      readmission_risk_30day: outcome.readmission_risk,
      summary: {
        total_nodes: nodes.length,
        total_departments: 1,
        total_cost_eur: totalCost,
        complications_total: outcome.complications.length,
        complications_resolved: 0,
        complications_permanent: outcome.status !== "HEALED" ? outcome.complications.length : 0,
      },
    },
    nodes,
    edges,
    flow_analytics: {
      patient_id: patientId,
      total_nodes: nodes.length,
      total_duration_hours: nodes.length,
      department_utilization: [],
      investigation_summary: {
        total_investigations: 0,
        by_type: { laboratory: 0, imaging: 0, consultation: 0, procedure: 0 },
        total_cost: 0,
      },
      complication_tracking: { total_complications: outcome.complications.length, timeline: [] },
      decision_quality_analysis: { total_decisions: nodes.length, appropriate: nodes.length, suboptimal: 0 },
      cost_analysis: {
        total_cost_eur: totalCost,
        breakdown: { personnel: 0, investigations: 0, procedures: 0, medications: 0, hospitalization: 0, equipment: 0 },
        cost_per_day: totalCost,
      },
      outcome_quality: {
        final_status: outcome.status,
        preventable_complications: 0,
        quality_score: outcome.status === "HEALED" ? 0.9 : outcome.status === "HEALED_WITH_COMPLICATIONS" ? 0.6 : 0.3,
      },
    },
  };
}

