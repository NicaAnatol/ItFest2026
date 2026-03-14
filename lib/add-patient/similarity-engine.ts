// Partial-patient similarity engine for the Add Patient wizard.
// Adapts the weighted scoring from cross-case-utils.ts for in-progress patients.

import type { PatientGraph, TriageCode, OutcomeStatus } from "@/lib/types/patient";
import type { PatientMatch } from "@/lib/types/cross-case";

// ─── Partial patient shape built by the wizard ───

export interface PartialPatient {
  patient_name: string;
  age: number;
  gender: string;
  weight_kg?: number;
  height_cm?: number;
  chief_complaint: string;
  triage_code: TriageCode;
  admission_method: string;
  chronic_conditions: string[];
  allergies: string[];
  risk_factors: string[];
  // After triage step
  vitals?: {
    systolic?: number;
    diastolic?: number;
    heart_rate?: number;
    respiratory_rate?: number;
    oxygen_saturation?: number;
    temperature?: number;
    gcs?: number;
    pain?: number;
  };
  symptoms?: string[];
  // After diagnostic step
  diagnosis?: {
    primary_name: string;
    primary_icd10: string;
    severity: string;
    acuity: string;
    differentials?: Array<{ name: string; probability: number }>;
  };
  lab_results?: {
    hemoglobin?: number;
    white_blood_cells?: number;
    creatinine?: number;
    troponin?: number;
    d_dimer?: number;
    lactate?: number;
  };
  // After treatment step
  treatment?: {
    action: string;
    action_category: string;
    medications: string[];
    reasoning: string;
  };
  // Additional clinical decision nodes
  nodes?: Array<{
    primary_name: string;
    primary_icd10: string;
    severity: string;
    action: string;
    action_category: string;
    medications: string[];
    complications: string[];
  }>;
  // Completed step indices (0=admission, 1=triage, 2=diagnostic, 3=treatment, 4+=nodes)
  completedSteps: number;
}

export interface SimilarityAlert {
  id: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  message: string;
  patientId: string;
  patientName: string;
  outcome: OutcomeStatus;
  similarityScore: number;
}

// ─── Main similarity scorer ───

