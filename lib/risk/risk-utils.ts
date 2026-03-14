// Risk calculation helpers

import type { PotentialComplication } from "@/lib/types/decision";
import type { Flag } from "@/lib/types/historical";
import { getRiskLevel, getRiskColor, formatRiskPercentage, type RiskLevel } from "@/lib/utils/format";

export { getRiskLevel, getRiskColor, formatRiskPercentage };
export type { RiskLevel };

/** Apply patient-specific risk factors to base risk */
export function calculateAdjustedRisk(
  baseRisk: number,
  factors: Array<{ factor: string; increases_risk_by: number }>,
): number {
  let adjusted = baseRisk;
  for (const f of factors) {
    adjusted *= f.increases_risk_by;
  }
  return Math.min(1, adjusted);
}

/** Get the highest-risk complication from a list */
export function getHighestRiskComplication(
  complications: PotentialComplication[],
): PotentialComplication | undefined {
  if (!complications.length) return undefined;
  return complications.reduce((max, c) =>
    c.probability > max.probability ? c : max,
  );
}

/** Compute aggregate risk from multiple complications */
export function getAggregateComplicationRisk(
  complications: PotentialComplication[],
): number {
  if (!complications.length) return 0;
  // P(at least one) = 1 - product(1 - p_i)
  const noComp = complications.reduce((prod, c) => prod * (1 - c.probability), 1);
  return 1 - noComp;
}

/** Count flags by severity */
export function countFlagsBySeverity(flags: Flag[]): { info: number; warning: number; critical: number } {
  return {
    info: flags.filter((f) => f.severity === "INFO").length,
    warning: flags.filter((f) => f.severity === "WARNING").length,
    critical: flags.filter((f) => f.severity === "CRITICAL").length,
  };
}

