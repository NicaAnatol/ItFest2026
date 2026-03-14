// Decision analysis helpers

import type { PatientNode } from "@/lib/types/patient";
import type { Decision, Alternative } from "@/lib/types/decision";
import type { Flag } from "@/lib/types/historical";

/** Get decision quality from a node's transition outcome */
export function getDecisionQuality(
  node: PatientNode,
): "APPROPRIATE" | "SUBOPTIMAL" {
  return node.transition_outcome.net_impact.decision_quality === "SUBOPTIMAL"
    ? "SUBOPTIMAL"
    : "APPROPRIATE";
}

/** Count flags by severity from a list */
export function countFlagsBySeverity(flags: Flag[]) {
  return {
    info: flags.filter((f) => f.severity === "INFO").length,
    warning: flags.filter((f) => f.severity === "WARNING").length,
    critical: flags.filter((f) => f.severity === "CRITICAL").length,
  };
}

/** Check if a node has any deadly pattern matches */
export function hasDeadlyPatternMatch(node: PatientNode): boolean {
  return (
    node.historical_analysis.pattern_matching.deadly_pattern_matches.length > 0
  );
}

/** Compare alternatives with the chosen decision */
export function compareAlternatives(decision: Decision) {
  return decision.alternatives_considered.map((alt) => ({
    option: alt.option,
    description: alt.description ?? alt.option.replace(/_/g, " "),
    why_not_chosen: alt.why_not_chosen,
    pros: alt.pros,
    cons: alt.cons,
    historical: alt.historical_outcome_if_chosen,
  }));
}

/** Get all orders grouped by type */
export function getOrdersByType(decision: Decision) {
  const groups: Record<string, typeof decision.orders> = {};
  for (const order of decision.orders) {
    const type = order.type;
    if (!groups[type]) groups[type] = [];
    groups[type].push(order);
  }
  return groups;
}

