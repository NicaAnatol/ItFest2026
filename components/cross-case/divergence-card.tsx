"use client";

import { useState } from "react";
import type { DecisionDivergence } from "@/lib/types/cross-case";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { OutcomeBadge } from "@/components/patient/outcome-badge";
import { getOutcomeLabel, formatRiskPercentage } from "@/lib/utils/format";
import {
  GitFork,
  Clock,
  Buildings,
  ArrowRight,
  CaretDown,
  CaretUp,
} from "@phosphor-icons/react";

interface DivergenceCardProps {
  divergence: DecisionDivergence;
}

function getDivergenceIcon(type: string) {
  switch (type) {
    case "different_action":
      return <GitFork size={14} weight="bold" className="text-orange-500" />;
    case "different_timing":
      return <Clock size={14} weight="bold" className="text-blue-500" />;
    case "different_department":
      return <Buildings size={14} weight="bold" className="text-purple-500" />;
    default:
      return <GitFork size={14} className="text-muted-foreground" />;
  }
}

function getDivergenceLabel(type: string): string {
  switch (type) {
    case "different_action":
      return "Different Action";
    case "different_timing":
      return "Timing Difference";
    case "different_department":
      return "Department Difference";
    case "skipped_step":
      return "Skipped Step";
    case "extra_step":
      return "Extra Step";
    default:
      return type;
  }
}

function getDivergenceBadgeColor(type: string): string {
  switch (type) {
    case "different_action":
      return "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30";
    case "different_timing":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30";
    case "different_department":
      return "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function DivergenceCard({ divergence }: DivergenceCardProps) {
  const [open, setOpen] = useState(false);
  const ref = divergence.referenceNode;
  const comp = divergence.comparedNode;

  // Determine if the compared outcome was better or worse
  const outcomeOrder = { HEALED: 0, HEALED_WITH_COMPLICATIONS: 1, DECEASED: 2 };
  const refScore = outcomeOrder[divergence.outcomeImpact.referenceOutcome] ?? 1;
  const compScore = outcomeOrder[divergence.outcomeImpact.comparedOutcome] ?? 1;
  const outcomeComparison =
    compScore < refScore
      ? "better"
      : compScore > refScore
        ? "worse"
        : "same";

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all hover:bg-muted/50"
        >
          <div className="mt-0.5 shrink-0">
            {getDivergenceIcon(divergence.divergenceType)}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-[9px] ${getDivergenceBadgeColor(divergence.divergenceType)}`}
              >
                {getDivergenceLabel(divergence.divergenceType)}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {divergence.stageLabel}
              </span>
            </div>
            <p className="text-xs">{divergence.description}</p>
          </div>
          <div className="shrink-0 pt-1">
            {open ? (
              <CaretUp size={12} className="text-muted-foreground" />
            ) : (
              <CaretDown size={12} className="text-muted-foreground" />
            )}
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mx-3 mt-1 mb-2 space-y-3 rounded-lg border border-dashed p-3">
          {/* Side-by-side comparison */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
            {/* Reference */}
            <div className="space-y-1.5 rounded-md border p-2">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                Reference Patient
              </p>
              <p className="text-xs font-medium">{ref.action.replace(/_/g, " ")}</p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-[8px]">
                  {ref.department.replace(/_/g, " ")}
                </Badge>
                <Badge variant="outline" className="text-[8px]">
                  Risk: {formatRiskPercentage(ref.mortalityRisk)}
                </Badge>
              </div>
              <OutcomeBadge status={divergence.outcomeImpact.referenceOutcome} size="sm" />
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center pt-6">
              <ArrowRight size={16} className="text-muted-foreground" />
            </div>

            {/* Compared */}
            <div className={`space-y-1.5 rounded-md border p-2 ${
              outcomeComparison === "better"
                ? "border-emerald-500/30 bg-emerald-500/5"
                : outcomeComparison === "worse"
                  ? "border-red-500/30 bg-red-500/5"
                  : ""
            }`}>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                Compared Patient
              </p>
              <p className="text-xs font-medium">{comp.action.replace(/_/g, " ")}</p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-[8px]">
                  {comp.department.replace(/_/g, " ")}
                </Badge>
                <Badge variant="outline" className="text-[8px]">
                  Risk: {formatRiskPercentage(comp.mortalityRisk)}
                </Badge>
              </div>
              <OutcomeBadge status={divergence.outcomeImpact.comparedOutcome} size="sm" />
            </div>
          </div>

          {/* Outcome impact summary */}
          <div className="rounded-md bg-muted/50 p-2 text-[10px]">
            <span className="font-medium">Outcome impact: </span>
            {outcomeComparison === "better" && (
              <span className="text-emerald-600 dark:text-emerald-400">
                The compared patient had a better outcome ({getOutcomeLabel(divergence.outcomeImpact.comparedOutcome)})
                with this different approach.
              </span>
            )}
            {outcomeComparison === "worse" && (
              <span className="text-red-600 dark:text-red-400">
                The compared patient had a worse outcome ({getOutcomeLabel(divergence.outcomeImpact.comparedOutcome)})
                with this different approach.
              </span>
            )}
            {outcomeComparison === "same" && (
              <span className="text-muted-foreground">
                Both patients had the same outcome ({getOutcomeLabel(divergence.outcomeImpact.referenceOutcome)})
                despite the different approach.
              </span>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Divergence List ───

interface DivergenceListProps {
  divergences: DecisionDivergence[];
}

export function DivergenceList({ divergences }: DivergenceListProps) {
  if (divergences.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic py-4 text-center">
        No significant divergence points found between the selected cases.
      </p>
    );
  }

  // Count by type
  const counts = {
    action: divergences.filter((d) => d.divergenceType === "different_action").length,
    timing: divergences.filter((d) => d.divergenceType === "different_timing").length,
    department: divergences.filter((d) => d.divergenceType === "different_department").length,
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-[10px]">
        {counts.action > 0 && (
          <Badge variant="outline" className="text-[9px] border-orange-500/30 text-orange-600">
            {counts.action} action divergence{counts.action > 1 ? "s" : ""}
          </Badge>
        )}
        {counts.timing > 0 && (
          <Badge variant="outline" className="text-[9px] border-blue-500/30 text-blue-600">
            {counts.timing} timing divergence{counts.timing > 1 ? "s" : ""}
          </Badge>
        )}
        {counts.department > 0 && (
          <Badge variant="outline" className="text-[9px] border-purple-500/30 text-purple-600">
            {counts.department} department divergence{counts.department > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        {divergences.map((d, i) => (
          <DivergenceCard key={`${d.stageKey}-${d.comparedNode.patientId}-${i}`} divergence={d} />
        ))}
      </div>
    </div>
  );
}

