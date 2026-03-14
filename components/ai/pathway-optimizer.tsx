"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Path,
  CircleNotch,
  ArrowClockwise,
  X,
  Lightning,
} from "@phosphor-icons/react";
import type { PatientGraph } from "@/lib/types/patient";

interface PathwayOptimizerProps {
  patient: PatientGraph;
}

/** Build context for pathway analysis */
function buildPathwayContext(patient: PatientGraph) {
  const firstNode = patient.nodes[0];
  return {
    patient_id: patient.patient_id,
    patient_name: patient.patient_name,
    demographics: firstNode?.patient_state?.demographics,
    diagnosis: firstNode?.patient_state?.diagnosis?.primary,
    medical_history: firstNode?.patient_state?.medical_history,
    admission: patient.admission,
    discharge: patient.discharge,
    outcome: patient.final_outcome,
    flow_analytics: {
      decision_quality: patient.flow_analytics.decision_quality_analysis,
      cost_analysis: patient.flow_analytics.cost_analysis,
      department_utilization: patient.flow_analytics.department_utilization,
      complication_tracking: patient.flow_analytics.complication_tracking,
      outcome_quality: patient.flow_analytics.outcome_quality,
    },
    pathway: patient.nodes.map((n) => ({
      step: n.sequence,
      action: n.decision.action,
      category: n.decision.action_category,
      department: n.logistics.location.department.name,
      clinician: {
        role: n.decision.made_by.role,
        specialty: n.decision.made_by.specialty,
        confidence: n.decision.made_by.decision_confidence,
      },
      reasoning: n.decision.reasoning.primary_reason,
      guidelines: n.decision.reasoning.guidelines_followed,
      alternatives_considered: n.decision.alternatives_considered.map((a) => ({
        option: a.option,
        why_not_chosen: a.why_not_chosen,
      })),
      vitals: {
        bp: `${n.patient_state.vitals.blood_pressure.systolic}/${n.patient_state.vitals.blood_pressure.diastolic}`,
        hr: n.patient_state.vitals.heart_rate.value,
        spo2: n.patient_state.vitals.oxygen_saturation.value,
      },
      risk: {
        mortality: n.risk_assessment.mortality_risk.total,
        complication: n.risk_assessment.complication_risk.overall,
      },
      flags: n.historical_analysis.flags.map((f) => ({
        type: f.type,
        severity: f.severity,
        message: f.message,
      })),
      outcome: {
        success: n.transition_outcome.success,
        decision_quality: n.transition_outcome.net_impact.decision_quality,
        cost: n.transition_outcome.net_impact.cost,
        state_change: n.transition_outcome.net_impact.patient_state_change,
      },
      complications_active: n.patient_state.complications_active.length,
    })),
  };
}

export function PathwayOptimizer({ patient }: PathwayOptimizerProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const analyze = useCallback(async () => {
    setText("");
    setError(null);
    setLoading(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientContext: buildPathwayContext(patient) }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        setError(errBody.error ?? `HTTP ${res.status}`);
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("No response stream");
        setLoading(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setText(accumulated);
      }

      setLoading(false);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("Failed to get response");
      }
      setLoading(false);
    }
  }, [patient]);

  const handleOpen = () => {
    setOpen(true);
    if (!text && !loading) {
      analyze();
    }
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <Path size={16} weight="bold" />
        Optimize Pathway
      </Button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="border-b pb-3">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle className="flex items-center gap-2 text-base">
                  <Lightning size={20} weight="fill" className="text-primary" />
                  AI Pathway Optimizer
                </DrawerTitle>
                <DrawerDescription className="text-xs">
                  AI-generated optimal clinical pathway for {patient.patient_name}
                </DrawerDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {patient.nodes.length} steps analyzed
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    patient.final_outcome.status === "HEALED"
                      ? "bg-emerald-500/15 text-emerald-600"
                      : patient.final_outcome.status === "DECEASED"
                        ? "bg-red-500/15 text-red-600"
                        : "bg-amber-500/15 text-amber-600"
                  }`}
                >
                  {patient.final_outcome.status.replace(/_/g, " ")}
                </Badge>
              </div>
            </div>
          </DrawerHeader>

          <ScrollArea className="flex-1 p-6" style={{ height: "calc(85vh - 160px)" }}>
            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {text ? (
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(text) }}
              />
            ) : loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <CircleNotch size={32} className="animate-spin text-primary" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Analyzing pathway across {patient.nodes.length} clinical decision points...
                </p>
              </div>
            ) : null}

            {loading && text && (
              <span className="inline-block w-2 h-4 ml-0.5 bg-primary/60 animate-pulse rounded-full" />
            )}
          </ScrollArea>

          <DrawerFooter className="border-t pt-3 flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={analyze}
              disabled={loading}
            >
              <ArrowClockwise size={14} />
              Re-analyze
            </Button>
            <DrawerClose asChild>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <X size={14} />
                Close
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}

function markdownToHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code class="rounded bg-muted px-1 py-0.5 text-xs">$1</code>')
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold mt-4 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold mt-4 mb-2">$1</h1>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-sm">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-sm">$2</li>')
    .replace(/\n/g, "<br />");
}


