/**
 * Seed Neo4j Aura with patient graph data from patient-flows.json.
 *
 * Decomposes each patient JSON blob into proper graph nodes and relationships:
 *   (:Patient)-[:HAS_NODE]->(:DecisionNode)-[:TRANSITION]->(:DecisionNode)
 *   (:DecisionNode)-[:LOCATED_IN]->(:Department)
 *   (:Patient)-[:DIAGNOSED_WITH]->(:Diagnosis)
 *   (:Patient)-[:OWNED_BY]->(:MedicRef)
 *
 * Usage:  npm run seed:neo4j
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import neo4j from "neo4j-driver";
import { MongoClient } from "mongodb";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const NEO4J_URI = process.env.NEO4J_URI!;
const NEO4J_USERNAME = process.env.NEO4J_USERNAME!;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD!;
const NEO4J_DATABASE = process.env.NEO4J_DATABASE ?? "neo4j";

if (!NEO4J_URI || !NEO4J_USERNAME || !NEO4J_PASSWORD) {
  console.error("❌ Missing NEO4J_URI, NEO4J_USERNAME, or NEO4J_PASSWORD in .env.local");
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL!;
const DEFAULT_MEDIC_EMAIL = "emanuel.rusu03@e-uvt.ro";

async function main() {
  // ─── 0. Get the real medic _id from MongoDB ───
  console.log("🔍 Looking up medic ID from MongoDB...");
  const mongo = await MongoClient.connect(DATABASE_URL);
  const medicDoc = await mongo.db().collection("Medic").findOne({ email: DEFAULT_MEDIC_EMAIL });
  if (!medicDoc) {
    console.error("❌ Medic not found in MongoDB. Run `npm run seed` first.");
    await mongo.close();
    process.exit(1);
  }
  const MEDIC_ID = medicDoc._id.toString();
  console.log(`   Medic: ${medicDoc.name} (${MEDIC_ID})`);
  await mongo.close();
  console.log("🔌 Connecting to Neo4j Aura...");
  const driver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD),
    { disableLosslessIntegers: true },
  );

  const serverInfo = await driver.getServerInfo();
  console.log(`✅ Connected to ${serverInfo.address} (${serverInfo.protocolVersion})`);

  const session = driver.session({ database: NEO4J_DATABASE });

  try {
    // ─── 1. Drop stale constraints & create fresh ones ───
    console.log("📐 Setting up constraints and indexes...");

    // Drop the old DecisionNode uniqueness constraint (nodeId is NOT globally unique)
    try {
      await session.run("DROP CONSTRAINT decision_node_id IF EXISTS");
    } catch { /* may not exist */ }

    const constraints = [
      "CREATE CONSTRAINT patient_id IF NOT EXISTS FOR (p:Patient) REQUIRE p.patientId IS UNIQUE",
      "CREATE CONSTRAINT department_id IF NOT EXISTS FOR (d:Department) REQUIRE d.departmentId IS UNIQUE",
      "CREATE CONSTRAINT diagnosis_icd10 IF NOT EXISTS FOR (d:Diagnosis) REQUIRE d.icd10 IS UNIQUE",
      "CREATE CONSTRAINT medic_ref_id IF NOT EXISTS FOR (m:MedicRef) REQUIRE m.medicId IS UNIQUE",
    ];

    for (const c of constraints) {
      try {
        await session.run(c);
      } catch (err: unknown) {
        // Constraint might already exist (different syntax across versions)
        const msg = err instanceof Error ? err.message : "";
        if (!msg.includes("already exists") && !msg.includes("equivalent")) {
          console.warn(`   ⚠️  Constraint warning: ${msg}`);
        }
      }
    }

    // Index on Patient searchable props
    const indexes = [
      "CREATE INDEX patient_medic IF NOT EXISTS FOR (p:Patient) ON (p.medicId)",
      "CREATE INDEX patient_outcome IF NOT EXISTS FOR (p:Patient) ON (p.outcome)",
      "CREATE INDEX patient_diagnosis IF NOT EXISTS FOR (p:Patient) ON (p.diagnosisIcd10)",
      "CREATE INDEX dn_action_cat IF NOT EXISTS FOR (dn:DecisionNode) ON (dn.actionCategory)",
      "CREATE INDEX dn_patient IF NOT EXISTS FOR (dn:DecisionNode) ON (dn.patientId)",
      "CREATE INDEX dn_node_id IF NOT EXISTS FOR (dn:DecisionNode) ON (dn.patientId, dn.nodeId)",
    ];

    for (const idx of indexes) {
      try {
        await session.run(idx);
      } catch {
        // Index might already exist
      }
    }

    console.log("   ✅ Constraints and indexes ready");

    // ─── 2. Clear existing data ───
    console.log("🗑️  Clearing existing graph data...");
    await session.run("MATCH (n) DETACH DELETE n");
    console.log("   ✅ Cleared");

    // ─── 3. Load patient-flows.json ───
    const jsonPath = join(process.cwd(), "public", "data", "patient-flows.json");
    console.log(`📄 Reading patient data from ${jsonPath}...`);
    const raw = readFileSync(jsonPath, "utf-8");
    const data = JSON.parse(raw);
    const patients = data.patients as Array<Record<string, unknown>>;
    console.log(`   Found ${patients.length} patients`);

    // ─── 4. Create MedicRef stub ───
    await session.run(
      `MERGE (m:MedicRef {medicId: $medicId})`,
      { medicId: MEDIC_ID },
    );

    // ─── 5. Seed each patient ───
    let totalNodes = 0;
    let totalEdges = 0;

    for (let i = 0; i < patients.length; i++) {
      const p = patients[i] as Record<string, unknown>;
      const patientId = p.patient_id as string;
      const patientName = p.patient_name as string;
      const admission = p.admission as Record<string, unknown>;
      const discharge = p.discharge as Record<string, unknown>;
      const finalOutcome = p.final_outcome as Record<string, unknown>;
      const flowAnalytics = p.flow_analytics as Record<string, unknown>;
      const nodes = p.nodes as Array<Record<string, unknown>>;
      const edges = p.edges as Array<Record<string, unknown>>;

      const firstNode = nodes[0] as Record<string, unknown>;
      const patientState = firstNode?.patient_state as Record<string, unknown>;
      const diagnosis = (patientState?.diagnosis as Record<string, unknown>)?.primary as Record<string, unknown>;
      const demographics = patientState?.demographics as Record<string, unknown>;
      const costAnalysis = flowAnalytics?.cost_analysis as Record<string, unknown>;

      const tx = session.beginTransaction();

      try {
        // 1. Create Patient + link to MedicRef + Diagnosis (single query)
        const icd10 = (diagnosis?.icd10 as string) ?? "";
        await tx.run(
          `
          MATCH (m:MedicRef {medicId: $medicId})
          CREATE (p:Patient {
            patientId: $patientId, medicId: $medicId, patientName: $patientName,
            data: $data, outcome: $outcome, triageCode: $triageCode,
            chiefComplaint: $chiefComplaint, diagnosisIcd10: $diagnosisIcd10,
            diagnosisName: $diagnosisName, age: $age, gender: $gender,
            losDays: $losDays, totalCost: $totalCost, qualityScore: $qualityScore,
            createdAt: datetime(), updatedAt: datetime()
          })
          CREATE (p)-[:OWNED_BY]->(m)
          WITH p
          FOREACH (_ IN CASE WHEN $icd10 <> '' THEN [1] ELSE [] END |
            MERGE (d:Diagnosis {icd10: $icd10})
            ON CREATE SET d.name = $diagnosisName
            CREATE (p)-[:DIAGNOSED_WITH]->(d)
          )
          `,
          {
            patientId, medicId: MEDIC_ID, patientName,
            data: JSON.stringify(p),
            outcome: (finalOutcome?.status as string) ?? "UNKNOWN",
            triageCode: (admission?.triage_code as string) ?? "",
            chiefComplaint: (admission?.chief_complaint as string) ?? "",
            diagnosisIcd10: icd10,
            diagnosisName: (diagnosis?.name as string) ?? "",
            age: (demographics?.age as number) ?? 0,
            gender: (demographics?.gender as string) ?? "",
            losDays: (discharge?.duration_days as number) ?? 0,
            totalCost: (costAnalysis?.total_cost_eur as number) ?? 0,
            qualityScore: ((flowAnalytics?.outcome_quality as Record<string, unknown>)?.quality_score as number) ?? 0,
            icd10,
          },
        );

        // 2. Batch-create all DecisionNodes + HAS_NODE links (single UNWIND)
        const nodeParams = nodes.map((node) => {
          const decision = node.decision as Record<string, unknown>;
          const logistics = node.logistics as Record<string, unknown>;
          const location = logistics?.location as Record<string, unknown>;
          const department = location?.department as Record<string, unknown>;
          const duration = node.duration as Record<string, unknown>;
          const riskAssessment = node.risk_assessment as Record<string, unknown>;
          const mortalityRisk = riskAssessment?.mortality_risk as Record<string, unknown>;
          const complicationRisk = riskAssessment?.complication_risk as Record<string, unknown>;
          const transitionOutcome = node.transition_outcome as Record<string, unknown>;
          const netImpact = transitionOutcome?.net_impact as Record<string, unknown>;
          return {
            nodeId: node.node_id as string,
            sequence: (node.sequence as number) ?? 0,
            action: (decision?.action as string) ?? "",
            actionCategory: (decision?.action_category as string) ?? "",
            departmentId: (department?.id as string) ?? "",
            departmentName: (department?.name as string) ?? "",
            timeSinceAdmissionSeconds: (duration?.time_since_admission_seconds as number) ?? 0,
            mortalityRiskTotal: (mortalityRisk?.total as number) ?? 0,
            complicationRiskOverall: (complicationRisk?.overall as number) ?? 0,
            decisionQuality: (netImpact?.decision_quality as string) ?? "",
            transitionSuccess: (transitionOutcome?.success as boolean) ?? false,
            nodeData: JSON.stringify(node),
          };
        });

        await tx.run(
          `
          MATCH (p:Patient {patientId: $patientId})
          UNWIND $nodes AS n
          CREATE (dn:DecisionNode {
            nodeId: n.nodeId, patientId: $patientId, sequence: n.sequence,
            action: n.action, actionCategory: n.actionCategory,
            departmentId: n.departmentId, departmentName: n.departmentName,
            timeSinceAdmissionSeconds: n.timeSinceAdmissionSeconds,
            mortalityRiskTotal: n.mortalityRiskTotal,
            complicationRiskOverall: n.complicationRiskOverall,
            decisionQuality: n.decisionQuality, transitionSuccess: n.transitionSuccess,
            nodeData: n.nodeData
          })
          CREATE (p)-[:HAS_NODE]->(dn)
          WITH dn, n
          MERGE (dept:Department {departmentId: n.departmentId})
          ON CREATE SET dept.name = n.departmentName
          MERGE (dn)-[:LOCATED_IN]->(dept)
          `,
          { patientId, nodes: nodeParams },
        );

        // 3. Batch-create all TRANSITION edges (single UNWIND)
        if (edges.length > 0) {
          const edgeParams = edges.map((e) => ({
            from: e.from as string,
            to: e.to as string,
            type: (e.type as string) ?? "temporal",
            timeElapsed: (e.time_elapsed_seconds as number) ?? 0,
          }));

          await tx.run(
            `
            UNWIND $edges AS e
            MATCH (p:Patient {patientId: $patientId})-[:HAS_NODE]->(from:DecisionNode {nodeId: e.from})
            MATCH (p)-[:HAS_NODE]->(to:DecisionNode {nodeId: e.to})
            CREATE (from)-[:TRANSITION {type: e.type, timeElapsedSeconds: e.timeElapsed}]->(to)
            `,
            { patientId, edges: edgeParams },
          );
        }

        await tx.commit();
        totalNodes += nodes.length;
        totalEdges += edges.length;

        if ((i + 1) % 10 === 0 || i === patients.length - 1) {
          console.log(`   📊 ${i + 1}/${patients.length} patients seeded...`);
        }
      } catch (err) {
        await tx.rollback();
        console.error(`   ❌ Failed on patient ${patientId}:`, err);
        throw err;
      }
    }

    console.log(`\n🎉 Neo4j seed complete!`);
    console.log(`   Patients:       ${patients.length}`);
    console.log(`   DecisionNodes:  ${totalNodes}`);
    console.log(`   Transitions:    ${totalEdges}`);
    console.log(`   MedicRef:       ${MEDIC_ID}`);

    // Print graph stats
    const statsResult = await session.run(`
      MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count
      UNION ALL
      MATCH ()-[r]->() RETURN type(r) AS label, count(r) AS count
    `);
    console.log("\n📈 Graph summary:");
    for (const rec of statsResult.records) {
      console.log(`   ${rec.get("label")}: ${rec.get("count")}`);
    }
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});

