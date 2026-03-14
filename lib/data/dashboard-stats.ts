import type { PatientGraph } from "@/lib/types/patient";
import type { Flag } from "@/lib/types/historical";
import { getRiskLevel, type RiskLevel } from "@/lib/utils/format";

// ─── Computed dashboard statistics ───

export interface DashboardStats {
  total: number;
  healed: number;
  complicated: number;
  deceased: number;
  avgLos: number;
  totalCost: number;
  avgCostPerPatient: number;
  avgQualityScore: number;
  decisionQuality: { appropriate: number; total: number; ratio: number };
  avgReadmissionRisk: number;
  triageDistribution: Record<string, number>;
  costBreakdown: {
    personnel: number;
    investigations: number;
    procedures: number;
    medications: number;
    hospitalization: number;
    equipment: number;
  };
  departmentLoad: DeptLoadEntry[];
  criticalAlerts: CriticalAlert[];
  recentAdmissions: RecentAdmission[];
  riskDistribution: Record<RiskLevel, number>;
  diagnosisDistribution: [string, number][];
}

export interface DeptLoadEntry {
  departmentId: string;
  departmentName: string;
  patientCount: number;
  totalCost: number;
  avgUtilization: number;
  nodeCount: number;
}

export interface CriticalAlert {
  patientId: string;
  patientName: string;
  flag: Flag;
  mortalityRisk: number;
  department: string;
  diagnosis: string;
}

export interface RecentAdmission {
  patientId: string;
  patientName: string;
  timestamp: string;
  triageCode: string;
  chiefComplaint: string;
  outcome: string;
  diagnosis: string;
}

