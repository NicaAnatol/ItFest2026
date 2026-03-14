// Core patient graph types

import type { PatientState, Vitals, Complication } from "./patient-state";
import type { Decision, RiskAssessment } from "./decision";
import type { HistoricalAnalysis } from "./historical";
import type { Logistics } from "./logistics";
import type { Execution } from "./execution";

// ─── Top-level Patient Graph ───

export interface PatientGraph {
  patient_id: string;
  patient_name: string;
  admission: Admission;
  discharge: Discharge;
  final_outcome: FinalOutcome;
  nodes: PatientNode[];
  edges: PatientEdge[];
  flow_analytics: FlowAnalytics;
}

export interface Admission {
  timestamp: string;
  method: string;
  chief_complaint: string;
  triage_code: TriageCode;
}

export interface Discharge {
  timestamp: string;
  duration_days: number;
  duration_hours: number;
}

export type OutcomeStatus = "HEALED" | "HEALED_WITH_COMPLICATIONS" | "DECEASED";
export type TriageCode = "RED" | "ORANGE" | "YELLOW" | "GREEN";

export interface FinalOutcome {
  status: OutcomeStatus;
  final_complications: FinalComplication[];
  discharge_destination: string;
  readmission_risk_30day: number;
  summary: OutcomeSummary;
}

export interface FinalComplication {
  complication_id: string;
  type: string;
  icd10: string;
  severity: string;
  permanent: boolean;
  caused_by_node: string;
  quality_of_life_impact: number;
  requires_ongoing_treatment: boolean;
  estimated_lifetime_cost_eur: number;
}

export interface OutcomeSummary {
  total_nodes: number;
  total_departments: number;
  total_cost_eur: number;
  complications_total: number;
  complications_resolved: number;
  complications_permanent: number;
}

// ─── Patient Node ───

export interface PatientNode {
  node_id: string;
  patient_id: string;
  sequence: number;
  timestamp: NodeTimestamp;
  duration: NodeDuration;
  patient_state: PatientState;
  logistics: Logistics;
  decision: Decision;
  risk_assessment: RiskAssessment;
  historical_analysis: HistoricalAnalysis;
  execution: Execution;
  state_after: StateAfter;
  transition_outcome: TransitionOutcome;
  metadata: NodeMetadata;
}

export interface NodeTimestamp {
  exact: string;
  day_of_week: string;
  day_of_month: number;
  month: number;
  year: number;
  hour: number;
  minute: number;
  time_of_day: string;
  shift: string;
  is_weekend: boolean;
  is_holiday: boolean;
}

export interface NodeDuration {
  time_since_admission: string;
  time_since_admission_seconds: number;
  time_since_last_transition: string | null;
  time_since_last_transition_seconds: number | null;
  time_in_this_node: string;
  time_in_this_node_seconds: number;
}

// ─── Patient Edge ───

export interface PatientEdge {
  from: string;
  to: string;
  type: string;
  time_elapsed_seconds?: number;
}

// ─── State After Transition ───

export interface StateAfter {
  location: {
    department: {
      id: string;
      name: string;
      type?: string;
      floor?: number;
      beds?: number;
    };
  };
  diagnosis?: {
    primary: {
      name: string;
      icd10?: string;
      confidence?: number;
      status?: string;
    };
  };
  vitals: {
    blood_pressure: { systolic: number; diastolic: number };
    heart_rate: { value: number };
    oxygen_saturation: { value: number; on_oxygen: boolean };
  };
  medications_active?: Array<{ medication: string; dose: string; status?: string }>;
  complications_active: Array<{
    complication_id: string;
    type: string;
    severity: string;
    current_status: string;
  }>;
  overall_status: {
    condition: string;
    trajectory: string;
  };
}

// ─── Transition Outcome ───

export interface TransitionOutcome {
  success: boolean;
  as_expected: boolean;
  prediction_vs_reality?: {
    predicted_complications: Array<{
      complication: string;
      predicted_probability: number;
      occurred: boolean;
      severity_predicted?: string;
      severity_actual?: string;
      assessment: string;
    }>;
    unexpected_complications: unknown[];
    overall_prediction_accuracy?: string;
  };
  net_impact: {
    patient_state_change: string;
    mortality_risk_change?: number;
    cost: number;
    overall_assessment: string;
    decision_quality: string;
  };
}

// ─── Node Metadata ───

export interface NodeMetadata {
  node_created_at: string;
  data_quality: {
    completeness: number;
    accuracy_confidence: number;
  };
}

// ─── Flow Analytics ───

export interface FlowAnalytics {
  patient_id: string;
  total_nodes: number;
  total_duration_hours: number;
  department_utilization: DepartmentUtilization[];
  investigation_summary: InvestigationSummary;
  complication_tracking: ComplicationTracking;
  decision_quality_analysis: DecisionQualityAnalysis;
  cost_analysis: CostAnalysis;
  outcome_quality: OutcomeQuality;
}

export interface DepartmentUtilization {
  department: string;
  department_id: string;
  entry_node: string;
  exit_node: string;
  nodes: number;
  personnel_ids?: string[];
  cost_eur: number;
}

export interface InvestigationSummary {
  total_investigations: number;
  by_type: {
    laboratory: number;
    imaging: number;
    consultation: number;
    procedure: number;
  };
  total_cost: number;
}

export interface ComplicationTracking {
  total_complications: number;
  timeline: ComplicationTimelineEntry[];
}

export interface ComplicationTimelineEntry {
  complication_id: string;
  type: string;
  introduced_at: string;
  resolved_at: string | null;
  permanent: boolean;
  was_predicted: boolean;
  contributed_to_final_outcome: boolean;
}

export interface DecisionQualityAnalysis {
  total_decisions: number;
  appropriate: number;
  suboptimal: number;
}

export interface CostAnalysis {
  total_cost_eur: number;
  breakdown: {
    personnel: number;
    investigations: number;
    procedures: number;
    medications: number;
    hospitalization: number;
    equipment: number;
  };
  cost_per_day: number;
}

export interface OutcomeQuality {
  final_status: string;
  preventable_complications: number;
  quality_score: number;
}

// ─── Data file root ───

export interface PatientFlowsData {
  metadata: {
    description: string;
    version: string;
    schema: string;
    generated_at: string;
    total_patients: number;
    statistics: {
      total_patients: number;
      outcomes: {
        healed: number;
        healed_with_complications: number;
        deceased: number;
      };
      diagnoses: Record<string, number>;
      avg_los_days: number;
      avg_nodes_per_patient: number;
      total_cost_eur: number;
      avg_cost_per_patient_eur: number;
      total_complications: number;
      generated_at: string;
    };
  };
  patients: PatientGraph[];
}

