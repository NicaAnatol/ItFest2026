/**
 * Patient CRUD operations via Neo4j Cypher queries.
 *
 * Each patient is stored as a proper graph:
 *   (:Patient)-[:HAS_NODE]->(:DecisionNode)-[:TRANSITION]->(:DecisionNode)
 *                                           -[:LOCATED_IN]->(:Department)
 *   (:Patient)-[:DIAGNOSED_WITH]->(:Diagnosis)
 *   (:Patient)-[:OWNED_BY]->(:MedicRef)
 *
 * Deep nested objects (patient_state, decision, risk_assessment, etc.) are
 * stored as JSON-serialized string properties on DecisionNode — Neo4j Aura
 * Free doesn't support nested maps. Key searchable fields are promoted to
 * first-class properties for Cypher indexing.
 */
import { getSession } from "@/lib/db/neo4j";
import type { PatientGraph } from "@/lib/types/patient";

// ─── READ ───

/** Get all patients (globally - no medic filtering for simulation viewing). */
export async function getAllPatients(medicId?: string): Promise<PatientGraph[]> {
  const session = getSession();
  try {
    // If medicId is provided, filter by medic (for backwards compatibility)
    // If not provided, return all patients globally
    const query = medicId
      ? `
        MATCH (p:Patient)-[:OWNED_BY]->(m:MedicRef {medicId: $medicId})
        RETURN p.patientId AS patientId, p.data AS data, p.medicId AS medicId
        ORDER BY p.createdAt DESC
        `
      : `
        MATCH (p:Patient)
        RETURN p.patientId AS patientId, p.data AS data, p.medicId AS medicId
        ORDER BY p.createdAt DESC
        `;

    const result = await session.run(query, medicId ? { medicId } : {});

    return result.records.map((r) => {
      const graph = JSON.parse(r.get("data") as string) as PatientGraph;
      const recordMedicId = r.get("medicId") as string;
      return { ...graph, medicId: recordMedicId };
    });
  } finally {
    await session.close();
  }
}

/** Get a single patient by patient_id (globally - optionally scoped to medic). */
export async function getPatientById(
  medicId: string | null,
  patientId: string,
): Promise<PatientGraph | null> {
  const session = getSession();
  try {
    // If medicId is null, search globally
    const query = medicId
      ? `
        MATCH (p:Patient {patientId: $patientId})-[:OWNED_BY]->(m:MedicRef {medicId: $medicId})
        RETURN p.data AS data, p.medicId AS medicId
        LIMIT 1
        `
      : `
        MATCH (p:Patient {patientId: $patientId})
        RETURN p.data AS data, p.medicId AS medicId
        LIMIT 1
        `;

    const result = await session.run(
      query,
      medicId ? { medicId, patientId } : { patientId },
    );

    if (result.records.length === 0) return null;
    const graph = JSON.parse(result.records[0].get("data") as string) as PatientGraph;
    const recordMedicId = result.records[0].get("medicId") as string;
    return { ...graph, medicId: recordMedicId };
  } finally {
    await session.close();
  }
}

// ─── WRITE ───

