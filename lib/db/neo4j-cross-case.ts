/**
 * Cross-case analysis powered by Neo4j Cypher queries.
 *
 * Replaces the client-side O(n²) loops in cross-case-utils.ts with
 * server-side graph pattern matching. Much more efficient and enables
 * queries impossible with document-store flat scans.
 */
import { getSession } from "@/lib/db/neo4j";
import type { OutcomeStatus } from "@/lib/types/patient";
import type {
  PatientMatch,
  AlignedNodePair,
  AlignedNodeSummary,
  DecisionDivergence,
  DivergenceType,
  OutcomeCorrelation,
} from "@/lib/types/cross-case";
import type { ActionCategory } from "@/lib/types/decision";

// ─── Timing helpers ───

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

// ─── 1. Find Similar Patients (Neo4j) ───

export async function findSimilarPatients(
  medicId: string,
  referencePatientId: string,
  topK = 10,
): Promise<PatientMatch[]> {
  const session = getSession();
  try {
    const result = await session.run(
      `
      // Get reference patient properties
      MATCH (ref:Patient {patientId: $refId, medicId: $medicId})

      // Find other patients for same medic
      MATCH (cmp:Patient {medicId: $medicId})
      WHERE cmp.patientId <> ref.patientId

      // Compute similarity score
      WITH ref, cmp,
        // ICD-10 exact match = 0.35, same category (first 3 chars) = 0.20
        CASE
          WHEN cmp.diagnosisIcd10 = ref.diagnosisIcd10 THEN 0.35
          WHEN substring(cmp.diagnosisIcd10, 0, 3) = substring(ref.diagnosisIcd10, 0, 3) THEN 0.20
          WHEN cmp.diagnosisName = ref.diagnosisName THEN 0.25
          ELSE 0
        END AS diagScore,
        // Chief complaint match
        CASE WHEN cmp.chiefComplaint = ref.chiefComplaint THEN 0.10 ELSE 0 END AS ccScore,
        // Age similarity
        CASE
          WHEN abs(cmp.age - ref.age) <= 10 THEN 0.15
          WHEN abs(cmp.age - ref.age) <= 20 THEN 0.08
          WHEN abs(cmp.age - ref.age) <= 30 THEN 0.03
          ELSE 0
        END AS ageScore,
        // Gender match
        CASE WHEN cmp.gender = ref.gender THEN 0.05 ELSE 0 END AS genderScore,
        // Triage code match
        CASE WHEN cmp.triageCode = ref.triageCode THEN 0.10 ELSE 0 END AS triageScore,
        // Severity — compare outcome quality score proximity
        CASE WHEN abs(cmp.qualityScore - ref.qualityScore) < 0.2 THEN 0.10 ELSE 0 END AS sevScore,
        abs(cmp.age - ref.age) AS ageDiff

      WITH ref, cmp, ageDiff,
        diagScore + ccScore + ageScore + genderScore + triageScore + sevScore AS totalScore

      WHERE totalScore >= 0.15

      RETURN
        cmp.patientId       AS patientId,
        cmp.patientName     AS patientName,
        CASE WHEN totalScore > 1 THEN 1.0 ELSE totalScore END AS similarityScore,
        cmp.outcome         AS outcome,
        cmp.diagnosisName   AS sharedDiagnosis,
        cmp.diagnosisIcd10  AS sharedDiagnosisIcd10,
        ageDiff             AS ageDiff,
        cmp.gender = ref.gender AS sameGender,
        cmp.triageCode = ref.triageCode AS sameTriageCode,
        cmp.losDays         AS losDays,
        cmp.totalCost       AS totalCost,
        cmp.qualityScore    AS qualityScore

      ORDER BY similarityScore DESC
      LIMIT $topK
      `,
      { refId: referencePatientId, medicId, topK },
    );

    // Get node counts for each matched patient
    const patientIds = result.records.map((r) => r.get("patientId") as string);
    const countsResult = await session.run(
      `
      UNWIND $ids AS pid
      MATCH (p:Patient {patientId: pid})-[:HAS_NODE]->(dn:DecisionNode)
      RETURN p.patientId AS patientId, count(dn) AS nodeCount
      `,
      { ids: patientIds },
    );
    const nodeCounts = new Map<string, number>();
    for (const r of countsResult.records) {
      nodeCounts.set(r.get("patientId") as string, r.get("nodeCount") as number);
    }

    return result.records.map((r) => ({
      patientId: r.get("patientId") as string,
      patientName: r.get("patientName") as string,
      similarityScore: r.get("similarityScore") as number,
      outcome: r.get("outcome") as OutcomeStatus,
      sharedDiagnosis: r.get("sharedDiagnosis") as string,
      sharedDiagnosisIcd10: r.get("sharedDiagnosisIcd10") as string,
      demographicOverlap: {
        ageDiff: r.get("ageDiff") as number,
        sameGender: r.get("sameGender") as boolean,
        sharedChronicConditions: [], // Would need embedded JSON parsing
        sameTriageCode: r.get("sameTriageCode") as boolean,
      },
      losDays: r.get("losDays") as number,
      totalCost: r.get("totalCost") as number,
      totalNodes: nodeCounts.get(r.get("patientId") as string) ?? 0,
      complicationsTotal: 0, // Available via p.data JSON if needed
      qualityScore: r.get("qualityScore") as number,
      selected: true,
    }));
  } finally {
    await session.close();
  }
}