export function computeDashboardStats(patients: PatientGraph[]): DashboardStats {
  const total = patients.length;
  let healed = 0;
  let complicated = 0;
  let deceased = 0;
  let totalLos = 0;
  let totalCost = 0;
  let qualityScoreSum = 0;
  let decisionAppropriate = 0;
  let decisionTotal = 0;
  let readmissionRiskSum = 0;

  const triageDistribution: Record<string, number> = {};
  const costBreakdown = {
    personnel: 0,
    investigations: 0,
    procedures: 0,
    medications: 0,
    hospitalization: 0,
    equipment: 0,
  };
  const deptMap = new Map<
    string,
    { name: string; patients: Set<string>; cost: number; utilizations: number[]; nodes: number }
  >();
  const criticalAlerts: CriticalAlert[] = [];
  const diagMap: Record<string, number> = {};
  const riskDistribution: Record<RiskLevel, number> = {
    low: 0,
    moderate: 0,
    high: 0,
    critical: 0,
  };

  for (const p of patients) {
    // Outcome counts
    if (p.final_outcome.status === "HEALED") healed++;
    else if (p.final_outcome.status === "HEALED_WITH_COMPLICATIONS") complicated++;
    else if (p.final_outcome.status === "DECEASED") deceased++;

    // LOS & Cost
    totalLos += p.discharge.duration_days;
    totalCost += p.final_outcome.summary.total_cost_eur || 0;

    // Quality
    qualityScoreSum += p.flow_analytics.outcome_quality.quality_score;
    decisionAppropriate += p.flow_analytics.decision_quality_analysis.appropriate;
    decisionTotal += p.flow_analytics.decision_quality_analysis.total_decisions;

    // Readmission
    readmissionRiskSum += p.final_outcome.readmission_risk_30day;

    // Triage
    const tc = p.admission.triage_code;
    triageDistribution[tc] = (triageDistribution[tc] || 0) + 1;

    // Cost breakdown
    const cb = p.flow_analytics.cost_analysis.breakdown;
    costBreakdown.personnel += cb.personnel;
    costBreakdown.investigations += cb.investigations;
    costBreakdown.procedures += cb.procedures;
    costBreakdown.medications += cb.medications;
    costBreakdown.hospitalization += cb.hospitalization;
    costBreakdown.equipment += cb.equipment;

    // Departments
    for (const du of p.flow_analytics.department_utilization) {
      const existing = deptMap.get(du.department_id);
      if (existing) {
        existing.patients.add(p.patient_id);
        existing.cost += du.cost_eur;
        existing.nodes += du.nodes;
      } else {
        deptMap.set(du.department_id, {
          name: du.department,
          patients: new Set([p.patient_id]),
          cost: du.cost_eur,
          utilizations: [],
          nodes: du.nodes,
        });
      }
    }

    // Department utilization from logistics
    for (const node of p.nodes) {
      const ds = node.logistics.department_state;
      if (ds?.capacity) {
        const deptId = node.logistics.location.department.id;
        const existing = deptMap.get(deptId);
        if (existing) {
          existing.utilizations.push(ds.capacity.utilization);
        }
      }
    }

    // Risk distribution (per patient — peak risk)
    const maxRisk = Math.max(...p.nodes.map((n) => n.risk_assessment.mortality_risk.total));
    riskDistribution[getRiskLevel(maxRisk)]++;

    // Critical flags
    for (const node of p.nodes) {
      for (const flag of node.historical_analysis.flags) {
        if (flag.severity === "CRITICAL") {
          criticalAlerts.push({
            patientId: p.patient_id,
            patientName: p.patient_name,
            flag,
            mortalityRisk: node.risk_assessment.mortality_risk.total,
            department: node.logistics.location.department.name,
            diagnosis:
              node.patient_state?.diagnosis?.primary?.name ?? "unknown",
          });
        }
      }
    }

    // Diagnosis
    const d = p.nodes[0]?.patient_state?.diagnosis?.primary?.name ?? "unknown";
    diagMap[d] = (diagMap[d] || 0) + 1;
  }

  // Department load entries
  const departmentLoad: DeptLoadEntry[] = Array.from(deptMap.entries())
    .map(([id, data]) => ({
      departmentId: id,
      departmentName: data.name,
      patientCount: data.patients.size,
      totalCost: data.cost,
      avgUtilization:
        data.utilizations.length > 0
          ? data.utilizations.reduce((s, u) => s + u, 0) / data.utilizations.length
          : 0,
      nodeCount: data.nodes,
    }))
    .sort((a, b) => b.patientCount - a.patientCount);

  // Sort critical alerts by mortality risk desc, take top 10
  criticalAlerts.sort((a, b) => b.mortalityRisk - a.mortalityRisk);

  // Recent admissions
  const recentAdmissions: RecentAdmission[] = [...patients]
    .sort(
      (a, b) =>
        new Date(b.admission.timestamp).getTime() -
        new Date(a.admission.timestamp).getTime(),
    )
    .slice(0, 10)
    .map((p) => ({
      patientId: p.patient_id,
      patientName: p.patient_name,
      timestamp: p.admission.timestamp,
      triageCode: p.admission.triage_code,
      chiefComplaint: p.admission.chief_complaint,
      outcome: p.final_outcome.status,
      diagnosis:
        p.nodes[0]?.patient_state?.diagnosis?.primary?.name ?? "unknown",
    }));

  // Diagnosis sorted
  const diagnosisDistribution: [string, number][] = Object.entries(diagMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  return {
    total,
    healed,
    complicated,
    deceased,
    avgLos: total ? totalLos / total : 0,
    totalCost,
    avgCostPerPatient: total ? Math.round(totalCost / total) : 0,
    avgQualityScore: total ? qualityScoreSum / total : 0,
    decisionQuality: {
      appropriate: decisionAppropriate,
      total: decisionTotal,
      ratio: decisionTotal > 0 ? decisionAppropriate / decisionTotal : 0,
    },
    avgReadmissionRisk: total ? readmissionRiskSum / total : 0,
    triageDistribution,
    costBreakdown,
    departmentLoad,
    criticalAlerts: criticalAlerts.slice(0, 10),
    recentAdmissions,
    riskDistribution,
    diagnosisDistribution,
  };
}

