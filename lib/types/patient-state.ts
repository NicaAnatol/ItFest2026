// Patient state sub-types

export interface PatientState {
  demographics: Demographics;
  medical_history: MedicalHistory;
  diagnosis: Diagnosis;
  symptoms?: Symptom[];
  vitals: Vitals;
  lab_results: LabResults;
  imaging_results?: ImagingResult[];
  medications_active: Medication[];
  complications_active: Complication[];
  risk_scores?: RiskScores;
}

// ─── Demographics ───

export interface Demographics {
  age: number;
  gender: string;
  weight_kg: number;
  height_cm: number;
  bmi: number;
  ethnicity: string;
  insurance_type: string;
}

// ─── Medical History ───

export interface MedicalHistory {
  chronic_conditions: ChronicCondition[];
  allergies: Allergy[];
  risk_factors: string[];
  undiagnosed_conditions?: UndiagnosedCondition[];
}

export interface ChronicCondition {
  condition: string;
  icd10: string;
  diagnosed_date?: string;
  severity: string;
  controlled: boolean;
  medications: string[];
  hba1c_latest?: number;
}

export interface Allergy {
  allergen: string;
  reaction: string;
  severity: string;
}

export interface UndiagnosedCondition {
  condition: string;
  icd10: string;
  discovered_at_node: string | null;
  impact: string;
  will_affect_future_decisions: boolean;
}

// ─── Diagnosis ───

export interface Diagnosis {
  primary: PrimaryDiagnosis;
  secondary?: SecondaryDiagnosis[];
  differential_diagnosis: DifferentialDiagnosis[];
}

export interface PrimaryDiagnosis {
  name: string;
  icd10: string;
  confidence: number;
  diagnosed_at_node: string;
  severity: string;
  acuity: string;
  status?: string;
}

export interface SecondaryDiagnosis {
  name: string;
  icd10: string;
}

export interface DifferentialDiagnosis {
  name: string;
  probability: number;
  ruled_out?: boolean;
}

// ─── Vitals ───

export interface Vitals {
  blood_pressure: {
    systolic: number;
    diastolic: number;
    unit?: string;
  };
  heart_rate: {
    value: number;
    unit?: string;
    rhythm?: string;
  };
  respiratory_rate: {
    value: number;
    unit?: string;
  };
  oxygen_saturation: {
    value: number;
    unit?: string;
    on_oxygen: boolean;
    oxygen_flow?: string;
  };
  temperature: {
    value: number;
    unit: string;
  };
  consciousness: {
    level: string;
    gcs: number;
  };
  pain_score: number;
}

// ─── Lab Results ───

export interface LabValue {
  value: number;
  unit?: string;
  status: string;
  critical?: boolean;
  interpretation?: string;
}

export interface LabResults {
  hematology?: {
    hemoglobin?: LabValue;
    white_blood_cells?: LabValue;
    platelets?: LabValue;
  };
  chemistry?: {
    creatinine?: LabValue;
    glucose?: LabValue;
    potassium?: LabValue;
    sodium?: LabValue;
    BUN?: LabValue;
    lipase?: LabValue;
    amylase?: LabValue;
    [key: string]: LabValue | undefined;
  };
  coagulation?: {
    pt?: LabValue;
    inr?: LabValue;
    aptt?: LabValue;
    d_dimer?: LabValue;
  };
  cardiac?: {
    troponin?: LabValue;
    bnp?: LabValue;
  };
  inflammatory?: {
    crp?: LabValue;
    procalcitonin?: LabValue;
  };
  blood_gas?: {
    ph?: LabValue;
    bicarbonate?: LabValue;
    lactate?: LabValue;
  };
  [key: string]: unknown;
}

// ─── Imaging ───

export interface ImagingResult {
  study: string;
  performed_at: string;
  result: string;
  findings: string[];
  severity?: string;
}

// ─── Symptoms ───

export interface Symptom {
  symptom: string;
  severity: number;
  onset?: string;
  duration?: string;
  characteristics?: string;
  location?: string;
  change_from_last?: string;
  exacerbating_factors?: string[];
  relieving_factors?: string[];
}

// ─── Medications ───

export interface Medication {
  medication: string;
  dose: string;
  route?: string;
  timing?: string;
  started?: string;
  status?: string;
  indication?: string;
}

// ─── Complications ───

export interface Complication {
  complication_id: string;
  type: string;
  icd10?: string;
  severity: string;
  onset?: {
    timestamp: string;
    node_id: string;
    caused_by_decision?: string;
  };
  current_status: string;
  change_in_this_transition?: string;
  was_predicted?: boolean;
  predicted_probability?: number;
  impact?: {
    on_mortality?: number;
    on_treatment_plan?: boolean;
    mortality_contribution?: number;
    affects_treatment_options?: boolean;
    requires_intervention?: boolean;
  };
  treatment?: Array<{
    timestamp: string;
    action: string;
    response?: string;
    details?: string;
  }>;
  prediction_info?: {
    was_predicted: boolean;
    predicted_probability: number;
    predicted_severity: string;
    actual_severity: string;
    prediction_accuracy: string;
  };
  resolution?: {
    resolved: boolean;
    expected_to_resolve: boolean;
    timeline?: string;
  };
}

// ─── Risk Scores ───

export interface RiskScores {
  pesi_score?: { value: number; risk_class: string; interpretation: string };
  timi_score?: { value: number; risk_class: string } | null;
  heart_score?: { value: number; risk_class: string } | null;
  wells_pe_score?: { value: number; risk_class: string } | null;
  has_bled_score?: number;
  [key: string]: unknown;
}

