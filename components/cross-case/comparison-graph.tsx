"use client";

import { useMemo, useState } from "react";
import type { AlignedNodePair, DecisionDivergence } from "@/lib/types/cross-case";
import type { OutcomeStatus } from "@/lib/types/patient";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatRiskPercentage,
  getOutcomeDotColor,
} from "@/lib/utils/format";
import {
  CheckCircle,
  XCircle,
  Flag,
  Diamond,
  Sparkle,
} from "@phosphor-icons/react";

// ─── Types ───

interface ComparisonGraphProps {
  alignedPairs: AlignedNodePair[];
  divergences: DecisionDivergence[];
  comparedPatientIds: string[];
  /** Index of the currently active walkthrough step (-1 = walkthrough inactive) */
  activeStepIndex?: number;
  /** Called when user clicks a stage column */
  onStageSelect?: (stageIndex: number) => void;
}

type GroupedPatient = {
  patientId: string;
  patientName: string;
  outcome: OutcomeStatus;
};

type StageConsensus = {
  stageKey: string;
  stageLabel: string;
  topAction: string;
  topActionCount: number;
  totalCount: number;
  agreementPct: number;
  hasDivergence: boolean;
};

// ─── Color maps ───

const ACTION_CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  admission:    { bg: "bg-blue-500/20",    text: "text-blue-300",    border: "border-blue-500/40" },
  triage:       { bg: "bg-red-500/20",     text: "text-red-300",     border: "border-red-500/40" },
  diagnostic:   { bg: "bg-cyan-500/20",    text: "text-cyan-300",    border: "border-cyan-500/40" },
  treatment:    { bg: "bg-emerald-500/20", text: "text-emerald-300", border: "border-emerald-500/40" },
  monitoring:   { bg: "bg-violet-500/20",  text: "text-violet-300",  border: "border-violet-500/40" },
  consultation: { bg: "bg-indigo-500/20",  text: "text-indigo-300",  border: "border-indigo-500/40" },
  transfer:     { bg: "bg-orange-500/20",  text: "text-orange-300",  border: "border-orange-500/40" },
  procedure:    { bg: "bg-amber-500/20",   text: "text-amber-300",   border: "border-amber-500/40" },
  discharge:    { bg: "bg-teal-500/20",    text: "text-teal-300",    border: "border-teal-500/40" },
};

const CATEGORY_DOT: Record<string, string> = {
  admission:    "bg-blue-500",
  triage:       "bg-red-500",
  diagnostic:   "bg-cyan-500",
  treatment:    "bg-emerald-500",
  monitoring:   "bg-violet-500",
  consultation: "bg-indigo-500",
  transfer:     "bg-orange-500",
  procedure:    "bg-amber-500",
  discharge:    "bg-teal-500",
};

function getCategoryStyle(category: string) {
  return ACTION_CATEGORY_COLORS[category] ?? {
    bg: "bg-muted/50",
    text: "text-muted-foreground",
    border: "border-border",
  };
}

function getCategoryDot(category: string) {
  return CATEGORY_DOT[category] ?? "bg-muted";
}

function abbreviateAction(action: string): string {
  const clean = action.replace(/_/g, " ");
  if (clean.length <= 22) return clean;
  return clean.slice(0, 20) + "…";
}

const OUTCOME_ORDER: Record<string, number> = {
  HEALED: 0,
  HEALED_WITH_COMPLICATIONS: 1,
  DECEASED: 2,
};

const OUTCOME_GROUP_LABELS: Record<string, string> = {
  HEALED: "Healed",
  HEALED_WITH_COMPLICATIONS: "Complications",
  DECEASED: "Deceased",
};

const OUTCOME_GROUP_COLORS: Record<string, string> = {
  HEALED: "text-emerald-500",
  HEALED_WITH_COMPLICATIONS: "text-amber-500",
  DECEASED: "text-red-500",
};

const OUTCOME_GROUP_LINE: Record<string, string> = {
  HEALED: "border-emerald-500/20",
  HEALED_WITH_COMPLICATIONS: "border-amber-500/20",
  DECEASED: "border-red-500/20",
};

/** Determine visual state for a column based on walkthrough position */
function getColumnState(
  colIndex: number,
  activeStepIndex: number,
): "past" | "current" | "future" | "inactive" {
  if (activeStepIndex < 0) return "inactive"; // walkthrough not active
  if (colIndex < activeStepIndex) return "past";
  if (colIndex === activeStepIndex) return "current";
  return "future";
}

// ─── Main Component ───

