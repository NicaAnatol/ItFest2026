import type { PatientNode } from "@/lib/types/patient";
import type { ComplicationTimelineEntry } from "@/lib/types/patient";

/** Build a trimmed context object for a single node explanation */
export function buildNodeExplainContext(node: PatientNode) {
  return {
    node_id: node.node_id,
    sequence: node.sequence,
    timestamp: node.timestamp.exact,
    time_since_admission: node.duration.time_since_admission,
    department: node.logistics.location.department.name,
    decision: {
      action: node.decision.action,
      category: node.decision.action_category,
      made_by: {
        name: node.decision.made_by.name,
        role: node.decision.made_by.role,
        specialty: node.decision.made_by.specialty,
        confidence: node.decision.made_by.decision_confidence,
      },
      reasoning: node.decision.reasoning.primary_reason,
      evidence: node.decision.reasoning.supporting_evidence,
      guidelines: node.decision.reasoning.guidelines_followed,
      orders_count: node.decision.orders.length,
      orders_summary: node.decision.orders.map((o) => ({
        type: o.type,
        urgency: o.urgency,
        medication: o.medication?.name,
        tests: o.tests,
      })),
    },
    vitals: {
      bp: `${node.patient_state.vitals.blood_pressure.systolic}/${node.patient_state.vitals.blood_pressure.diastolic}`,
      hr: node.patient_state.vitals.heart_rate.value,
      rr: node.patient_state.vitals.respiratory_rate.value,
      spo2: node.patient_state.vitals.oxygen_saturation.value,
      spo2_on_o2: node.patient_state.vitals.oxygen_saturation.on_oxygen,
      temp: node.patient_state.vitals.temperature.value,
      pain: node.patient_state.vitals.pain_score,
      gcs: node.patient_state.vitals.consciousness.gcs,
    },
    diagnosis: {
      primary: node.patient_state.diagnosis.primary.name,
      icd10: node.patient_state.diagnosis.primary.icd10,
      confidence: node.patient_state.diagnosis.primary.confidence,
      severity: node.patient_state.diagnosis.primary.severity,
    },
    active_medications: node.patient_state.medications_active.map((m) => `${m.medication} ${m.dose}`),
    active_complications: node.patient_state.complications_active.map((c) => ({
      type: c.type,
      severity: c.severity,
      status: c.current_status,
    })),
    risk: {
      mortality_total: node.risk_assessment.mortality_risk.total,
      mortality_baseline: node.risk_assessment.mortality_risk.baseline,
      complication_risk: node.risk_assessment.complication_risk.overall,
      top_complications: node.risk_assessment.potential_complications.slice(0, 3).map((c) => ({
        type: c.complication_type,
        probability: c.probability,
        mortality_if_occurs: c.mortality_if_occurs,
      })),
    },
    flags: node.historical_analysis.flags.map((f) => ({
      type: f.type,
      severity: f.severity,
      message: f.message,
    })),
    similar_cases: {
      total: node.historical_analysis.similar_cases.total,
      healed_pct: node.historical_analysis.similar_cases.outcomes.healed.percentage,
      died_pct: node.historical_analysis.similar_cases.outcomes.died.percentage,
    },
    outcome: {
      success: node.transition_outcome.success,
      state_change: node.transition_outcome.net_impact.patient_state_change,
      quality: node.transition_outcome.net_impact.decision_quality,
      cost: node.transition_outcome.net_impact.cost,
    },
  };
}

export function buildNodeExplainQuestion(node: PatientNode): string {
  return `Explain what is happening at this step (Node #${node.sequence}) in the patient's journey. The action taken is "${node.decision.action.replace(/_/g, " ")}". Cover: what was the clinical situation, what decision was made and why, what were the risks, did any AI flags get raised, and what was the outcome of this step? Keep it focused on this single step.`;
}

/** Build context for a single complication */
export function buildComplicationExplainContext(complication: ComplicationTimelineEntry) {
  return {
    complication_id: complication.complication_id,
    type: complication.type,
    introduced_at: complication.introduced_at,
    resolved_at: complication.resolved_at,
    permanent: complication.permanent,
    was_predicted: complication.was_predicted,
    contributed_to_final_outcome: complication.contributed_to_final_outcome,
  };
}

export function buildComplicationExplainQuestion(complication: ComplicationTimelineEntry): string {
  return `Explain this specific complication: "${complication.type.replace(/_/g, " ")}". It was introduced at ${complication.introduced_at}${complication.resolved_at ? ` and resolved at ${complication.resolved_at}` : " and remains unresolved"}. ${complication.permanent ? "This is a permanent complication." : ""} ${complication.was_predicted ? "The AI system predicted this complication." : "This was NOT predicted by the AI."} What likely caused it, what does it mean clinically, and what should the care team be aware of?`;
}