/** Insert or upsert a patient — stores full JSON + decomposed graph structure. */
export async function upsertPatient(
  medicId: string,
  patient: PatientGraph,
): Promise<void> {
  const session = getSession();
  const tx = session.beginTransaction();

  try {
    const firstNode = patient.nodes[0];
    const diagnosisIcd10 = firstNode?.patient_state?.diagnosis?.primary?.icd10 ?? "";
    const diagnosisName = firstNode?.patient_state?.diagnosis?.primary?.name ?? "";

    // 1. Ensure MedicRef stub exists
    await tx.run(
      `MERGE (m:MedicRef {medicId: $medicId})`,
      { medicId },
    );

    // 2. Upsert Patient node with full JSON + promoted searchable props
    await tx.run(
      `
      MERGE (p:Patient {patientId: $patientId, medicId: $medicId})
      ON CREATE SET
        p.patientName      = $patientName,
        p.data             = $data,
        p.outcome          = $outcome,
        p.triageCode       = $triageCode,
        p.chiefComplaint   = $chiefComplaint,
        p.diagnosisIcd10   = $diagnosisIcd10,
        p.diagnosisName    = $diagnosisName,
        p.losDays          = $losDays,
        p.totalCost        = $totalCost,
        p.createdAt        = datetime(),
        p.updatedAt        = datetime()
      ON MATCH SET
        p.patientName      = $patientName,
        p.data             = $data,
        p.outcome          = $outcome,
        p.triageCode       = $triageCode,
        p.chiefComplaint   = $chiefComplaint,
        p.diagnosisIcd10   = $diagnosisIcd10,
        p.diagnosisName    = $diagnosisName,
        p.losDays          = $losDays,
        p.totalCost        = $totalCost,
        p.updatedAt        = datetime()
      `,
      {
        patientId: patient.patient_id,
        medicId,
        patientName: patient.patient_name,
        data: JSON.stringify(patient),
        outcome: patient.final_outcome.status,
        triageCode: patient.admission.triage_code,
        chiefComplaint: patient.admission.chief_complaint,
        diagnosisIcd10,
        diagnosisName,
        losDays: patient.discharge.duration_days,
        totalCost: patient.flow_analytics?.cost_analysis?.total_cost_eur ?? 0,
      },
    );

    // 3. Link Patient → MedicRef
    await tx.run(
      `
      MATCH (p:Patient {patientId: $patientId, medicId: $medicId})
      MATCH (m:MedicRef {medicId: $medicId})
      MERGE (p)-[:OWNED_BY]->(m)
      `,
      { patientId: patient.patient_id, medicId },
    );

    // 4. Link Patient → Diagnosis
    if (diagnosisIcd10) {
      await tx.run(
        `
        MATCH (p:Patient {patientId: $patientId, medicId: $medicId})
        MERGE (d:Diagnosis {icd10: $icd10})
        ON CREATE SET d.name = $name
        MERGE (p)-[:DIAGNOSED_WITH]->(d)
        `,
        {
          patientId: patient.patient_id,
          medicId,
          icd10: diagnosisIcd10,
          name: diagnosisName,
        },
      );
    }

    // 5. Delete old decision nodes + transitions for this patient (re-create fresh)
    await tx.run(
      `
      MATCH (p:Patient {patientId: $patientId, medicId: $medicId})-[:HAS_NODE]->(dn:DecisionNode)
      DETACH DELETE dn
      `,
      { patientId: patient.patient_id, medicId },
    );

    // 6. Create DecisionNodes with promoted props + JSON-serialized deep objects
    for (const node of patient.nodes) {
      await tx.run(
        `
        MATCH (p:Patient {patientId: $patientId, medicId: $medicId})
        CREATE (dn:DecisionNode {
          nodeId:                    $nodeId,
          patientId:                 $patientId,
          sequence:                  $sequence,
          action:                    $action,
          actionCategory:            $actionCategory,
          departmentId:              $departmentId,
          departmentName:            $departmentName,
          timeSinceAdmissionSeconds: $timeSinceAdmissionSeconds,
          mortalityRiskTotal:        $mortalityRiskTotal,
          complicationRiskOverall:   $complicationRiskOverall,
          decisionQuality:           $decisionQuality,
          transitionSuccess:         $transitionSuccess,
          nodeData:                  $nodeData
        })
        CREATE (p)-[:HAS_NODE]->(dn)
        `,
        {
          patientId: patient.patient_id,
          medicId,
          nodeId: node.node_id,
          sequence: node.sequence,
          action: node.decision.action,
          actionCategory: node.decision.action_category,
          departmentId: node.logistics.location.department.id,
          departmentName: node.logistics.location.department.name,
          timeSinceAdmissionSeconds: node.duration.time_since_admission_seconds,
          mortalityRiskTotal: node.risk_assessment.mortality_risk.total,
          complicationRiskOverall: node.risk_assessment.complication_risk.overall,
          decisionQuality: node.transition_outcome.net_impact.decision_quality,
          transitionSuccess: node.transition_outcome.success,
          nodeData: JSON.stringify(node),
        },
      );

      // 7. DecisionNode → Department
      await tx.run(
        `
        MATCH (p:Patient {patientId: $patientId, medicId: $medicId})-[:HAS_NODE]->(dn:DecisionNode {nodeId: $nodeId})
        MERGE (dept:Department {departmentId: $departmentId})
        ON CREATE SET dept.name = $departmentName
        MERGE (dn)-[:LOCATED_IN]->(dept)
        `,
        {
          patientId: patient.patient_id,
          medicId,
          nodeId: node.node_id,
          departmentId: node.logistics.location.department.id,
          departmentName: node.logistics.location.department.name,
        },
      );
    }

    // 8. Create TRANSITION relationships (edges)
    for (const edge of patient.edges) {
      await tx.run(
        `
        MATCH (p:Patient {patientId: $patientId, medicId: $medicId})-[:HAS_NODE]->(from:DecisionNode {nodeId: $from})
        MATCH (p)-[:HAS_NODE]->(to:DecisionNode {nodeId: $to})
        CREATE (from)-[:TRANSITION {type: $type, timeElapsedSeconds: $timeElapsed}]->(to)
        `,
        {
          patientId: patient.patient_id,
          medicId,
          from: edge.from,
          to: edge.to,
          type: edge.type,
          timeElapsed: edge.time_elapsed_seconds ?? 0,
        },
      );
    }

    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  } finally {
    await session.close();
  }
}

/** Delete a patient and all its decision nodes. */
export async function deletePatient(
  medicId: string,
  patientId: string,
): Promise<boolean> {
  const session = getSession();
  try {
    const result = await session.run(
      `
      MATCH (p:Patient {patientId: $patientId})-[:OWNED_BY]->(m:MedicRef {medicId: $medicId})
      OPTIONAL MATCH (p)-[:HAS_NODE]->(dn:DecisionNode)
      DETACH DELETE p, dn
      RETURN count(p) AS deleted
      `,
      { medicId, patientId },
    );
    const deleted = result.records[0]?.get("deleted") as number;
    return deleted > 0;
  } finally {
    await session.close();
  }
}

/** Count patients for a medic. */
export async function countPatients(medicId: string): Promise<number> {
  const session = getSession();
  try {
    const result = await session.run(
      `
      MATCH (p:Patient)-[:OWNED_BY]->(m:MedicRef {medicId: $medicId})
      RETURN count(p) AS total
      `,
      { medicId },
    );
    return result.records[0]?.get("total") as number ?? 0;
  } finally {
    await session.close();
  }
}

