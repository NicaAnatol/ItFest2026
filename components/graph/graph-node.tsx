"use client";

import type { PatientNode } from "@/lib/types/patient";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  getActionCategoryColor,
  getDepartmentColor,
  getDepartmentLabel,
  formatActionName,
  getRiskLevel,
  getRiskBgColor,
  formatRiskPercentage,
} from "@/lib/utils/format";
import { countFlagsBySeverity } from "@/lib/decision/decision-utils";
import { AiExplainButton } from "@/components/ai/ai-explain-button";
import { buildNodeExplainContext, buildNodeExplainQuestion } from "@/lib/ai/explain-context";
import {
  Ambulance,
  FirstAid,
  Stethoscope,
  Pill,
  Heartbeat,
  UserCircle,
  ArrowsLeftRight,
  Syringe,
  SignOut,
  CheckCircle,
  XCircle,
  Flag,
} from "@phosphor-icons/react";

const categoryIcons: Record<string, React.ElementType> = {
  admission: Ambulance,
  triage: FirstAid,
  diagnostic: Stethoscope,
  treatment: Pill,
  monitoring: Heartbeat,
  consultation: UserCircle,
  transfer: ArrowsLeftRight,
  procedure: Syringe,
  discharge: SignOut,
};

interface GraphNodeProps {
  node: PatientNode;
  isSelected?: boolean;
  onClick?: (node: PatientNode) => void;
}

export function GraphNode({ node, isSelected, onClick }: GraphNodeProps) {
  const Icon = categoryIcons[node.decision.action_category] ?? Stethoscope;
  const flagCounts = countFlagsBySeverity(node.historical_analysis.flags);
  const totalFlags = flagCounts.info + flagCounts.warning + flagCounts.critical;
  const hasFlags = totalFlags > 0;
  const hasCritical = flagCounts.critical > 0;
  const riskLevel = getRiskLevel(node.risk_assessment.mortality_risk.total);
  const deptColor = getDepartmentColor(node.logistics.location.department.id);

  return (
    <div className="relative">
      {/* AI Explain — outside the tooltip/clickable area to avoid nested <button> */}
      <div className="absolute -top-1 -right-1 z-10">
        <AiExplainButton
          compact
          context={buildNodeExplainContext(node)}
          question={buildNodeExplainQuestion(node)}
          title={`AI — Node #${node.sequence}: ${formatActionName(node.decision.action)}`}
        />
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            onClick={() => onClick?.(node)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.(node);
              }
            }}
            className={`
              group relative flex flex-col items-center gap-1 rounded-lg border p-2 cursor-pointer
              transition-all hover:shadow-md animate-node-enter
              ${isSelected ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border hover:border-primary/40"}
              ${hasCritical ? "animate-flag-pulse" : ""}
            `}
            style={{ animationDelay: `${node.sequence * 50}ms` }}
          >
            {/* Department color stripe */}
            <div className={`absolute inset-x-0 top-0 h-1 rounded-t-lg ${deptColor}`} />

            {/* Sequence + Icon */}
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-muted-foreground">
                #{node.sequence}
              </span>
              <div className={`rounded-md p-1 ${getActionCategoryColor(node.decision.action_category)} text-white`}>
                <Icon size={14} weight="bold" />
              </div>
            </div>

            {/* Action label */}
            <p className="max-w-[80px] truncate text-[10px] font-medium">
              {formatActionName(node.decision.action_category)}
            </p>

            {/* Time */}
            <p className="text-[9px] font-mono text-muted-foreground">
              {String(node.timestamp.hour).padStart(2, "0")}:{String(node.timestamp.minute).padStart(2, "0")}
            </p>

            {/* Status indicators */}
            <div className="flex items-center gap-1">
              {node.transition_outcome.success ? (
                <CheckCircle size={10} weight="fill" className="text-emerald-500" />
              ) : (
                <XCircle size={10} weight="fill" className="text-red-500" />
              )}

              {hasFlags && (
                <div className="flex items-center gap-0.5">
                  <Flag size={10} weight="fill" className={hasCritical ? "text-red-500" : "text-amber-500"} />
                  <span className="text-[9px]">{totalFlags}</span>
                </div>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[250px]">
          <div className="space-y-1 text-xs">
            <p className="font-semibold">{formatActionName(node.decision.action)}</p>
            <p className="text-muted-foreground">
              {getDepartmentLabel(node.logistics.location.department.name)}
            </p>
            <p>
              Risk: <span className={getRiskBgColor(riskLevel) + " rounded px-1"}>
                {formatRiskPercentage(node.risk_assessment.mortality_risk.total)}
              </span>
            </p>
            {hasFlags && (
              <p>
                Flags: {flagCounts.critical > 0 && <span className="text-red-500">{flagCounts.critical} critical</span>}
                {flagCounts.warning > 0 && <span className="text-amber-500"> {flagCounts.warning} warning</span>}
                {flagCounts.info > 0 && <span className="text-blue-500"> {flagCounts.info} info</span>}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