/** Build context specifically for explaining why a node was flagged.
 *  Includes full decision details, similar-case evidence, pattern matches,
 *  interaction risks, and alternative decision outcomes so the AI can
 *  explain the flag in the context of THIS decision and cite evidence
 *  from similar patients. */
export function buildFlagExplainContext(node: PatientNode) {
  const sc = node.historical_analysis.similar_cases;

  return {
    node_id: node.node_id,
    sequence: node.sequence,
    timestamp: node.timestamp.exact,
    time_since_admission: node.duration.time_since_admission,
    department: node.logistics.location.department.name,

    // ── The decision that was flagged ────────────────────────────────
    decision: {
      action: node.decision.action,
      action_category: node.decision.action_category,
      made_by: {
        name: node.decision.made_by.name,
        role: node.decision.made_by.role,
        specialty: node.decision.made_by.specialty,
        confidence: node.decision.made_by.decision_confidence,
        experience_years: node.decision.made_by.experience_years,
      },
      reasoning: {
        primary_reason: node.decision.reasoning.primary_reason,
        supporting_evidence: node.decision.reasoning.supporting_evidence,
        guidelines_followed: node.decision.reasoning.guidelines_followed,
      },
      orders: node.decision.orders.map((o) => ({
        type: o.type,
        urgency: o.urgency,
        medication: o.medication
          ? { name: o.medication.name, dose: o.medication.dose, route: o.medication.route }
          : undefined,
        tests: o.tests,
      })),
      alternatives_considered: node.decision.alternatives_considered.map((a) => ({
        option: a.option,
        why_not_chosen: a.why_not_chosen,
        pros: a.pros,
        cons: a.cons,
        historical_outcome: a.historical_outcome_if_chosen,
      })),
      expected_outcome: node.decision.expected_outcome,
    },

    // ── Patient state at this node ──────────────────────────────────
    vitals: {
      bp: `${node.patient_state.vitals.blood_pressure.systolic}/${node.patient_state.vitals.blood_pressure.diastolic}`,
      hr: node.patient_state.vitals.heart_rate.value,
      rr: node.patient_state.vitals.respiratory_rate.value,
      spo2: node.patient_state.vitals.oxygen_saturation.value,
      spo2_on_o2: node.patient_state.vitals.oxygen_saturation.on_oxygen,
      temp: node.patient_state.vitals.temperature.value,
      pain: node.patient_state.vitals.pain_score,
      gcs: node.patient_state.vitals.consciousness.gcs,
    },
    diagnosis: {
      primary: node.patient_state.diagnosis.primary.name,
      icd10: node.patient_state.diagnosis.primary.icd10,
      severity: node.patient_state.diagnosis.primary.severity,
      confidence: node.patient_state.diagnosis.primary.confidence,
    },
    active_medications: node.patient_state.medications_active.map((m) => ({
      medication: m.medication,
      dose: m.dose,
      route: m.route,
    })),
    active_complications: node.patient_state.complications_active.map((c) => ({
      type: c.type,
      severity: c.severity,
      status: c.current_status,
    })),

    // ── Risk assessment ─────────────────────────────────────────────
    risk: {
      mortality_total: node.risk_assessment.mortality_risk.total,
      mortality_baseline: node.risk_assessment.mortality_risk.baseline,
      mortality_from_this_decision: node.risk_assessment.mortality_risk.from_this_decision,
      mortality_factors: node.risk_assessment.mortality_risk.factors_contributing,
      complication_risk: node.risk_assessment.complication_risk.overall,
      complication_breakdown: node.risk_assessment.complication_risk.breakdown,
      potential_complications: node.risk_assessment.potential_complications.map((c) => ({
        type: c.complication_type,
        probability: c.probability,
        mortality_if_occurs: c.mortality_if_occurs,
        severity_distribution: c.severity_distribution,
        risk_factors_present: c.risk_factors_present,
        risk_factors_adjusted_probability: c.risk_factors_adjusted_probability,
        historical_frequency: c.historical_frequency,
        mitigation_strategies: c.mitigation_strategies,
      })),
      interaction_risks: node.risk_assessment.interaction_risks.map((r) => ({
        type: r.interaction_type,
        description: r.description ?? r.interaction,
        medication: r.medication,
        condition: r.condition,
        probability: r.probability ?? r.probability_of_issue,
        mortality_if_occurs: r.mortality_if_occurs,
        mitigation: r.mitigation,
      })),
      overlapping_decisions: node.risk_assessment.overlapping_decisions.map((o) => ({
        this_decision: o.this_decision,
        overlapping_with: o.overlapping_with,
        overlap_type: o.overlap_type,
        combined_risk: o.combined_risk,
        mitigation: o.mitigation,
      })),
    },

    // ── Flags (the items we need to explain) ────────────────────────
    flags: node.historical_analysis.flags.map((f) => ({
      flag_id: f.flag_id,
      type: f.type,
      severity: f.severity,
      message: f.message,
      complication: f.complication,
      evidence: f.evidence,
      patient_specific_factors: f.patient_specific_factors,
      adjusted_risk: f.adjusted_risk,
      recommendation: f.recommendation,
      alternative: f.alternative_if_unacceptable,
    })),

    // ── Similar-patient evidence ────────────────────────────────────
    similar_cases: {
      total: sc.total,
      outcomes: sc.outcomes,
      complications_observed: sc.complications_observed,
      subgroups: sc.subgroups,
      temporal_patterns: sc.temporal_patterns,
    },

    // ── Pattern matching (standard + deadly) ────────────────────────
    matched_standard_patterns: node.historical_analysis.pattern_matching.matched_standard_patterns.map((p) => ({
      pattern_name: p.pattern_name,
      similarity: p.similarity,
      pattern_outcomes: p.pattern_outcomes,
      interpretation: p.interpretation,
    })),
    deadly_patterns: node.historical_analysis.pattern_matching.deadly_pattern_matches.map((p) => ({
      pattern_name: p.pattern_name,
      similarity: p.similarity,
      pattern_mortality: p.pattern_mortality,
      key_difference: p.key_difference,
      risk_assessment: p.risk_assessment,
    })),

    // ── Outcome of this node ────────────────────────────────────────
    outcome: {
      success: node.transition_outcome.success,
      state_change: node.transition_outcome.net_impact.patient_state_change,
      quality: node.transition_outcome.net_impact.decision_quality,
    },
  };
}

