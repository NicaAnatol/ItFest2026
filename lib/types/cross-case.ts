// Cross-case pattern analysis types

import type { OutcomeStatus } from "./patient";
import type { ActionCategory } from "./decision";

// ─── Top-level analysis result ───

export interface CrossCaseAnalysis {
  referencePatientId: string;
  matches: PatientMatch[];
  alignedPairs: AlignedNodePair[];
  divergences: DecisionDivergence[];
  outcomeCorrelations: OutcomeCorrelation[];
  insights: CrossCaseInsight[];
}

// ─── Similar patient match ───

export interface PatientMatch {
  patientId: string;
  patientName: string;
  similarityScore: number; // 0–1
  outcome: OutcomeStatus;
  sharedDiagnosis: string;
  sharedDiagnosisIcd10: string;
  demographicOverlap: {
    ageDiff: number;
    sameGender: boolean;
    sharedChronicConditions: string[];
    sameTriageCode: boolean;
  };
  losDays: number;
  totalCost: number;
  totalNodes: number;
  complicationsTotal: number;
  qualityScore: number;
  selected?: boolean;
}

// ─── Node alignment across patients ───

export interface AlignedNodePair {
  /** Category + sequence stage (e.g., "diagnostic-2") */
  stageKey: string;
  stageLabel: string;
  referenceNode: AlignedNodeSummary;
  comparedNodes: AlignedNodeSummary[];
}

export interface AlignedNodeSummary {
  patientId: string;
  patientName: string;
  nodeId: string;
  sequence: number;
  action: string;
  actionCategory: ActionCategory;
  department: string;
  departmentId: string;
  timeSinceAdmissionSeconds: number;
  mortalityRisk: number;
  complicationRisk: number;
  flagsCount: number;
  criticalFlags: number;
  decisionQuality: string;
  outcome: OutcomeStatus;
  transitionSuccess: boolean;
}

// ─── Divergence points ───

export type DivergenceType =
  | "different_action"
  | "different_timing"
  | "different_department"
  | "skipped_step"
  | "extra_step";

export interface DecisionDivergence {
  stageKey: string;
  stageLabel: string;
  divergenceType: DivergenceType;
  referenceNode: AlignedNodeSummary;
  comparedNode: AlignedNodeSummary;
  timingDeltaSeconds: number;
  outcomeImpact: {
    referenceOutcome: OutcomeStatus;
    comparedOutcome: OutcomeStatus;
    referenceQuality: string;
    comparedQuality: string;
  };
  description: string;
}

// ─── Outcome correlations ───

export interface OutcomeCorrelation {
  /** e.g. "early_anticoagulation", "delayed_imaging" */
  patternId: string;
  patternLabel: string;
  actionCategory: ActionCategory;
  /** How many patients followed this pattern */
  sampleSize: number;
  outcomes: {
    healed: number;
    healedWithComplications: number;
    deceased: number;
  };
  /** Percentage of positive outcomes (healed) */
  successRate: number;
  /** Percentage of negative outcomes (deceased) */
  mortalityRate: number;
  /** Whether this differs significantly from overall dataset rates */
  significance: "high" | "moderate" | "low";
  /** Average timing for this action */
  avgTimingSeconds: number;
  /** Which patients followed this pattern */
  patientIds: string[];
}

// ─── AI-generated insights ───

export type InsightType =
  | "timing_pattern"
  | "decision_pattern"
  | "risk_warning"
  | "complication_predictor"
  | "positive_pattern"
  | "outcome_correlation";

export type InsightSeverity = "info" | "warning" | "critical";

export interface CrossCaseInsight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  message: string;
  evidence: {
    caseCount?: number;
    percentage?: number;
    comparisonMetric?: string;
    patientIds?: string[];
  };
  recommendation?: string;
}

// ─── Summary payload for AI (compact, token-efficient) ───

export interface PatternSummary {
  referencePatient: {
    id: string;
    name: string;
    diagnosis: string;
    icd10: string;
    age: number;
    gender: string;
    outcome: OutcomeStatus;
    losDays: number;
    totalCost: number;
    complications: number;
    triageCode: string;
    decisionSequence: PatternNodeSummary[];
  };
  comparedPatients: Array<{
    id: string;
    name: string;
    outcome: OutcomeStatus;
    similarityScore: number;
    losDays: number;
    complications: number;
    decisionSequence: PatternNodeSummary[];
  }>;
  divergencePoints: Array<{
    stage: string;
    type: DivergenceType;
    referenceAction: string;
    comparedAction: string;
    timingDelta: string;
    referenceOutcome: OutcomeStatus;
    comparedOutcome: OutcomeStatus;
  }>;
  outcomeCorrelations: Array<{
    pattern: string;
    sampleSize: number;
    successRate: number;
    mortalityRate: number;
    significance: string;
  }>;
}

export interface PatternNodeSummary {
  sequence: number;
  action: string;
  category: ActionCategory;
  department: string;
  timingBucket: string; // "0-1h", "1-4h", "4-12h", "12-24h", "24h+"
  mortalityRisk: number;
  flags: number;
  quality: string;
}