// ─── 2. Align Decision Graphs (Neo4j) ───

export async function alignDecisionGraphs(
  medicId: string,
  referencePatientId: string,
  comparedPatientIds: string[],
): Promise<AlignedNodePair[]> {
  if (comparedPatientIds.length === 0) return [];

  const session = getSession();
  try {
    // Get reference nodes
    const refResult = await session.run(
      `
      MATCH (p:Patient {patientId: $refId, medicId: $medicId})-[:HAS_NODE]->(dn:DecisionNode)
      RETURN dn.nodeId AS nodeId, dn.sequence AS sequence, dn.action AS action,
             dn.actionCategory AS actionCategory, dn.departmentName AS department,
             dn.departmentId AS departmentId,
             dn.timeSinceAdmissionSeconds AS timing, dn.mortalityRiskTotal AS mortRisk,
             dn.complicationRiskOverall AS compRisk, dn.decisionQuality AS quality,
             dn.transitionSuccess AS success, p.outcome AS outcome, p.patientId AS patientId,
             p.patientName AS patientName
      ORDER BY dn.sequence
      `,
      { refId: referencePatientId, medicId },
    );

    // For each reference node, find best matching node in each compared patient
    const pairs: AlignedNodePair[] = [];

    for (const refRec of refResult.records) {
      const refCategory = refRec.get("actionCategory") as string;
      const refTiming = refRec.get("timing") as number;
      const stageKey = `${refCategory}-${refRec.get("sequence")}`;
      const stageLabel = `#${refRec.get("sequence")} ${refCategory.replace(/_/g, " ")}`;

      const refSummary: AlignedNodeSummary = {
        patientId: refRec.get("patientId") as string,
        patientName: refRec.get("patientName") as string,
        nodeId: refRec.get("nodeId") as string,
        sequence: refRec.get("sequence") as number,
        action: refRec.get("action") as string,
        actionCategory: refCategory as ActionCategory,
        department: refRec.get("department") as string,
        departmentId: refRec.get("departmentId") as string,
        timeSinceAdmissionSeconds: refTiming,
        mortalityRisk: refRec.get("mortRisk") as number,
        complicationRisk: refRec.get("compRisk") as number,
        flagsCount: 0,
        criticalFlags: 0,
        decisionQuality: refRec.get("quality") as string,
        outcome: refRec.get("outcome") as OutcomeStatus,
        transitionSuccess: refRec.get("success") as boolean,
      };

      // Find best match per compared patient
      const cmpResult = await session.run(
        `
        UNWIND $cmpIds AS cmpId
        MATCH (cp:Patient {patientId: cmpId, medicId: $medicId})-[:HAS_NODE]->(dn:DecisionNode)
        WHERE dn.actionCategory = $category
        WITH cp, dn, abs(dn.timeSinceAdmissionSeconds - $refTiming) AS timeDelta
        ORDER BY timeDelta ASC
        WITH cp, collect(dn)[0] AS best
        WHERE best IS NOT NULL
        RETURN cp.patientId AS patientId, cp.patientName AS patientName,
               cp.outcome AS outcome,
               best.nodeId AS nodeId, best.sequence AS sequence,
               best.action AS action, best.actionCategory AS actionCategory,
               best.departmentName AS department, best.departmentId AS departmentId,
               best.timeSinceAdmissionSeconds AS timing,
               best.mortalityRiskTotal AS mortRisk, best.complicationRiskOverall AS compRisk,
               best.decisionQuality AS quality, best.transitionSuccess AS success
        `,
        {
          cmpIds: comparedPatientIds,
          medicId,
          category: refCategory,
          refTiming,
        },
      );

      const comparedNodes: AlignedNodeSummary[] = cmpResult.records.map((r) => ({
        patientId: r.get("patientId") as string,
        patientName: r.get("patientName") as string,
        nodeId: r.get("nodeId") as string,
        sequence: r.get("sequence") as number,
        action: r.get("action") as string,
        actionCategory: r.get("actionCategory") as ActionCategory,
        department: r.get("department") as string,
        departmentId: r.get("departmentId") as string,
        timeSinceAdmissionSeconds: r.get("timing") as number,
        mortalityRisk: r.get("mortRisk") as number,
        complicationRisk: r.get("compRisk") as number,
        flagsCount: 0,
        criticalFlags: 0,
        decisionQuality: r.get("quality") as string,
        outcome: r.get("outcome") as OutcomeStatus,
        transitionSuccess: r.get("success") as boolean,
      }));

      pairs.push({ stageKey, stageLabel, referenceNode: refSummary, comparedNodes });
    }

    return pairs;
  } finally {
    await session.close();
  }
}

