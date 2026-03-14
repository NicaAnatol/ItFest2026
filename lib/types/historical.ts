// Historical analysis types

export interface HistoricalAnalysis {
  query_parameters?: Record<string, unknown>;
  similar_cases: SimilarCases;
  flags: Flag[];
  pattern_matching: PatternMatching;
  alternative_paths_analyzed?: AlternativePath[];
}

export interface SimilarCases {
  total: number;
  outcomes: {
    healed: { count: number; percentage: number };
    healed_with_complications: { count: number; percentage: number };
    died: { count: number; percentage: number };
  };
  complications_observed?: Record<string, ComplicationStats>;
  final_diagnoses?: Record<string, { count: number; percentage: number }>;
  temporal_patterns?: {
    time_to_stabilization?: { median: string; q25: string; q75: string };
    length_of_stay?: { median: string; q25: string; q75: string };
  };
  time_to_diagnosis?: { median: string; q25: string; q75: string };
  subgroups?: Record<string, {
    count: number;
    mortality: number;
    major_bleeding_rate?: number;
    decompensation_rate?: number;
  }>;
}

export interface ComplicationStats {
  count: number;
  percentage: number;
  severity_breakdown?: Record<string, number>;
  outcomes?: Record<string, number>;
  mortality_rate?: number;
  timing?: { median_onset: string; range: string };
  locations?: Array<{ site: string; count: number }>;
  salvage?: Record<string, { used: number; successful: number }>;
  note?: string;
}

export type FlagSeverity = "INFO" | "WARNING" | "CRITICAL";
export type FlagType =
  | "HIGH_RISK_COMPLICATION"
  | "TIMING_CRITICAL"
  | "CONSIDER_WORKUP"
  | "DECISION_OVERLAP_RISK"
  | "DOSAGE_CHECK"
  | "INTERACTION_WARNING"
  | "HIGH_RISK_PRESENTATION"
  | "AGE_RELATED_RISK";

export interface Flag {
  flag_id: string;
  type: FlagType | string;
  severity: FlagSeverity;
  complication?: string;
  message: string;
  evidence: {
    similar_cases?: number;
    complication_count?: number;
    complication_rate?: number;
    deaths_from_complication?: number;
    mortality_if_occurs?: number;
    patient_specific_adjustment?: number;
    supporting_data_points?: number;
    baseline_mortality?: number;
    adjusted_mortality?: number;
    age_adjusted_mortality?: number;
    age_adjusted_complications?: number;
    [key: string]: unknown;
  };
  patient_specific_factors?: string[];
  adjusted_risk?: number;
  recommendation: {
    action: string;
    message?: string;
    monitoring_protocol?: {
      labs?: Array<{ test: string; frequency: string; alert_if: string }>;
      clinical?: string[];
      preparedness?: string[];
    };
  };
  alternative_if_unacceptable?: {
    option: string;
    advantage: string;
    disadvantage: string;
    evidence: { cases: number; major_bleeding_rate: number; mortality_rate: number };
  };
}

export interface PatternMatching {
  matched_standard_patterns: PatternMatch[];
  deadly_pattern_matches: DeadlyPattern[];
}

export interface PatternMatch {
  pattern_id: string;
  pattern_name: string;
  similarity: number;
  pattern_outcomes: {
    mortality: number;
    complication_rate: number;
    success_rate: number;
  };
  interpretation?: string;
}

export interface DeadlyPattern {
  pattern_id: string;
  pattern_name: string;
  similarity: number;
  pattern_mortality: number;
  key_difference?: string;
  risk_assessment: string;
}

export interface AlternativePath {
  alternative: string;
  historical_data: {
    cases: number;
    outcomes: {
      healed: { count: number; percentage: number };
      healed_with_complications: { count: number; percentage: number };
      died: { count: number; percentage: number };
    };
    complications?: Record<string, { count: number; rate: number }>;
  };
  comparison_to_chosen_path?: Record<string, {
    UFH?: number;
    LMWH?: number;
    difference?: number;
    interpretation?: string;
  }>;
  why_not_chosen: string;
  recommendation?: string;
}

