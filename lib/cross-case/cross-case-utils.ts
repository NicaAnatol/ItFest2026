// Cross-case pattern analysis utilities

import type { PatientGraph, PatientNode, OutcomeStatus } from "@/lib/types/patient";
import type { ActionCategory } from "@/lib/types/decision";
import type {
  PatientMatch,
  AlignedNodePair,
  AlignedNodeSummary,
  DecisionDivergence,
  DivergenceType,
  OutcomeCorrelation,
  PatternSummary,
  PatternNodeSummary,
} from "@/lib/types/cross-case";
import { countFlagsBySeverity } from "@/lib/decision/decision-utils";

// ─── Timing Buckets ───

function getTimingBucket(seconds: number): string {
  if (seconds <= 3600) return "0-1h";
  if (seconds <= 14400) return "1-4h";
  if (seconds <= 43200) return "4-12h";
  if (seconds <= 86400) return "12-24h";
  return "24h+";
}

function formatTimingDelta(seconds: number): string {
  const abs = Math.abs(seconds);
  if (abs < 60) return `${Math.round(abs)}s`;
  if (abs < 3600) return `${Math.round(abs / 60)}min`;
  return `${(abs / 3600).toFixed(1)}h`;
}

// ─── Node Summary Builder ───

function buildNodeSummary(
  node: PatientNode,
  patient: PatientGraph,
): AlignedNodeSummary {
  const flags = countFlagsBySeverity(node.historical_analysis.flags);
  return {
    patientId: patient.patient_id,
    patientName: patient.patient_name,
    nodeId: node.node_id,
    sequence: node.sequence,
    action: node.decision.action,
    actionCategory: node.decision.action_category,
    department: node.logistics.location.department.name,
    departmentId: node.logistics.location.department.id,
    timeSinceAdmissionSeconds: node.duration.time_since_admission_seconds,
    mortalityRisk: node.risk_assessment.mortality_risk.total,
    complicationRisk: node.risk_assessment.complication_risk.overall,
    flagsCount: flags.info + flags.warning + flags.critical,
    criticalFlags: flags.critical,
    decisionQuality: node.transition_outcome.net_impact.decision_quality,
    outcome: patient.final_outcome.status,
    transitionSuccess: node.transition_outcome.success,
  };
}

// ─── 1. Find Similar Patients ───