export function ComparisonGraph({
  alignedPairs,
  divergences,
  comparedPatientIds: _comparedPatientIds,
  activeStepIndex = -1,
  onStageSelect,
}: ComparisonGraphProps) {
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);
  const walkthroughActive = activeStepIndex >= 0;

  const divergenceSet = useMemo(() => {
    const set = new Set<string>();
    for (const d of divergences) {
      set.add(`${d.stageKey}::${d.comparedNode.patientId}`);
    }
    return set;
  }, [divergences]);

  const { refPatient, groupedPatients } = useMemo(() => {
    const ref = alignedPairs[0]?.referenceNode;
    const refP: GroupedPatient | null = ref
      ? { patientId: ref.patientId, patientName: ref.patientName, outcome: ref.outcome }
      : null;

    const pMap = new Map<string, GroupedPatient>();
    for (const pair of alignedPairs) {
      for (const cn of pair.comparedNodes) {
        if (!pMap.has(cn.patientId)) {
          pMap.set(cn.patientId, {
            patientId: cn.patientId,
            patientName: cn.patientName,
            outcome: cn.outcome,
          });
        }
      }
    }

    const patients = Array.from(pMap.values()).sort(
      (a, b) => (OUTCOME_ORDER[a.outcome] ?? 1) - (OUTCOME_ORDER[b.outcome] ?? 1),
    );

    const groups: Record<string, GroupedPatient[]> = {};
    for (const p of patients) {
      const key = p.outcome;
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    }

    return { refPatient: refP, groupedPatients: groups };
  }, [alignedPairs]);

  const stageConsensuses = useMemo<StageConsensus[]>(() => {
    return alignedPairs.map((pair) => {
      const actionCounts = new Map<string, number>();
      const refAction = pair.referenceNode.action;
      actionCounts.set(refAction, (actionCounts.get(refAction) ?? 0) + 1);
      for (const cn of pair.comparedNodes) {
        actionCounts.set(cn.action, (actionCounts.get(cn.action) ?? 0) + 1);
      }

      let topAction = refAction;
      let topCount = 0;
      for (const [action, count] of actionCounts) {
        if (count > topCount) {
          topAction = action;
          topCount = count;
        }
      }
      const total = pair.comparedNodes.length + 1;
      const hasDivergence = divergences.some((d) => d.stageKey === pair.stageKey);

      return {
        stageKey: pair.stageKey,
        stageLabel: pair.stageLabel,
        topAction,
        topActionCount: topCount,
        totalCount: total,
        agreementPct: (topCount / total) * 100,
        hasDivergence,
      };
    });
  }, [alignedPairs, divergences]);

  if (alignedPairs.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-xs text-muted-foreground italic">
        Select similar cases above to view the comparison graph.
      </div>
    );
  }

  const visibleStages = alignedPairs.slice(0, 16);
  const stageWidth = 128;

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px]">
        <span className="text-muted-foreground font-medium">Action type:</span>
        {Object.entries(CATEGORY_DOT).map(([cat, dot]) => (
          <div key={cat} className="flex items-center gap-1">
            <div className={`h-2 w-2 rounded-sm ${dot}`} />
            <span className="text-muted-foreground capitalize">{cat}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px]">
        <div className="flex items-center gap-1.5">
          <Diamond size={10} weight="fill" className="text-orange-400" />
          <span className="text-muted-foreground">Divergence from reference</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-4 rounded-sm bg-primary/30" />
          <span className="text-muted-foreground">Reference patient</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-6 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">High agreement</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-6 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">Low agreement</span>
        </div>
      </div>

      <ScrollArea className="w-full">
        <div
          className="min-w-fit pb-4"
          style={{ minWidth: visibleStages.length * stageWidth + 160 }}
        >
          {/* ── Stage Headers ── */}
          <div className="flex items-end gap-0">
            <div className="w-40 shrink-0 pr-2" />
            {visibleStages.map((pair, i) => {
              const consensus = stageConsensuses[i];
              const isHovered = hoveredStage === pair.stageKey;
              const colState = getColumnState(i, activeStepIndex);
              const isCurrent = colState === "current";
              const isFuture = colState === "future";

              return (
                <div
                  key={pair.stageKey}
                  className={`flex flex-col items-center gap-1 transition-all cursor-pointer rounded-t-md
                    ${isCurrent ? "bg-primary/10 ring-1 ring-primary/40" : ""}
                    ${isFuture ? "opacity-30" : ""}
                    ${!walkthroughActive && isHovered ? "bg-muted/30" : ""}
                  `}
                  style={{ width: stageWidth }}
                  onMouseEnter={() => setHoveredStage(pair.stageKey)}
                  onMouseLeave={() => setHoveredStage(null)}
                  onClick={() => onStageSelect?.(i)}
                >
                  <span className={`text-[9px] font-medium text-center leading-tight px-1
                    ${isCurrent ? "text-primary" : "text-muted-foreground"}
                  `}>
                    {pair.stageLabel}
                  </span>
                  {consensus && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-full px-2">
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                consensus.agreementPct >= 75
                                  ? "bg-emerald-500"
                                  : consensus.agreementPct >= 50
                                    ? "bg-amber-500"
                                    : "bg-red-400"
                              }`}
                              style={{ width: `${consensus.agreementPct}%` }}
                            />
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs space-y-1 max-w-xs">
                        <p className="font-semibold">
                          {Math.round(consensus.agreementPct)}% agreement
                        </p>
                        <p className="text-muted-foreground">
                          Most common:{" "}
                          <span className="font-medium">
                            {consensus.topAction.replace(/_/g, " ")}
                          </span>
                          {" "}({consensus.topActionCount}/{consensus.totalCount} patients)
                        </p>
                        {consensus.hasDivergence && (
                          <p className="text-orange-400 font-medium flex items-center gap-1">
                            <Diamond size={10} weight="fill" />
                            Divergence point
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {consensus?.hasDivergence && (
                    <Diamond size={8} weight="fill" className="text-orange-400" />
                  )}
                  {isCurrent && (
                    <Sparkle size={10} weight="fill" className="text-primary" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-2 border-t border-border/50" />

          {/* ── Reference Patient Row ── */}
          {refPatient && (
            <div className="mt-1">
              <div className="flex items-center gap-0">
                <div className="w-40 shrink-0 pr-2 flex items-center gap-2">
                  <div
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${getOutcomeDotColor(refPatient.outcome)}`}
                  />
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold truncate block">
                      {refPatient.patientName}
                    </span>
                    <span className="text-[9px] text-primary font-medium">reference</span>
                  </div>
                </div>
                {visibleStages.map((pair, i) => {
                  const node = pair.referenceNode;
                  const colState = getColumnState(i, activeStepIndex);
                  const isCurrent = colState === "current";
                  const isFuture = colState === "future";

                  return (
                    <Tooltip key={pair.stageKey}>
                      <TooltipTrigger asChild>
                        <div
                          className={`mx-0.5 flex items-center gap-1.5 rounded-md border px-2 py-1.5 cursor-default transition-all
                            ${isCurrent
                              ? "bg-primary/20 border-primary/50 ring-1 ring-primary/30"
                              : "bg-primary/8 border-primary/25 hover:bg-primary/15 hover:border-primary/40"
                            }
                            ${isFuture ? "opacity-25 grayscale" : ""}
                          `}
                          style={{ width: stageWidth - 4 }}
                          onMouseEnter={() => setHoveredStage(pair.stageKey)}
                          onMouseLeave={() => setHoveredStage(null)}
                        >
                          <div
                            className={`h-2 w-2 rounded-sm shrink-0 ${getCategoryDot(node.actionCategory)}`}
                          />
                          <span className="text-[10px] font-medium leading-tight truncate">
                            {abbreviateAction(node.action)}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <CellTooltip node={node} isDivergent={false} />
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-1.5 border-t border-border/30" />

          {/* ── Grouped Patient Rows ── */}
          {Object.entries(groupedPatients)
            .sort(([a], [b]) => (OUTCOME_ORDER[a] ?? 1) - (OUTCOME_ORDER[b] ?? 1))
            .map(([outcomeKey, patients]) => (
              <div key={outcomeKey} className="mt-2">
                <div className="flex items-center gap-2 mb-1 px-1">
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${getOutcomeDotColor(outcomeKey as OutcomeStatus)}`}
                  />
                  <span
                    className={`text-[9px] font-semibold uppercase tracking-wider ${OUTCOME_GROUP_COLORS[outcomeKey]}`}
                  >
                    {OUTCOME_GROUP_LABELS[outcomeKey] ?? outcomeKey} ({patients.length})
                  </span>
                  <div
                    className={`flex-1 border-t ${OUTCOME_GROUP_LINE[outcomeKey] ?? "border-border/20"}`}
                  />
                </div>

                {patients.map((patient) => (
                  <div key={patient.patientId} className="flex items-center gap-0 py-0.5">
                    <div className="w-40 shrink-0 pr-2 flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full shrink-0 ${getOutcomeDotColor(patient.outcome)}`}
                      />
                      <span className="text-[10px] font-medium truncate">
                        {patient.patientName}
                      </span>
                    </div>
                    {visibleStages.map((pair, i) => {
                      const compNode = pair.comparedNodes.find(
                        (cn) => cn.patientId === patient.patientId,
                      );
                      const isDivergent = divergenceSet.has(
                        `${pair.stageKey}::${patient.patientId}`,
                      );
                      const colState = getColumnState(i, activeStepIndex);
                      const isCurrent = colState === "current";
                      const isFuture = colState === "future";

                      if (!compNode) {
                        return (
                          <div
                            key={pair.stageKey}
                            className={`mx-0.5 flex items-center justify-center rounded-md border border-dashed border-muted/40 text-[9px] text-muted-foreground/50 italic
                              ${isFuture ? "opacity-25" : ""}
                            `}
                            style={{ width: stageWidth - 4, minHeight: 28 }}
                          >
                            N/A
                          </div>
                        );
                      }

                      const style = getCategoryStyle(compNode.actionCategory);

                      return (
                        <Tooltip key={pair.stageKey}>
                          <TooltipTrigger asChild>
                            <div
                              className={`
                                mx-0.5 flex items-center gap-1.5 rounded-md border px-2 py-1.5
                                cursor-default transition-all relative
                                ${style.bg} ${style.border}
                                ${isDivergent ? "ring-1 ring-orange-400/60" : ""}
                                ${isCurrent ? "ring-2 ring-primary/50 brightness-110" : ""}
                                ${isFuture ? "opacity-25 grayscale" : ""}
                                ${!isFuture ? "hover:brightness-125" : ""}
                              `}
                              style={{ width: stageWidth - 4 }}
                              onMouseEnter={() => setHoveredStage(pair.stageKey)}
                              onMouseLeave={() => setHoveredStage(null)}
                            >
                              {isDivergent && !isFuture && (
                                <Diamond
                                  size={8}
                                  weight="fill"
                                  className="absolute -top-1 -right-1 text-orange-400 z-10"
                                />
                              )}
                              <div
                                className={`h-2 w-2 rounded-sm shrink-0 ${getCategoryDot(compNode.actionCategory)}`}
                              />
                              <span
                                className={`text-[10px] leading-tight truncate ${style.text}`}
                              >
                                {abbreviateAction(compNode.action)}
                              </span>
                              <div className="ml-auto flex items-center gap-0.5 shrink-0">
                                {compNode.criticalFlags > 0 && !isFuture && (
                                  <Flag size={8} weight="fill" className="text-red-400" />
                                )}
                                {!compNode.transitionSuccess && !isFuture && (
                                  <XCircle size={8} weight="fill" className="text-red-400" />
                                )}
                              </div>
                            </div>
                          </TooltipTrigger>
                          {!isFuture && <CellTooltip node={compNode} isDivergent={isDivergent} />}
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}

          {alignedPairs.length > 16 && (
            <p className="mt-3 text-center text-[10px] text-muted-foreground">
              Showing first 16 of {alignedPairs.length} stages.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Cell Tooltip ───

interface CellTooltipProps {
  node: {
    action: string;
    actionCategory: string;
    department: string;
    mortalityRisk: number;
    complicationRisk?: number;
    flagsCount: number;
    criticalFlags: number;
    decisionQuality: string;
    transitionSuccess: boolean;
    sequence: number;
  };
  isDivergent: boolean;
}

function CellTooltip({ node, isDivergent }: CellTooltipProps) {
  return (
    <TooltipContent side="top" className="max-w-xs space-y-1.5 text-xs p-3">
      <p className="font-semibold text-sm">{node.action.replace(/_/g, " ")}</p>
      <p className="text-muted-foreground capitalize">
        {node.actionCategory} · {node.department.replace(/_/g, " ")}
      </p>
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <Badge variant="outline" className="text-[9px] font-mono">
          Risk {formatRiskPercentage(node.mortalityRisk)}
        </Badge>
        <Badge
          variant="outline"
          className={`text-[9px] ${
            node.decisionQuality === "APPROPRIATE"
              ? "border-emerald-500/30 text-emerald-500"
              : "border-amber-500/30 text-amber-500"
          }`}
        >
          {node.decisionQuality}
        </Badge>
        {node.transitionSuccess ? (
          <Badge
            variant="outline"
            className="text-[9px] border-emerald-500/30 text-emerald-500 gap-1"
          >
            <CheckCircle size={9} weight="fill" /> Success
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-[9px] border-red-500/30 text-red-500 gap-1"
          >
            <XCircle size={9} weight="fill" /> Failed
          </Badge>
        )}
      </div>
      {node.flagsCount > 0 && (
        <p className="text-[10px] flex items-center gap-1">
          <Flag
            size={10}
            weight="fill"
            className={node.criticalFlags > 0 ? "text-red-400" : "text-amber-400"}
          />
          {node.flagsCount} flag{node.flagsCount !== 1 ? "s" : ""}
          {node.criticalFlags > 0 && (
            <span className="text-red-400">({node.criticalFlags} critical)</span>
          )}
        </p>
      )}
      {isDivergent && (
        <p className="text-orange-400 font-semibold flex items-center gap-1 pt-0.5">
          <Diamond size={10} weight="fill" />
          Diverges from reference patient
        </p>
      )}
    </TooltipContent>
  );
}
