"use client";

import type { PatternMatch, DeadlyPattern } from "@/lib/types/historical";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatRiskPercentage } from "@/lib/utils/format";
import { Graph, Skull } from "@phosphor-icons/react";

interface PatternMatchCardProps {
  patterns: PatternMatch[];
  deadlyPatterns: DeadlyPattern[];
}

export function PatternMatchCard({ patterns, deadlyPatterns }: PatternMatchCardProps) {
  return (
    <div className="space-y-3">
      {/* Standard patterns */}
      {patterns.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Graph size={14} />
            Matched Patterns
          </div>
          {patterns.map((p) => (
            <div key={p.pattern_id} className="rounded-md border border-border/50 p-2 space-y-1.5">
              <p className="text-xs font-medium">{p.pattern_name.replace(/_/g, " ")}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">Similarity</span>
                <Progress value={p.similarity * 100} className="h-1.5 flex-1" />
                <span className="text-[10px] font-mono">{(p.similarity * 100).toFixed(0)}%</span>
              </div>
              <div className="flex gap-2 text-[10px]">
                <Badge variant="secondary" className="text-[9px]">
                  Mortality: {formatRiskPercentage(p.pattern_outcomes.mortality)}
                </Badge>
                <Badge variant="secondary" className="text-[9px]">
                  Complications: {formatRiskPercentage(p.pattern_outcomes.complication_rate)}
                </Badge>
                <Badge variant="secondary" className="text-[9px]">
                  Success: {formatRiskPercentage(p.pattern_outcomes.success_rate)}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deadly patterns */}
      {deadlyPatterns.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-red-500">
            <Skull size={14} weight="fill" />
            Deadly Pattern Matches
          </div>
          {deadlyPatterns.map((p) => (
            <div
              key={p.pattern_id}
              className="rounded-md border border-red-500/30 bg-red-500/5 p-2 space-y-1.5"
            >
              <p className="text-xs font-medium">{p.pattern_name.replace(/_/g, " ")}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px]">Similarity</span>
                <Progress value={p.similarity * 100} className="h-1.5 flex-1" />
                <span className="text-[10px] font-mono">{(p.similarity * 100).toFixed(0)}%</span>
              </div>
              <p className="text-[10px] text-red-600 dark:text-red-400">
                Pattern mortality: {formatRiskPercentage(p.pattern_mortality)}
              </p>
              {p.key_difference && (
                <p className="text-[10px] text-muted-foreground italic">
                  Difference: {p.key_difference.replace(/_/g, " ")}
                </p>
              )}
              <Badge variant="outline" className="text-[9px]">
                {p.risk_assessment.replace(/_/g, " ")}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

