"use client";

import type { OutcomeCorrelation } from "@/lib/types/cross-case";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatPercentage, formatDuration } from "@/lib/utils/format";
import { TrendUp, TrendDown, Minus } from "@phosphor-icons/react";

interface OutcomeCorrelationBarProps {
  correlations: OutcomeCorrelation[];
}

function getSignificanceColor(sig: string): string {
  switch (sig) {
    case "high":
      return "border-primary/40 bg-primary/5";
    case "moderate":
      return "border-amber-500/30 bg-amber-500/5";
    default:
      return "border-border";
  }
}

function getSignificanceBadge(sig: string): string {
  switch (sig) {
    case "high":
      return "bg-primary/15 text-primary";
    case "moderate":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function OutcomeCorrelationBars({
  correlations,
}: OutcomeCorrelationBarProps) {
  if (correlations.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic py-4 text-center">
        Not enough data to compute outcome correlations.
      </p>
    );
  }

  // Only show patterns with >= 2 occurrences
  const significant = correlations.filter((c) => c.sampleSize >= 2);

  return (
    <div className="space-y-2">
      {significant.slice(0, 12).map((corr) => {
        const totalOutcomes =
          corr.outcomes.healed +
          corr.outcomes.healedWithComplications +
          corr.outcomes.deceased;
        const healedPct =
          totalOutcomes > 0 ? (corr.outcomes.healed / totalOutcomes) * 100 : 0;
        const compPct =
          totalOutcomes > 0
            ? (corr.outcomes.healedWithComplications / totalOutcomes) * 100
            : 0;
        const deceasedPct =
          totalOutcomes > 0
            ? (corr.outcomes.deceased / totalOutcomes) * 100
            : 0;

        return (
          <div
            key={corr.patternId}
            className={`rounded-lg border p-3 space-y-2 ${getSignificanceColor(corr.significance)}`}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium leading-tight">
                  {corr.patternLabel}
                </p>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{corr.sampleSize} cases</span>
                  <span>·</span>
                  <span>avg {formatDuration(corr.avgTimingSeconds)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge className={`text-[8px] ${getSignificanceBadge(corr.significance)}`}>
                  {corr.significance}
                </Badge>
                {corr.successRate >= 0.7 ? (
                  <TrendUp size={14} weight="bold" className="text-emerald-500" />
                ) : corr.mortalityRate >= 0.3 ? (
                  <TrendDown size={14} weight="bold" className="text-red-500" />
                ) : (
                  <Minus size={14} className="text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Stacked outcome bar */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-3 w-full flex rounded-full overflow-hidden bg-muted cursor-help">
                  {healedPct > 0 && (
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{ width: `${healedPct}%` }}
                    />
                  )}
                  {compPct > 0 && (
                    <div
                      className="h-full bg-amber-500 transition-all"
                      style={{ width: `${compPct}%` }}
                    />
                  )}
                  {deceasedPct > 0 && (
                    <div
                      className="h-full bg-red-500 transition-all"
                      style={{ width: `${deceasedPct}%` }}
                    />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent className="text-xs space-y-1">
                <p className="text-emerald-500">
                  Healed: {corr.outcomes.healed} ({formatPercentage(healedPct, 0)})
                </p>
                <p className="text-amber-500">
                  Complications: {corr.outcomes.healedWithComplications} ({formatPercentage(compPct, 0)})
                </p>
                <p className="text-red-500">
                  Deceased: {corr.outcomes.deceased} ({formatPercentage(deceasedPct, 0)})
                </p>
              </TooltipContent>
            </Tooltip>

            {/* Quick stats */}
            <div className="flex items-center gap-3 text-[10px]">
              <span>
                Success: <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                  {formatPercentage(corr.successRate * 100, 0)}
                </span>
              </span>
              <span>
                Mortality: <span className="font-mono font-medium text-red-600 dark:text-red-400">
                  {formatPercentage(corr.mortalityRate * 100, 0)}
                </span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

