"use client";

import { formatRiskPercentage } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Scales } from "@phosphor-icons/react";

interface ComparisonData {
  label: string;
  chosenValue: number;
  alternativeValue: number;
  lowerIsBetter?: boolean;
}

interface OutcomeComparisonChartProps {
  chosenLabel: string;
  alternativeLabel: string;
  metrics: ComparisonData[];
}

export function OutcomeComparisonChart({
  chosenLabel,
  alternativeLabel,
  metrics,
}: OutcomeComparisonChartProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Scales size={14} />
        Outcome Comparison
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-primary" />
          <span>{chosenLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/50" />
          <span>{alternativeLabel}</span>
        </div>
      </div>

      {/* Bars */}
      <div className="space-y-2">
        {metrics.map((m) => {
          const max = Math.max(m.chosenValue, m.alternativeValue, 0.01);
          const chosenBetter = m.lowerIsBetter
            ? m.chosenValue <= m.alternativeValue
            : m.chosenValue >= m.alternativeValue;

          return (
            <div key={m.label} className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">{m.label}</span>
                {chosenBetter ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 text-[8px]">better</Badge>
                ) : (
                  <Badge className="bg-amber-500/15 text-amber-700 text-[8px]">worse</Badge>
                )}
              </div>
              {/* Chosen */}
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(m.chosenValue / max) * 100}%` }}
                  />
                </div>
                <span className="w-12 text-right font-mono text-[10px]">
                  {formatRiskPercentage(m.chosenValue)}
                </span>
              </div>
              {/* Alternative */}
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-muted-foreground/50"
                    style={{ width: `${(m.alternativeValue / max) * 100}%` }}
                  />
                </div>
                <span className="w-12 text-right font-mono text-[10px]">
                  {formatRiskPercentage(m.alternativeValue)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

