"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import type { PatientGraph } from "@/lib/types/patient";
import type {
  PatientMatch,
  AlignedNodePair,
  DecisionDivergence,
  OutcomeCorrelation,
  CrossCaseInsight,
  PatternSummary,
} from "@/lib/types/cross-case";
import {
  findSimilarPatients,
  alignDecisionGraphs,
  findDivergencePoints,
  computeOutcomeCorrelations,
  buildPatternSummary,
} from "@/lib/cross-case/cross-case-utils";
import { usePatientData } from "@/hooks/use-patient-data";

interface UseCrossCaseAnalysisReturn {
  /** Similar patient matches */
  matches: PatientMatch[];
  /** Toggle selection for a match */
  toggleMatch: (patientId: string) => void;
  /** Selected matches */
  selectedMatches: PatientMatch[];
  /** Aligned node pairs between reference and selected matches */
  alignedPairs: AlignedNodePair[];
  /** Divergence points */
  divergences: DecisionDivergence[];
  /** Outcome correlations */
  correlations: OutcomeCorrelation[];
  /** Whether similarity data is loading */
  loading: boolean;
  /** AI analysis state */
  aiAnalysis: {
    text: string;
    insights: CrossCaseInsight[];
    loading: boolean;
    error: string | null;
  };
  /** Trigger AI analysis */
  analyzeWithAI: () => Promise<void>;
}

export function useCrossCaseAnalysis(
  patient: PatientGraph | null,
): UseCrossCaseAnalysisReturn {
  const { patients, loading: patientsLoading } = usePatientData();
  const [matchState, setMatchState] = useState<PatientMatch[]>([]);
  const [aiText, setAiText] = useState("");
  const [aiInsights, setAiInsights] = useState<CrossCaseInsight[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Find similar patients
  const computedMatches = useMemo(() => {
    if (!patient || patients.length === 0) return [];
    return findSimilarPatients(patient, patients, 10);
  }, [patient, patients]);

  // effectiveMatches: use user-toggled state if available, otherwise computed
  const effectiveMatches = matchState.length > 0 ? matchState : computedMatches;

  const toggleMatch = useCallback((patientId: string) => {
    setMatchState((prev) =>
      prev.map((m) =>
        m.patientId === patientId ? { ...m, selected: !m.selected } : m,
      ),
    );
  }, []);

  const selectedMatches = effectiveMatches.filter((m) => m.selected !== false);

  // Get full PatientGraph for selected matches
  const selectedPatients = useMemo(() => {
    return patients.filter((p) =>
      selectedMatches.some((m) => m.patientId === p.patient_id),
    );
  }, [patients, selectedMatches]);

  // Compute aligned pairs
  const alignedPairs = useMemo(() => {
    if (!patient || selectedPatients.length === 0) return [];
    return alignDecisionGraphs(patient, selectedPatients);
  }, [patient, selectedPatients]);

  // Compute divergences
  const divergences = useMemo(() => {
    if (alignedPairs.length === 0) return [];
    return findDivergencePoints(alignedPairs);
  }, [alignedPairs]);

  // Compute outcome correlations
  const correlations = useMemo(() => {
    if (!patient || selectedPatients.length === 0) return [];
    return computeOutcomeCorrelations(patient, selectedPatients);
  }, [patient, selectedPatients]);

  // AI analysis
  const analyzeWithAI = useCallback(async () => {
    if (!patient) return;

    setAiText("");
    setAiInsights([]);
    setAiError(null);
    setAiLoading(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const summary: PatternSummary = buildPatternSummary(
        patient,
        selectedMatches,
        selectedPatients,
        divergences,
        correlations,
      );

      const res = await fetch("/api/cross-case-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referencePatientId: patient.patient_id,
          patternSummary: summary,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        setAiError(errBody.error ?? `HTTP ${res.status}`);
        setAiLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setAiError("No response stream");
        setAiLoading(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setAiText(accumulated);
      }

      // Parse insights JSON from the response
      const jsonStart = accumulated.indexOf("<!-- INSIGHTS_JSON_START -->");
      const jsonEnd = accumulated.indexOf("<!-- INSIGHTS_JSON_END -->");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonStr = accumulated
          .slice(jsonStart + "<!-- INSIGHTS_JSON_START -->".length, jsonEnd)
          .trim();
        try {
          // Try to find JSON array in the block (may be wrapped in ```json)
          const cleaned = jsonStr.replace(/^```json?\s*/m, "").replace(/```\s*$/m, "").trim();
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed)) {
            setAiInsights(parsed);
          }
        } catch {
          // Insights parsing failed — not critical, we still have the text
          console.warn("Failed to parse AI insights JSON");
        }
      }

      setAiLoading(false);
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setAiError(err.message ?? "Failed to analyze");
        setAiLoading(false);
      } else if (!(err instanceof DOMException)) {
        setAiError("Failed to analyze");
        setAiLoading(false);
      }
    }
  }, [patient, selectedMatches, selectedPatients, divergences, correlations]);

  return {
    matches: effectiveMatches,
    toggleMatch,
    selectedMatches,
    alignedPairs,
    divergences,
    correlations,
    loading: patientsLoading,
    aiAnalysis: {
      text: aiText,
      insights: aiInsights,
      loading: aiLoading,
      error: aiError,
    },
    analyzeWithAI,
  };
}

