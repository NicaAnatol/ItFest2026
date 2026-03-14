// Decision & risk types

export type ActionCategory =
  | "admission"
  | "triage"
  | "diagnostic"
  | "treatment"
  | "monitoring"
  | "consultation"
  | "transfer"
  | "procedure"
  | "discharge"
  | "disposition"
  | "treatment_and_disposition";

export interface Decision {
  action: string;
  action_category: ActionCategory;
  made_by: DecisionMaker;
  reasoning: Reasoning;
  alternatives_considered: Alternative[];
  orders: Order[];
  expected_outcome: ExpectedOutcome;
}

export interface DecisionMaker {
  person_id: string;
  name: string;
  role: string;
  specialty?: string;
  experience_years: number;
  hours_on_shift?: number;
  current_patient_load?: number;
  decision_confidence: number;
}

export interface Reasoning {
  primary_reason: string;
  supporting_evidence: string[];
  guidelines_followed: string[];
}

export interface Order {
  order_id: string;
  type: string;
  urgency?: string;
  tests?: string[];
  study?: string;
  medication?: OrderMedication;
  parameters?: string[];
  details?: Record<string, unknown>;
  transfer?: TransferOrder;
  indication?: string;
  estimated_cost?: number;
}

export interface OrderMedication {
  name: string;
  dose?: string;
  route?: string;
  timing?: string;
  indication?: string;
  dosing?: {
    loading_dose?: { amount: number; unit: string; route: string; timing: string };
    maintenance?: { amount: number; unit: string; route: string; duration: string };
  };
  monitoring_required?: {
    parameter: string;
    frequency: string;
    target: string;
  };
  precautions?: string[];
}

export interface TransferOrder {
  from_department: string;
  to_department: string;
  reason: string;
  urgency: string;
  requirements?: Record<string, unknown>;
  timing?: Record<string, string>;
}

export interface Alternative {
  option: string;
  description?: string;
  why_not_chosen: string;
  pros: string[];
  cons: string[];
  historical_outcome_if_chosen?: {
    cases: number;
    healed?: number;
    healed_with_complications?: number;
    died?: number;
    mortality_rate: number;
    major_bleeding_rate?: number;
    success_rate?: number;
    comparison?: string;
  };
}

export interface ExpectedOutcome {
  primary: string;
  expected_timeline: Record<string, string>;
  success_criteria?: string[];
}

// ─── Risk Assessment ───

export interface RiskAssessment {
  mortality_risk: MortalityRisk;
  complication_risk: {
    overall: number;
    breakdown?: { minor: number; moderate: number; severe: number };
  };
  potential_complications: PotentialComplication[];
  interaction_risks: InteractionRisk[];
  overlapping_decisions: OverlappingDecision[];
}

export interface MortalityRisk {
  baseline: number;
  from_this_decision: number;
  total: number;
  factors_contributing?: Array<{
    factor: string;
    contribution: number;
  }>;
}

export interface PotentialComplication {
  complication_type: string;
  icd10?: string;
  probability: number;
  severity_distribution: {
    mild: number;
    moderate: number;
    severe: number;
  };
  mortality_if_occurs: number;
  typical_onset?: string;
  earliest_onset?: string;
  risk_factors_present?: Array<{
    factor: string;
    increases_risk_by: number;
  }>;
  risk_factors_adjusted_probability?: number;
  mitigation_strategies: string[];
  historical_frequency?: {
    cases_with_this_decision: number;
    cases_with_this_complication: number;
    rate: number;
    deaths?: number;
    note?: string;
  };
}

export interface InteractionRisk {
  interaction_type: string;
  description?: string;
  condition?: string;
  medication?: string;
  risk?: string;
  complication_1?: string;
  complication_2?: string;
  interaction?: string;
  probability?: number;
  probability_of_issue?: number;
  mortality_if_occurs?: number;
  how_discovered?: string;
  mitigation: string;
}

export interface OverlappingDecision {
  this_decision: string;
  overlapping_with: string;
  overlap_type: string;
  combined_risk: number | {
    bleeding_risk_heparin_alone?: number;
    bleeding_risk_aspirin_alone?: number;
    combined_risk?: number;
    interaction_factor?: number;
  };
  mitigation: string;
}