export function findSimilarPatientsPartial(
  partial: PartialPatient,
  allPatients: PatientGraph[],
  topK = 10,
): PatientMatch[] {
  const scored: PatientMatch[] = [];

  for (const p of allPatients) {
    const firstNode = p.nodes[0];
    if (!firstNode) continue;

    let score = 0;
    let maxPossible = 0;

    // ── Step 0: Admission data (always available) ──

    // Chief complaint match
    maxPossible += 0.10;
    if (
      partial.chief_complaint &&
      p.admission.chief_complaint.toLowerCase().includes(partial.chief_complaint.toLowerCase())
    ) {
      score += 0.10;
    }

    // Age similarity
    maxPossible += 0.15;
    const pAge = firstNode.patient_state.demographics.age;
    const ageDiff = Math.abs(pAge - partial.age);
    if (ageDiff <= 10) score += 0.15;
    else if (ageDiff <= 20) score += 0.08;
    else if (ageDiff <= 30) score += 0.03;

    // Gender match
    maxPossible += 0.05;
    if (firstNode.patient_state.demographics.gender === partial.gender) {
      score += 0.05;
    }

    // Triage code match
    maxPossible += 0.10;
    if (p.admission.triage_code === partial.triage_code) {
      score += 0.10;
    }

    // Chronic conditions overlap
    maxPossible += 0.15;
    const pChronics = new Set(
      firstNode.patient_state.medical_history.chronic_conditions.map((c) => c.condition.toLowerCase()),
    );
    const refChronics = new Set(partial.chronic_conditions.map((c) => c.toLowerCase()));
    const shared: string[] = [];
    for (const c of refChronics) {
      if (pChronics.has(c)) shared.push(c);
    }
    const unionSize = new Set([...refChronics, ...pChronics]).size;
    if (unionSize > 0) {
      score += 0.15 * (shared.length / unionSize);
    }

    // ── Step 1: Triage (vitals) ──
    if (partial.completedSteps >= 1 && partial.vitals) {
      maxPossible += 0.10;
      const pVitals = firstNode.patient_state.vitals;
      let vitalsScore = 0;
      let vitalsCount = 0;

      if (partial.vitals.systolic != null) {
        vitalsCount++;
        const diff = Math.abs(pVitals.blood_pressure.systolic - partial.vitals.systolic);
        if (diff <= 20) vitalsScore += 1;
        else if (diff <= 40) vitalsScore += 0.5;
      }
      if (partial.vitals.heart_rate != null) {
        vitalsCount++;
        const diff = Math.abs(pVitals.heart_rate.value - partial.vitals.heart_rate);
        if (diff <= 15) vitalsScore += 1;
        else if (diff <= 30) vitalsScore += 0.5;
      }
      if (partial.vitals.oxygen_saturation != null) {
        vitalsCount++;
        const diff = Math.abs(pVitals.oxygen_saturation.value - partial.vitals.oxygen_saturation);
        if (diff <= 3) vitalsScore += 1;
        else if (diff <= 6) vitalsScore += 0.5;
      }
      if (partial.vitals.temperature != null) {
        vitalsCount++;
        const diff = Math.abs(pVitals.temperature.value - partial.vitals.temperature);
        if (diff <= 0.5) vitalsScore += 1;
        else if (diff <= 1.5) vitalsScore += 0.5;
      }

      if (vitalsCount > 0) {
        score += 0.10 * (vitalsScore / vitalsCount);
      }
    }

    // ── Step 2: Diagnostic ──
    if (partial.completedSteps >= 2 && partial.diagnosis) {
      // ICD-10 match (highest weight)
      maxPossible += 0.35;
      const pIcd = firstNode.patient_state.diagnosis.primary.icd10;
      const pDiagName = firstNode.patient_state.diagnosis.primary.name;
      if (partial.diagnosis.primary_icd10 === pIcd) {
        score += 0.35;
      } else if (
        partial.diagnosis.primary_icd10.slice(0, 3) === pIcd.slice(0, 3)
      ) {
        score += 0.20;
      } else if (
        partial.diagnosis.primary_name.toLowerCase() === pDiagName.toLowerCase()
      ) {
        score += 0.25;
      }

      // Severity match
      maxPossible += 0.10;
      const pSeverity = firstNode.patient_state.diagnosis.primary.severity;
      if (partial.diagnosis.severity === pSeverity) {
        score += 0.10;
      }

      // Lab similarity
      if (partial.lab_results) {
        maxPossible += 0.05;
        let labScore = 0;
        let labCount = 0;

        const pLabs = firstNode.patient_state.lab_results;
        if (partial.lab_results.creatinine != null && pLabs.chemistry?.creatinine) {
          labCount++;
          const diff = Math.abs(pLabs.chemistry.creatinine.value - partial.lab_results.creatinine);
          if (diff <= 0.3) labScore += 1;
          else if (diff <= 0.8) labScore += 0.5;
        }
        if (partial.lab_results.hemoglobin != null && pLabs.hematology?.hemoglobin) {
          labCount++;
          const diff = Math.abs(pLabs.hematology.hemoglobin.value - partial.lab_results.hemoglobin);
          if (diff <= 1.5) labScore += 1;
          else if (diff <= 3) labScore += 0.5;
        }
        if (partial.lab_results.troponin != null && pLabs.cardiac?.troponin) {
          labCount++;
          const diff = Math.abs(pLabs.cardiac.troponin.value - partial.lab_results.troponin);
          if (diff <= 0.05) labScore += 1;
          else if (diff <= 0.2) labScore += 0.5;
        }

        if (labCount > 0) {
          score += 0.05 * (labScore / labCount);
        }
      }
    }

    // ── Step 3: Treatment ──
    if (partial.completedSteps >= 3 && partial.treatment) {
      maxPossible += 0.10;
      // Check medication overlap
      const pMeds = new Set(
        firstNode.patient_state.medications_active.map((m) => m.medication.toLowerCase()),
      );
      const refMeds = new Set(partial.treatment.medications.map((m) => m.toLowerCase()));
      let medShared = 0;
      for (const m of refMeds) {
        if (pMeds.has(m)) medShared++;
      }
      const medUnion = new Set([...refMeds, ...pMeds]).size;
      if (medUnion > 0) {
        score += 0.05 * (medShared / medUnion);
      }

      // Action category match across first few nodes
      const pCategories = p.nodes.slice(0, 5).map((n) => n.decision.action_category);
      if (pCategories.includes(partial.treatment.action_category as never)) {
        score += 0.05;
      }
    }

    // ── Step 4+: Additional nodes ──
    if (partial.nodes && partial.nodes.length > 0) {
      maxPossible += 0.15;
      let nodeScore = 0;
      for (const refNode of partial.nodes) {
        // Match node diagnosis against any node in the existing patient
        for (const pNode of p.nodes) {
          if (refNode.primary_icd10 && pNode.patient_state.diagnosis.primary.icd10 === refNode.primary_icd10) {
            nodeScore += 0.3;
            break;
          }
          if (refNode.primary_name && pNode.patient_state.diagnosis.primary.name.toLowerCase() === refNode.primary_name.toLowerCase()) {
            nodeScore += 0.2;
            break;
          }
        }
        // Match complications
        const pComps = new Set(p.nodes.flatMap((n) => n.patient_state.complications_active.map((c) => c.type.toLowerCase())));
        for (const comp of refNode.complications) {
          if (pComps.has(comp.toLowerCase())) {
            nodeScore += 0.2;
            break;
          }
        }
        // Match action categories
        const pActions = new Set(p.nodes.map((n) => n.decision.action_category));
        if (pActions.has(refNode.action_category as never)) {
          nodeScore += 0.1;
        }
      }
      const maxNodeScore = partial.nodes.length * 0.6;
      score += 0.15 * Math.min(nodeScore / maxNodeScore, 1);
    }

    // Normalize score relative to how much data is available
    const displayScore = maxPossible > 0 ? score / maxPossible : score;

    if (score < 0.1) continue;

    const pFirstNode = firstNode;
    scored.push({
      patientId: p.patient_id,
      patientName: p.patient_name,
      similarityScore: Math.min(displayScore, 1),
      outcome: p.final_outcome.status,
      sharedDiagnosis: pFirstNode.patient_state.diagnosis.primary.name,
      sharedDiagnosisIcd10: pFirstNode.patient_state.diagnosis.primary.icd10,
      demographicOverlap: {
        ageDiff,
        sameGender: pFirstNode.patient_state.demographics.gender === partial.gender,
        sharedChronicConditions: shared,
        sameTriageCode: p.admission.triage_code === partial.triage_code,
      },
      losDays: p.discharge.duration_days,
      totalCost: p.final_outcome.summary.total_cost_eur,
      totalNodes: p.final_outcome.summary.total_nodes,
      complicationsTotal: p.final_outcome.summary.complications_total,
      qualityScore: p.flow_analytics.outcome_quality.quality_score,
      selected: true,
    });
  }

  return scored.sort((a, b) => b.similarityScore - a.similarityScore).slice(0, topK);
}

