"use client";

import type { Alternative } from "@/lib/types/decision";
import { Badge } from "@/components/ui/badge";
import { formatActionName, formatRiskPercentage } from "@/lib/utils/format";
import { Check, X } from "@phosphor-icons/react";

interface AlternativesPanelProps {
  alternatives: Alternative[];
}

export function AlternativesPanel({ alternatives }: AlternativesPanelProps) {
  if (!alternatives.length) return null;

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Alternatives Considered ({alternatives.length})
      </p>
      {alternatives.map((alt, i) => (
        <div key={i} className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              Option {i + 1}
            </Badge>
            <span className="text-xs font-medium">
              {formatActionName(alt.option)}
            </span>
          </div>

          {alt.description && (
            <p className="text-[10px] text-muted-foreground">{alt.description}</p>
          )}

          <div className="grid grid-cols-2 gap-2">
            {/* Pros */}
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Pros</p>
              {alt.pros.map((p, j) => (
                <div key={j} className="flex items-center gap-1 text-[10px]">
                  <Check size={10} className="text-emerald-500" />
                  {p}
                </div>
              ))}
            </div>
            {/* Cons */}
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-red-600 dark:text-red-400">Cons</p>
              {alt.cons.map((c, j) => (
                <div key={j} className="flex items-center gap-1 text-[10px]">
                  <X size={10} className="text-red-500" />
                  {c}
                </div>
              ))}
            </div>
          </div>

          {/* Why not chosen */}
          <p className="text-[10px] text-muted-foreground italic">
            → {alt.why_not_chosen}
          </p>

          {/* Historical data */}
          {alt.historical_outcome_if_chosen && (
            <div className="flex flex-wrap gap-2 text-[10px]">
              <Badge variant="secondary" className="text-[9px]">
                {alt.historical_outcome_if_chosen.cases} cases
              </Badge>
              <Badge variant="secondary" className="text-[9px]">
                Mortality: {formatRiskPercentage(alt.historical_outcome_if_chosen.mortality_rate)}
              </Badge>
              {alt.historical_outcome_if_chosen.success_rate !== undefined && (
                <Badge variant="secondary" className="text-[9px]">
                  Success: {formatRiskPercentage(alt.historical_outcome_if_chosen.success_rate)}
                </Badge>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

