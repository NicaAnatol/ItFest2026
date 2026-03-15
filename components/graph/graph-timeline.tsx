"use client";

import type { PatientNode } from "@/lib/types/patient";
import {
  getDepartmentColor,
  getDepartmentLabel,
  formatActionName,
  formatTime,
  getActionCategoryColor,
} from "@/lib/utils/format";
import { countFlagsBySeverity } from "@/lib/decision/decision-utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AiExplainButton } from "@/components/ai/ai-explain-button";
import { buildNodeExplainContext, buildNodeExplainQuestion } from "@/lib/ai/explain-context";
import { Flag, CheckCircle, XCircle } from "@phosphor-icons/react";

interface GraphTimelineProps {
  nodes: PatientNode[];
  selectedNodeId?: string | null;
  onNodeClick?: (node: PatientNode) => void;
}

export function GraphTimeline({ nodes, selectedNodeId, onNodeClick }: GraphTimelineProps) {
  const sorted = [...nodes].sort((a, b) => a.sequence - b.sequence);

  return (
    <ScrollArea className="max-h-[600px]">
      <div className="relative space-y-0">
        {/* Vertical line */}
        <div className="absolute left-[72px] top-0 bottom-0 w-px bg-border" />

      {sorted.map((node, i) => {
        const flagCounts = countFlagsBySeverity(node.historical_analysis.flags);
        const totalFlags = flagCounts.info + flagCounts.warning + flagCounts.critical;
        const isSelected = selectedNodeId === node.node_id;
        const prevDept = i > 0 ? sorted[i - 1].logistics.location.department.id : "";
        const currDept = node.logistics.location.department.id;
        const isDeptChange = prevDept !== currDept;

        return (
          <div key={node.node_id}>
            {/* Department change marker */}
            {isDeptChange && (
              <div className="relative ml-[60px] flex items-center gap-2 py-2">
                <div className={`h-3 w-3 rounded-full border-2 border-background ${getDepartmentColor(currDept)}`} />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {getDepartmentLabel(node.logistics.location.department.name)}
                </span>
              </div>
            )}

            {/* Timeline node */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => onNodeClick?.(node)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onNodeClick?.(node);
                }
              }}
              className={`relative flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left cursor-pointer transition-colors hover:bg-muted/50 ${
                isSelected ? "bg-primary/5 ring-1 ring-primary/30" : ""
              }`}
            >
              {/* Timestamp */}
              <span className="w-[56px] shrink-0 text-right font-mono text-[10px] text-muted-foreground">
                {formatTime(node.timestamp.exact)}
              </span>

              {/* Dot */}
              <div className="relative mt-1.5">
                <div
                  className={`h-2.5 w-2.5 rounded-full border-2 border-background ${getActionCategoryColor(node.decision.action_category)}`}
                />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium">
                    {formatActionName(node.decision.action)}
                  </p>
                  {totalFlags > 0 && (
                    <div className="flex items-center gap-0.5">
                      <Flag
                        size={10}
                        weight="fill"
                        className={flagCounts.critical > 0 ? "text-red-500" : "text-amber-500"}
                      />
                      <span className="text-[9px] text-muted-foreground">{totalFlags}</span>
                    </div>
                  )}
                  {node.transition_outcome.success ? (
                    <CheckCircle size={10} weight="fill" className="text-emerald-500" />
                  ) : (
                    <XCircle size={10} weight="fill" className="text-red-500" />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {node.decision.reasoning.primary_reason.slice(0, 80)}
                  {node.decision.reasoning.primary_reason.length > 80 ? "..." : ""}
                </p>
              </div>

              {/* Sequence badge + AI Explain */}
              <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <AiExplainButton
                  compact
                  context={buildNodeExplainContext(node)}
                  question={buildNodeExplainQuestion(node)}
                  title={`AI — Node #${node.sequence}: ${formatActionName(node.decision.action)}`}
                />
                <Badge variant="outline" className="text-[9px] font-mono">
                  #{node.sequence}
                </Badge>
              </div>
            </div>
          </div>
        );
      })}
      </div>
    </ScrollArea>
  );
}

