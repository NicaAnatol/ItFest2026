"use client";

import type { SimilarCases } from "@/lib/types/historical";
import { Badge } from "@/components/ui/badge";
import { formatPercentage } from "@/lib/utils/format";
import { Users, CheckCircle, Warning, Skull } from "@phosphor-icons/react";

interface SimilarCasesPanelProps {
  cases: SimilarCases;
}

export function SimilarCasesPanel({ cases }: SimilarCasesPanelProps) {
  const { healed, healed_with_complications, died } = cases.outcomes;
  const total = cases.total;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users size={16} className="text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Similar Cases
        </span>
        <Badge variant="secondary" className="text-[10px] font-mono">
          {total} cases
        </Badge>
      </div>

      {/* Outcome donut (simplified as bars) */}
      <div className="space-y-1.5">
        {/* Healed */}
        <div className="flex items-center gap-2">
          <CheckCircle size={14} weight="fill" className="shrink-0 text-emerald-500" />
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs">
              <span>Healed</span>
              <span className="font-mono">{healed.count} ({formatPercentage(healed.percentage)})</span>
            </div>
            <div className="mt-0.5 h-2 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${healed.percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Complicated */}
        <div className="flex items-center gap-2">
          <Warning size={14} weight="fill" className="shrink-0 text-amber-500" />
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs">
              <span>With Complications</span>
              <span className="font-mono">
                {healed_with_complications.count} ({formatPercentage(Math.max(0, healed_with_complications.percentage))})
              </span>
            </div>
            <div className="mt-0.5 h-2 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-amber-500"
                style={{ width: `${Math.max(0, healed_with_complications.percentage)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Deceased */}
        <div className="flex items-center gap-2">
          <Skull size={14} weight="fill" className="shrink-0 text-red-500" />
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs">
              <span>Deceased</span>
              <span className="font-mono">{died.count} ({formatPercentage(died.percentage)})</span>
            </div>
            <div className="mt-0.5 h-2 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-red-500"
                style={{ width: `${died.percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