// ─── 3. Find Divergence Points ───
// (Thin JS logic on top of aligned pairs — no extra Cypher needed)

export function findDivergencePoints(
  alignedPairs: AlignedNodePair[],
): DecisionDivergence[] {
  const divergences: DecisionDivergence[] = [];

  for (const pair of alignedPairs) {
    for (const compared of pair.comparedNodes) {
      const ref = pair.referenceNode;
      let divergenceType: DivergenceType | null = null;
      let description = "";

      if (ref.action !== compared.action) {
        divergenceType = "different_action";
        description = `Reference chose "${ref.action.replace(/_/g, " ")}" while compared chose "${compared.action.replace(/_/g, " ")}" at the ${ref.actionCategory} stage`;
      }

      const timingDelta =
        compared.timeSinceAdmissionSeconds - ref.timeSinceAdmissionSeconds;
      if (Math.abs(timingDelta) > 7200 && !divergenceType) {
        divergenceType = "different_timing";
        description = `Action timing differs by ${formatTimingDelta(timingDelta)} — reference at ${getTimingBucket(ref.timeSinceAdmissionSeconds)} vs compared at ${getTimingBucket(compared.timeSinceAdmissionSeconds)}`;
      }

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

// ─── 4. Compute Outcome Correlations (Neo4j) ───

export async function computeOutcomeCorrelations(
  medicId: string,
  patientIds: string[],
): Promise<OutcomeCorrelation[]> {
  if (patientIds.length < 2) return [];

  const session = getSession();
  try {
    const result = await session.run(
      `
      // Find all decision nodes for the given patients
      MATCH (p:Patient {medicId: $medicId})-[:HAS_NODE]->(dn:DecisionNode)
      WHERE p.patientId IN $ids

      // Group by action_category + action
      WITH dn.actionCategory + '::' + dn.action AS patternKey,
           dn.actionCategory AS category,
           dn.action AS action,
           collect({
             patientId: p.patientId,
             outcome: p.outcome,
             timing: dn.timeSinceAdmissionSeconds
           }) AS entries

      WHERE size(entries) >= 2

      // Compute outcome stats
      WITH patternKey, category, action, entries, size(entries) AS total,
           size([e IN entries WHERE e.outcome = 'HEALED']) AS healed,
           size([e IN entries WHERE e.outcome = 'HEALED_WITH_COMPLICATIONS']) AS complicated,
           size([e IN entries WHERE e.outcome = 'DECEASED']) AS deceased,
           reduce(s = 0.0, e IN entries | s + e.timing) / size(entries) AS avgTiming

      WITH *, toFloat(healed) / total AS successRate,
              toFloat(deceased) / total AS mortalityRate

      RETURN patternKey, category, action, total, healed, complicated, deceased,
             successRate, mortalityRate, avgTiming,
             [e IN entries | e.patientId] AS patientIds

      ORDER BY
        CASE
          WHEN abs(successRate - 0.5) > 0.20 THEN 0
          WHEN abs(successRate - 0.5) > 0.10 THEN 1
          ELSE 2
        END,
        total DESC
      LIMIT 20
      `,
      { medicId, ids: patientIds },
    );

    // Compute overall success rate for significance calc
    const overallResult = await session.run(
      `
      MATCH (p:Patient {medicId: $medicId})
      WHERE p.patientId IN $ids
      RETURN toFloat(size(collect(CASE WHEN p.outcome = 'HEALED' THEN 1 END))) / count(p) AS overallSuccess
      `,
      { medicId, ids: patientIds },
    );
    const overallSuccess = overallResult.records[0]?.get("overallSuccess") as number ?? 0.5;

    return result.records.map((r) => {
      const successRate = r.get("successRate") as number;
      const delta = Math.abs(successRate - overallSuccess);
      const significance: "high" | "moderate" | "low" =
        delta > 0.20 ? "high" : delta > 0.10 ? "moderate" : "low";

      const action = r.get("action") as string;
      const category = r.get("category") as string;

      return {
        patternId: (r.get("patternKey") as string).replace(/[^a-zA-Z0-9]/g, "_"),
        patternLabel: `${action.replace(/_/g, " ")} (${category})`,
        actionCategory: category as ActionCategory,
        sampleSize: r.get("total") as number,
        outcomes: {
          healed: r.get("healed") as number,
          healedWithComplications: r.get("complicated") as number,
          deceased: r.get("deceased") as number,
        },
        successRate,
        mortalityRate: r.get("mortalityRate") as number,
        significance,
        avgTimingSeconds: r.get("avgTiming") as number,
        patientIds: r.get("patientIds") as string[],
      };
    });
  } finally {
    await session.close();
  }
}