export function buildFlagExplainQuestion(node: PatientNode): string {
  const flagCount = node.historical_analysis.flags.length;
  const criticalCount = node.historical_analysis.flags.filter((f) => f.severity === "CRITICAL").length;
  const warningCount = node.historical_analysis.flags.filter((f) => f.severity === "WARNING").length;
  const deadlyPatterns = node.historical_analysis.pattern_matching.deadly_pattern_matches.length;
  const stdPatterns = node.historical_analysis.pattern_matching.matched_standard_patterns.length;
  const sc = node.historical_analysis.similar_cases;

  const parts = [
    `This node (#${node.sequence}, "${node.decision.action.replaceAll("_", " ")}") has ${flagCount} AI flag${flagCount === 1 ? "" : "s"}`,
  ];
  if (criticalCount > 0) parts.push(`(${criticalCount} CRITICAL)`);
  if (warningCount > 0) parts.push(`(${warningCount} WARNING)`);
  if (deadlyPatterns > 0) parts.push(`and ${deadlyPatterns} deadly pattern match${deadlyPatterns === 1 ? "" : "es"}`);

  parts.push(
    `. The decision "${node.decision.action.replaceAll("_", " ")}" was made by ${node.decision.made_by.name} (${node.decision.made_by.role}) with ${(node.decision.made_by.decision_confidence * 100).toFixed(0)}% confidence.`,
  );

  parts.push(
    `There are ${sc.total} similar historical cases: ${sc.outcomes.healed.percentage}% healed, ${sc.outcomes.died.percentage}% died.`,
  );

  if (stdPatterns > 0) {
    const bestMatch = node.historical_analysis.pattern_matching.matched_standard_patterns[0];
    parts.push(
      `The closest matched standard pattern is "${bestMatch.pattern_name.replaceAll("_", " ")}" (${(bestMatch.similarity * 100).toFixed(0)}% similarity, ${(bestMatch.pattern_outcomes.mortality * 100).toFixed(1)}% mortality).`,
    );
  }

  parts.push(
    "\n\nExplain in detail:" +
    "\n1) WHY each flag was raised IN THE CONTEXT OF THIS SPECIFIC DECISION — what about choosing \"" +
    node.decision.action.replaceAll("_", " ") +
    "\" triggered these flags? What clinical indicators, vitals, or medication interactions are relevant?" +
    "\n2) EVIDENCE FROM SIMILAR PATIENTS — reference the similar-case cohort data, matched standard patterns, and deadly patterns. How did patients in similar situations who received this same treatment fare? What happened to patients who received the alternative treatments?" +
    "\n3) DECISION vs. ALTERNATIVES — the data includes alternatives that were considered. Compare the chosen decision's risk profile against these alternatives, citing historical outcome data (mortality rates, success rates)." +
    "\n4) INTERACTION & OVERLAP RISKS — explain any drug interactions, overlapping decision risks, or combined risk factors that contribute to the flags." +
    "\n5) CLINICAL DANGER — for each flag, what is the concrete pathophysiological danger? What could go wrong, and how quickly?" +
    "\n6) ACTIONABLE RECOMMENDATIONS — prioritized list of what the care team should do to mitigate the flagged risks. Be specific: drug names, doses, monitoring protocols, timing windows.",
  );

  return parts.join(" ");
}

