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

