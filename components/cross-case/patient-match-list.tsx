"use client";

import type { PatientMatch } from "@/lib/types/cross-case";
import { Badge } from "@/components/ui/badge";
import { OutcomeBadge } from "@/components/patient/outcome-badge";
import { formatCurrency, formatPercentage } from "@/lib/utils/format";
import { Users, CheckSquare, Square } from "@phosphor-icons/react";

interface PatientMatchListProps {
  matches: PatientMatch[];
  onToggle: (patientId: string) => void;
}

export function PatientMatchList({ matches, onToggle }: PatientMatchListProps) {
  const selectedCount = matches.filter((m) => m.selected !== false).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-muted-foreground" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Similar Cases Found
          </span>
          <Badge variant="secondary" className="text-[10px] font-mono">
            {matches.length} matches
          </Badge>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {selectedCount} selected for comparison
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {matches.map((match) => {
          const isSelected = match.selected !== false;
          return (
            <button
              key={match.patientId}
              type="button"
              onClick={() => onToggle(match.patientId)}
              className={`
                group flex flex-col gap-2 rounded-lg border p-3 text-left transition-all
                ${isSelected
                  ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:border-muted-foreground/30 opacity-60"
                }
              `}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {isSelected ? (
                      <CheckSquare size={14} weight="fill" className="shrink-0 text-primary" />
                    ) : (
                      <Square size={14} className="shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate text-xs font-medium">{match.patientName}</span>
                  </div>
                  <p className="mt-0.5 truncate pl-5 font-mono text-[9px] text-muted-foreground">
                    {match.patientId}
                  </p>
                </div>
                <OutcomeBadge status={match.outcome} size="sm" />
              </div>

              {/* Similarity bar */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Similarity</span>
                  <span className="font-mono font-medium">
                    {formatPercentage(match.similarityScore * 100, 0)}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${match.similarityScore * 100}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-1 text-center text-[9px]">
                <div>
                  <p className="font-mono font-medium">{match.losDays.toFixed(1)}d</p>
                  <p className="text-muted-foreground">LOS</p>
                </div>
                <div>
                  <p className="font-mono font-medium">{formatCurrency(match.totalCost)}</p>
                  <p className="text-muted-foreground">Cost</p>
                </div>
                <div>
                  <p className="font-mono font-medium">{match.complicationsTotal}</p>
                  <p className="text-muted-foreground">Complic.</p>
                </div>
              </div>

              {/* Shared info */}
              <div className="flex flex-wrap gap-1">
                {match.demographicOverlap.sameTriageCode && (
                  <Badge variant="outline" className="text-[8px] px-1 py-0">Same Triage</Badge>
                )}
                {match.demographicOverlap.sameGender && (
                  <Badge variant="outline" className="text-[8px] px-1 py-0">Same Gender</Badge>
                )}
                {match.demographicOverlap.sharedChronicConditions.length > 0 && (
                  <Badge variant="outline" className="text-[8px] px-1 py-0">
                    {match.demographicOverlap.sharedChronicConditions.length} shared conditions
                  </Badge>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

