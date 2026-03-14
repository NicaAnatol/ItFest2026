"use client";

import type { PatientNode } from "@/lib/types/patient";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { VitalsDisplay } from "./vitals-display";
import { DiagnosisCard } from "./diagnosis-card";
import { DecisionDetail } from "@/components/decision/decision-detail";
import { AlternativesPanel } from "@/components/decision/alternatives-panel";
import { RiskAssessmentCard } from "@/components/decision/risk-assessment-card";
import { FlagList } from "@/components/alerts/flag-list";
import { SimilarCasesPanel } from "@/components/historical/similar-cases-panel";
import { PatternMatchCard } from "@/components/historical/pattern-match-card";
import { CostBreakdownChart } from "@/components/execution/cost-breakdown";
import { ExecutionTimeline } from "@/components/execution/execution-timeline";
import { ResourcesPanel } from "@/components/execution/resources-panel";
import { AiExplainButton } from "@/components/ai/ai-explain-button";
import {
  formatActionName,
  formatTimestamp,
  getDepartmentLabel,
  getActionCategoryColor,
} from "@/lib/utils/format";
import {
  CheckCircle,
  XCircle,
} from "@phosphor-icons/react";

interface NodeDetailSheetProps {
  node: PatientNode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NodeDetailSheet({ node, open, onOpenChange }: NodeDetailSheetProps) {
  if (!node) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[540px] p-0">
        <SheetHeader className="p-4 pb-0">
          <div className="flex items-center gap-2">
            <div className={`rounded-md px-2 py-0.5 text-[10px] font-bold text-white ${getActionCategoryColor(node.decision.action_category)}`}>
              #{node.sequence}
            </div>
            <SheetTitle className="text-sm">
              {formatActionName(node.decision.action)}
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs">
            {getDepartmentLabel(node.logistics.location.department.name)} ·{" "}
            {formatTimestamp(node.timestamp.exact)} ·{" "}
            {node.duration.time_in_this_node}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="state" className="mt-2">
          <ScrollArea orientation="horizontal" className="w-full px-4">
            <TabsList className="w-max">
              <TabsTrigger value="state" className="text-xs">State</TabsTrigger>
              <TabsTrigger value="decision" className="text-xs">Decision</TabsTrigger>
              <TabsTrigger value="risk" className="text-xs">Risk</TabsTrigger>
              <TabsTrigger value="flags" className="text-xs">
                Flags
                {node.historical_analysis.flags.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[9px]">
                    {node.historical_analysis.flags.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
              <TabsTrigger value="cost" className="text-xs">Cost</TabsTrigger>
            </TabsList>
          </ScrollArea>

          <ScrollArea className="h-[calc(100vh-140px)]" orientation="both">
            <div className="p-4">
              {/* Patient State Tab */}
              <TabsContent value="state" className="mt-0 space-y-4">
                <div className="flex justify-end">
                  <AiExplainButton
                    compact
                    context={{
                      node_id: node.node_id,
                      sequence: node.sequence,
                      action: node.decision.action,
                      department: node.logistics.location.department.name,
                      vitals: node.patient_state.vitals,
                      diagnosis: node.patient_state.diagnosis,
                      medications: node.patient_state.medications_active,
                      complications: node.patient_state.complications_active,
                      transition: node.transition_outcome.net_impact,
                    }}
                    question="Explain the patient's clinical state at this node — vitals, diagnosis, active medications, and any complications. Are the vitals concerning? Is the patient stable or deteriorating?"
                    title={`AI — State at Node #${node.sequence}`}
                  />
                </div>
                <VitalsDisplay vitals={node.patient_state.vitals} />
                <Separator />
                <DiagnosisCard diagnosis={node.patient_state.diagnosis} />
                <Separator />

                {/* Active Medications */}
                {node.patient_state.medications_active.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Active Medications
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {node.patient_state.medications_active.map((m, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">
                          {m.medication} {m.dose}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Complications */}
                {node.patient_state.complications_active.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Active Complications ({node.patient_state.complications_active.length})
                    </p>
                    {node.patient_state.complications_active.map((c) => (
                      <div key={c.complication_id} className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-xs">
                        <p className="font-medium">{c.type.replace(/_/g, " ")}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-[9px]">{c.severity}</Badge>
                          <Badge variant="outline" className="text-[9px]">{c.current_status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Transition Outcome */}
                <Separator />
                <div className="space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Transition Outcome
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    {node.transition_outcome.success ? (
                      <CheckCircle size={14} weight="fill" className="text-emerald-500" />
                    ) : (
                      <XCircle size={14} weight="fill" className="text-red-500" />
                    )}
                    <span>{node.transition_outcome.net_impact.patient_state_change}</span>
                    <span>·</span>
                    <Badge variant={node.transition_outcome.net_impact.decision_quality === "APPROPRIATE" ? "secondary" : "destructive"} className="text-[9px]">
                      {node.transition_outcome.net_impact.decision_quality}
                    </Badge>
                  </div>
                </div>
              </TabsContent>

              {/* Decision Tab */}
              <TabsContent value="decision" className="mt-0 space-y-4">
                <div className="flex justify-end">
                  <AiExplainButton
                    compact
                    context={{
                      node_id: node.node_id,
                      sequence: node.sequence,
                      decision: node.decision,
                      risk: node.risk_assessment.mortality_risk,
                      flags_count: node.historical_analysis.flags.length,
                    }}
                    question="Explain this clinical decision — what was decided, why, what alternatives were considered, and what orders were given. Was this the right call given the evidence?"
                    title={`AI — Decision at Node #${node.sequence}`}
                  />
                </div>
                <DecisionDetail decision={node.decision} />
                <Separator />
                <AlternativesPanel alternatives={node.decision.alternatives_considered} />
              </TabsContent>

              {/* Risk Tab */}
              <TabsContent value="risk" className="mt-0 space-y-4">
                <div className="flex justify-end">
                  <AiExplainButton
                    compact
                    context={{
                      node_id: node.node_id,
                      sequence: node.sequence,
                      action: node.decision.action,
                      risk_assessment: node.risk_assessment,
                    }}
                    question="Explain the risk assessment for this decision — mortality risk, complication risks, interaction risks, and what factors are driving the risk up. What should the clinician watch for?"
                    title={`AI — Risk at Node #${node.sequence}`}
                  />
                </div>
                <RiskAssessmentCard risk={node.risk_assessment} />
              </TabsContent>

              {/* Flags Tab */}
              <TabsContent value="flags" className="mt-0 space-y-4">
                <div className="flex justify-end">
                  <AiExplainButton
                    compact
                    context={{
                      node_id: node.node_id,
                      sequence: node.sequence,
                      action: node.decision.action,
                      flags: node.historical_analysis.flags,
                    }}
                    question="Explain the AI flags raised for this decision — what risks were detected, what historical evidence supports them, and what should the clinical team do about each flag?"
                    title={`AI — Flags at Node #${node.sequence}`}
                  />
                </div>
                <FlagList flags={node.historical_analysis.flags} />
              </TabsContent>

              {/* Historical Tab */}
              <TabsContent value="history" className="mt-0 space-y-4">
                <div className="flex justify-end">
                  <AiExplainButton
                    compact
                    context={{
                      node_id: node.node_id,
                      sequence: node.sequence,
                      action: node.decision.action,
                      similar_cases: node.historical_analysis.similar_cases,
                      pattern_matching: node.historical_analysis.pattern_matching,
                    }}
                    question="Explain the historical analysis — how many similar cases were found, what were their outcomes, and do any matched patterns (including deadly patterns) raise concern? What does the historical evidence suggest about this decision?"
                    title={`AI — History at Node #${node.sequence}`}
                  />
                </div>
                <SimilarCasesPanel cases={node.historical_analysis.similar_cases} />
                <Separator />
                <PatternMatchCard
                  patterns={node.historical_analysis.pattern_matching.matched_standard_patterns}
                  deadlyPatterns={node.historical_analysis.pattern_matching.deadly_pattern_matches}
                />
              </TabsContent>

              {/* Cost Tab */}
              <TabsContent value="cost" className="mt-0 space-y-4">
                <div className="flex justify-end">
                  <AiExplainButton
                    compact
                    context={{
                      node_id: node.node_id,
                      sequence: node.sequence,
                      action: node.decision.action,
                      execution: {
                        status: node.execution.status,
                        duration: node.execution.duration,
                        delays: node.execution.delays,
                        blockers: node.execution.blockers,
                      },
                      total_cost: node.execution.total_cost,
                      resources: node.execution.resources_consumed,
                    }}
                    question="Explain the execution and cost of this step — what happened during execution, were there any delays or blockers, what resources were consumed, and was the cost reasonable for this type of intervention?"
                    title={`AI — Execution & Cost at Node #${node.sequence}`}
                  />
                </div>
                <ExecutionTimeline execution={node.execution} />
                <Separator />
                <CostBreakdownChart cost={node.execution.total_cost} />
                <Separator />
                <ResourcesPanel resources={node.execution.resources_consumed} />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