// ─── Risk flag generation ───

export function computeRiskFlags(
  matches: PatientMatch[],
  _partial: PartialPatient,
): SimilarityAlert[] {
  const alerts: SimilarityAlert[] = [];

  const highMatches = matches.filter((m) => m.similarityScore >= 0.5);
  const deceasedMatches = highMatches.filter((m) => m.outcome === "DECEASED");
  const complicatedMatches = highMatches.filter(
    (m) => m.outcome === "HEALED_WITH_COMPLICATIONS",
  );

  // Critical: deceased matches with high similarity
  for (const m of deceasedMatches) {
    alerts.push({
      id: `deceased-${m.patientId}`,
      severity: "CRITICAL",
      title: `High similarity with deceased patient`,
      message: `Patient ${m.patientName} (${(m.similarityScore * 100).toFixed(0)}% match) had diagnosis "${m.sharedDiagnosis}" and was DECEASED. Review their treatment path for potential risk factors.`,
      patientId: m.patientId,
      patientName: m.patientName,
      outcome: m.outcome,
      similarityScore: m.similarityScore,
    });
  }

  // Warning: complicated matches
  for (const m of complicatedMatches) {
    if (m.similarityScore >= 0.6) {
      alerts.push({
        id: `complicated-${m.patientId}`,
        severity: "WARNING",
        title: `Similar patient had complications`,
        message: `Patient ${m.patientName} (${(m.similarityScore * 100).toFixed(0)}% match) healed with ${m.complicationsTotal} complication(s). Consider preventive measures.`,
        patientId: m.patientId,
        patientName: m.patientName,
        outcome: m.outcome,
        similarityScore: m.similarityScore,
      });
    }
  }

  // Info: general high-match patterns
  if (highMatches.length >= 5) {
    const healedPct =
      highMatches.filter((m) => m.outcome === "HEALED").length / highMatches.length;
    const deceasedPct = deceasedMatches.length / highMatches.length;
    if (deceasedPct > 0.15) {
      alerts.push({
        id: "high-mortality-cohort",
        severity: "CRITICAL",
        title: "Elevated mortality in similar cohort",
        message: `${(deceasedPct * 100).toFixed(0)}% of the ${highMatches.length} most similar patients were deceased. This patient profile carries elevated risk.`,
        patientId: "",
        patientName: "",
        outcome: "DECEASED",
        similarityScore: 0,
      });
    } else if (healedPct > 0.8) {
      alerts.push({
        id: "good-prognosis",
        severity: "INFO",
        title: "Positive prognosis pattern",
        message: `${(healedPct * 100).toFixed(0)}% of similar patients (${highMatches.length} cases) were healed without complications. Good prognosis expected.`,
        patientId: "",
        patientName: "",
        outcome: "HEALED",
        similarityScore: 0,
      });
    }
  }

  return alerts.sort((a, b) => {
    const sev = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    return (sev[a.severity] ?? 3) - (sev[b.severity] ?? 3);
  });
}