export function findSimilarPatients(
  reference: PatientGraph,
  allPatients: PatientGraph[],
  topK = 10,
): PatientMatch[] {
  const refFirstNode = reference.nodes[0];
  if (!refFirstNode) return [];

  const refDiagnosis = refFirstNode.patient_state.diagnosis.primary.icd10;
  const refDiagName = refFirstNode.patient_state.diagnosis.primary.name;
  const refAge = refFirstNode.patient_state.demographics.age;
  const refGender = refFirstNode.patient_state.demographics.gender;
  const refTriage = reference.admission.triage_code;
  const refChronics = new Set(
    refFirstNode.patient_state.medical_history.chronic_conditions.map(
      (c) => c.condition,
    ),
  );
  const refChiefComplaint = reference.admission.chief_complaint;

  const scored: PatientMatch[] = [];

  for (const p of allPatients) {
    if (p.patient_id === reference.patient_id) continue;

    const pFirstNode = p.nodes[0];
    if (!pFirstNode) continue;

    const pDiagnosis = pFirstNode.patient_state.diagnosis.primary.icd10;
    const pDiagName = pFirstNode.patient_state.diagnosis.primary.name;
    const pAge = pFirstNode.patient_state.demographics.age;
    const pGender = pFirstNode.patient_state.demographics.gender;
    const pTriage = p.admission.triage_code;
    const pChronics = new Set(
      pFirstNode.patient_state.medical_history.chronic_conditions.map(
        (c) => c.condition,
      ),
    );

    // Scoring: weighted similarity
    let score = 0;

    // ICD-10 match (highest weight)
    if (pDiagnosis === refDiagnosis) {
      score += 0.35;
    } else if (pDiagnosis.slice(0, 3) === refDiagnosis.slice(0, 3)) {
      // Same ICD-10 category
      score += 0.20;
    } else if (pDiagName === refDiagName) {
      score += 0.25;
    }

    // Chief complaint match
    if (p.admission.chief_complaint === refChiefComplaint) {
      score += 0.10;
    }

    // Age similarity (within 10 years = full score, 20 years = half)
    const ageDiff = Math.abs(pAge - refAge);
    if (ageDiff <= 10) score += 0.15;
    else if (ageDiff <= 20) score += 0.08;
    else if (ageDiff <= 30) score += 0.03;

    // Gender match
    if (pGender === refGender) score += 0.05;

    // Triage code match
    if (pTriage === refTriage) score += 0.10;

    // Chronic conditions overlap (Jaccard-like)
    const sharedChronics: string[] = [];
    for (const c of refChronics) {
      if (pChronics.has(c)) sharedChronics.push(c);
    }
    const unionSize = new Set([...refChronics, ...pChronics]).size;
    if (unionSize > 0) {
      score += 0.15 * (sharedChronics.length / unionSize);
    }

    // Acuity/severity similarity
    const refSeverity = refFirstNode.patient_state.diagnosis.primary.severity;
    const pSeverity = pFirstNode.patient_state.diagnosis.primary.severity;
    if (refSeverity === pSeverity) score += 0.10;

    // Only include patients with a meaningful similarity score
    if (score < 0.15) continue;

    scored.push({
      patientId: p.patient_id,
      patientName: p.patient_name,
      similarityScore: Math.min(score, 1),
      outcome: p.final_outcome.status,
      sharedDiagnosis: pDiagName,
      sharedDiagnosisIcd10: pDiagnosis,
      demographicOverlap: {
        ageDiff,
        sameGender: pGender === refGender,
        sharedChronicConditions: sharedChronics,
        sameTriageCode: pTriage === refTriage,
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

// ─── 2. Align Decision Graphs ───

function getStageKey(node: PatientNode): string {
  // Group by action_category + a coarse sequence indicator
  const category = node.decision.action_category;
  // Count how many nodes of this category appear before this one
  return `${category}-${node.sequence}`;
}

function getStageLabel(node: PatientNode): string {
  const category = node.decision.action_category;
  return `#${node.sequence} ${category.replace(/_/g, " ")}`;
}

export function alignDecisionGraphs(
  reference: PatientGraph,
  compared: PatientGraph[],
): AlignedNodePair[] {
  const refNodes = [...reference.nodes].sort((a, b) => a.sequence - b.sequence);

  const result: AlignedNodePair[] = [];

  for (const refNode of refNodes) {
    const stageKey = getStageKey(refNode);
    const stageLabel = getStageLabel(refNode);
    const refSummary = buildNodeSummary(refNode, reference);

    const comparedSummaries: AlignedNodeSummary[] = [];

    for (const compPatient of compared) {
      // Find the best matching node in the compared patient:
      // 1. Same action_category
      // 2. Closest in time_since_admission
      const candidates = compPatient.nodes.filter(
        (n) => n.decision.action_category === refNode.decision.action_category,
      );

      if (candidates.length === 0) continue;

      // Sort by timing proximity
      const best = candidates.reduce((closest, curr) => {
        const currDelta = Math.abs(
          curr.duration.time_since_admission_seconds -
            refNode.duration.time_since_admission_seconds,
        );
        const closestDelta = Math.abs(
          closest.duration.time_since_admission_seconds -
            refNode.duration.time_since_admission_seconds,
        );
        return currDelta < closestDelta ? curr : closest;
      });

      comparedSummaries.push(buildNodeSummary(best, compPatient));
    }

    result.push({
      stageKey,
      stageLabel,
      referenceNode: refSummary,
      comparedNodes: comparedSummaries,
    });
  }

  return result;
}

// ─── 3. Find Divergence Points ───

export function findDivergencePoints(
  alignedPairs: AlignedNodePair[],
): DecisionDivergence[] {
  const divergences: DecisionDivergence[] = [];

  for (const pair of alignedPairs) {
    for (const compared of pair.comparedNodes) {
      const ref = pair.referenceNode;
      let divergenceType: DivergenceType | null = null;
      let description = "";

      // Different action at same stage
      if (ref.action !== compared.action) {
        divergenceType = "different_action";
        description = `Reference chose "${ref.action.replace(/_/g, " ")}" while compared chose "${compared.action.replace(/_/g, " ")}" at the ${ref.actionCategory} stage`;
      }

      // Significant timing difference (> 2 hours)
      const timingDelta =
        compared.timeSinceAdmissionSeconds - ref.timeSinceAdmissionSeconds;
      if (Math.abs(timingDelta) > 7200 && !divergenceType) {
        divergenceType = "different_timing";
        description = `Action timing differs by ${formatTimingDelta(timingDelta)} — reference at ${getTimingBucket(ref.timeSinceAdmissionSeconds)} vs compared at ${getTimingBucket(compared.timeSinceAdmissionSeconds)}`;
      }

      // Different department
      if (ref.departmentId !== compared.departmentId && !divergenceType) {
        divergenceType = "different_department";
        description = `Same action category but in different departments: ${ref.department} vs ${compared.department}`;
      }

      if (divergenceType) {
        divergences.push({
          stageKey: pair.stageKey,
          stageLabel: pair.stageLabel,
          divergenceType,
          referenceNode: ref,
          comparedNode: compared,
          timingDeltaSeconds: timingDelta,
          outcomeImpact: {
            referenceOutcome: ref.outcome,
            comparedOutcome: compared.outcome,
            referenceQuality: ref.decisionQuality,
            comparedQuality: compared.decisionQuality,
          },
          description,
        });
      }
    }
  }

  return divergences;
}

// ─── 4. Compute Outcome Correlations ───

export function computeOutcomeCorrelations(
  reference: PatientGraph,
  matchedPatients: PatientGraph[],
): OutcomeCorrelation[] {
  const allPatients = [reference, ...matchedPatients];

  // Group decisions by action_category + action to find patterns
  const patternMap = new Map<
    string,
    Array<{
      patientId: string;
      outcome: OutcomeStatus;
      timingSeconds: number;
      action: string;
      category: ActionCategory;
    }>
  >();

  for (const patient of allPatients) {
    for (const node of patient.nodes) {
      const key = `${node.decision.action_category}::${node.decision.action}`;
      if (!patternMap.has(key)) patternMap.set(key, []);
      patternMap.get(key)!.push({
        patientId: patient.patient_id,
        outcome: patient.final_outcome.status,
        timingSeconds: node.duration.time_since_admission_seconds,
        action: node.decision.action,
        category: node.decision.action_category,
      });
    }
  }

  const correlations: OutcomeCorrelation[] = [];

  for (const [key, entries] of patternMap) {
    if (entries.length < 2) continue; // Only interesting if multiple patients share it

    const healed = entries.filter((e) => e.outcome === "HEALED").length;
    const complicated = entries.filter(
      (e) => e.outcome === "HEALED_WITH_COMPLICATIONS",
    ).length;
    const deceased = entries.filter((e) => e.outcome === "DECEASED").length;
    const total = entries.length;
    const successRate = total > 0 ? healed / total : 0;
    const mortalityRate = total > 0 ? deceased / total : 0;
    const avgTiming =
      entries.reduce((s, e) => s + e.timingSeconds, 0) / total;

    // Significance: compare to overall rates
    // If success or mortality deviates >15% from average, mark as significant
    const overallSuccess =
      allPatients.filter((p) => p.final_outcome.status === "HEALED").length /
      allPatients.length;
    const successDelta = Math.abs(successRate - overallSuccess);
    const significance: "high" | "moderate" | "low" =
      successDelta > 0.20
        ? "high"
        : successDelta > 0.10
          ? "moderate"
          : "low";

    const [category, action] = key.split("::");

    correlations.push({
      patternId: key.replace(/[^a-zA-Z0-9]/g, "_"),
      patternLabel: `${action.replace(/_/g, " ")} (${category})`,
      actionCategory: category as ActionCategory,
      sampleSize: total,
      outcomes: {
        healed,
        healedWithComplications: complicated,
        deceased,
      },
      successRate,
      mortalityRate,
      significance,
      avgTimingSeconds: avgTiming,
      patientIds: entries.map((e) => e.patientId),
    });
  }

  return correlations
    .sort((a, b) => {
      // Sort by significance then sample size
      const sigOrder = { high: 0, moderate: 1, low: 2 };
      const sigDiff = sigOrder[a.significance] - sigOrder[b.significance];
      if (sigDiff !== 0) return sigDiff;
      return b.sampleSize - a.sampleSize;
    })
    .slice(0, 20);
}

// ─── 5. Build Pattern Summary for AI ───

function buildPatternNodeSummary(node: PatientNode): PatternNodeSummary {
  const flags = countFlagsBySeverity(node.historical_analysis.flags);
  return {
    sequence: node.sequence,
    action: node.decision.action,
    category: node.decision.action_category,
    department: node.logistics.location.department.name,
    timingBucket: getTimingBucket(node.duration.time_since_admission_seconds),
    mortalityRisk: Math.round(node.risk_assessment.mortality_risk.total * 1000) / 1000,
    flags: flags.info + flags.warning + flags.critical,
    quality: node.transition_outcome.net_impact.decision_quality,
  };
}

export function buildPatternSummary(
  reference: PatientGraph,
  matches: PatientMatch[],
  matchedPatients: PatientGraph[],
  divergences: DecisionDivergence[],
  correlations: OutcomeCorrelation[],
): PatternSummary {
  const refFirst = reference.nodes[0];

  return {
    referencePatient: {
      id: reference.patient_id,
      name: reference.patient_name,
      diagnosis: refFirst?.patient_state?.diagnosis?.primary?.name ?? "unknown",
      icd10: refFirst?.patient_state?.diagnosis?.primary?.icd10 ?? "",
      age: refFirst?.patient_state?.demographics?.age ?? 0,
      gender: refFirst?.patient_state?.demographics?.gender ?? "unknown",
      outcome: reference.final_outcome.status,
      losDays: reference.discharge.duration_days,
      totalCost: reference.final_outcome.summary.total_cost_eur,
      complications: reference.final_outcome.summary.complications_total,
      triageCode: reference.admission.triage_code,
      decisionSequence: reference.nodes
        .sort((a, b) => a.sequence - b.sequence)
        .map(buildPatternNodeSummary),
    },
    comparedPatients: matchedPatients.map((p) => {
      const match = matches.find((m) => m.patientId === p.patient_id);
      return {
        id: p.patient_id,
        name: p.patient_name,
        outcome: p.final_outcome.status,
        similarityScore: match?.similarityScore ?? 0,
        losDays: p.discharge.duration_days,
        complications: p.final_outcome.summary.complications_total,
        decisionSequence: p.nodes
          .sort((a, b) => a.sequence - b.sequence)
          .map(buildPatternNodeSummary),
      };
    }),
    divergencePoints: divergences.slice(0, 15).map((d) => ({
      stage: d.stageLabel,
      type: d.divergenceType,
      referenceAction: d.referenceNode.action.replace(/_/g, " "),
      comparedAction: d.comparedNode.action.replace(/_/g, " "),
      timingDelta: formatTimingDelta(d.timingDeltaSeconds),
      referenceOutcome: d.referenceNode.outcome,
      comparedOutcome: d.comparedNode.outcome,
    })),
    outcomeCorrelations: correlations.slice(0, 10).map((c) => ({
      pattern: c.patternLabel,
      sampleSize: c.sampleSize,
      successRate: Math.round(c.successRate * 100),
      mortalityRate: Math.round(c.mortalityRate * 100),
      significance: c.significance,
    })),
  };
}

