"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { OutcomeBadge } from "@/components/patient/outcome-badge";
import { PatientGraphView } from "@/components/graph/patient-graph";
import {
  Users,
  Warning,
  WarningCircle,
  Info,
  GitFork,
  ChartBar,
  ArrowRight,
  Sparkle,
  CircleNotch,
  X,
} from "@phosphor-icons/react";
import type { PatientMatch } from "@/lib/types/cross-case";
import type { PatientGraph, PatientNode } from "@/lib/types/patient";
import type { SimilarityAlert } from "@/lib/add-patient/similarity-engine";

/** Lightweight snapshot of the current clinical state — passed by the wizard page */
export interface CurrentClinicalSnapshot {
  primary_name?: string;
  primary_icd10?: string;
  severity?: string;
  action?: string;
  action_category?: string;
  medications?: Array<{ name: string }>;
  complications?: string[];
  systolic?: number;
  diastolic?: number;
  heart_rate?: number;
  oxygen_saturation?: number;
}
import {
  formatDiagnosisName,
  formatCurrency,
} from "@/lib/utils/format";
import Link from "next/link";

interface SimilarityPanelProps {
  matches: PatientMatch[];
  alerts: SimilarityAlert[];
  allPatients: PatientGraph[];
  completedSteps: number;
  currentSnapshot?: CurrentClinicalSnapshot;
}

function getSeverityIcon(severity: string) {
  switch (severity) {
    case "CRITICAL":
      return <Warning size={16} className="text-red-500" />;
    case "WARNING":
      return <WarningCircle size={16} className="text-amber-500" />;
    default:
      return <Info size={16} className="text-blue-500" />;
  }
}

function getSeverityClasses(severity: string) {
  switch (severity) {
    case "CRITICAL":
      return "border-red-500/30 bg-red-500/5";
    case "WARNING":
      return "border-amber-500/30 bg-amber-500/5";
    default:
      return "border-blue-500/30 bg-blue-500/5";
  }
}

/** Find the most similar node in a patient graph to the current clinical state */
function findMostSimilarNode(
  patient: PatientGraph,
  snapshot?: CurrentClinicalSnapshot,
): PatientNode | null {
  if (!snapshot || !patient.nodes.length) return null;
  let best: PatientNode | null = null;
  let bestScore = -1;
  for (const pNode of patient.nodes) {
    let score = 0;
    // Diagnosis match
    if (snapshot.primary_icd10 && pNode.patient_state.diagnosis.primary.icd10 === snapshot.primary_icd10) score += 5;
    else if (snapshot.primary_name && pNode.patient_state.diagnosis.primary.name.toLowerCase().includes(snapshot.primary_name.toLowerCase())) score += 3;
    // Severity match
    if (snapshot.severity === pNode.patient_state.diagnosis.primary.severity) score += 2;
    // Action category match
    if (snapshot.action_category === pNode.decision.action_category) score += 2;
    // Medication overlap
    const pMeds = new Set(pNode.patient_state.medications_active.map((m) => m.medication.toLowerCase()));
    for (const med of snapshot.medications ?? []) {
      if (pMeds.has(med.name.toLowerCase())) score += 1;
    }
    // Complication overlap
    const pComps = new Set(pNode.patient_state.complications_active.map((c) => c.type.toLowerCase()));
    for (const comp of snapshot.complications ?? []) {
      if (pComps.has(comp.toLowerCase())) score += 2;
    }
    if (score > bestScore) { bestScore = score; best = pNode; }
  }
  return best;
}

// ── AI Parallel Explain Drawer ──

function useParallelExplain() {
  const [open, setOpen] = useState(false);
  const [leftText, setLeftText] = useState("");
  const [rightText, setRightText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetch2 = useCallback(async (
    similarPatientNode: PatientNode,
    similarPatientName: string,
    currentNodeDesc: string,
  ) => {
    setLeftText(""); setRightText(""); setError(null); setLoading(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Fire both requests in parallel
      const [resLeft, resRight] = await Promise.all([
        fetch("/api/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            context: {
              node_id: similarPatientNode.node_id,
              sequence: similarPatientNode.sequence,
              action: similarPatientNode.decision.action,
              category: similarPatientNode.decision.action_category,
              reasoning: similarPatientNode.decision.reasoning.primary_reason,
              diagnosis: similarPatientNode.patient_state.diagnosis.primary.name,
              severity: similarPatientNode.patient_state.diagnosis.primary.severity,
              vitals_bp: `${similarPatientNode.patient_state.vitals.blood_pressure.systolic}/${similarPatientNode.patient_state.vitals.blood_pressure.diastolic}`,
              hr: similarPatientNode.patient_state.vitals.heart_rate.value,
              spo2: similarPatientNode.patient_state.vitals.oxygen_saturation.value,
              medications: similarPatientNode.patient_state.medications_active.map((m) => m.medication),
              complications: similarPatientNode.patient_state.complications_active.map((c) => c.type),
              flags: similarPatientNode.historical_analysis.flags.map((f) => f.message),
            },
            question: `Explain this clinical decision node (#${similarPatientNode.sequence}) from patient "${similarPatientName}". What was the clinical situation, what decision was made and why, and what were the risks? Keep it focused.`,
          }),
          signal: controller.signal,
        }),
        fetch("/api/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            context: { current_new_patient_node: currentNodeDesc },
            question: `Compare this new patient's current clinical state with the similar patient's node being explained in parallel. The new patient's current status: ${currentNodeDesc}. What are the key similarities and differences? What can the physician learn from the similar case? What risks should they watch for based on how the similar case progressed?`,
          }),
          signal: controller.signal,
        }),
      ]);

      // Stream both responses
      const readStream = async (res: Response, setter: (v: string) => void) => {
        if (!res.ok) { setError(`HTTP ${res.status}`); return; }
        const reader = res.body?.getReader();
        if (!reader) return;
        const decoder = new TextDecoder();
        let acc = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setter(acc);
        }
      };

      await Promise.all([
        readStream(resLeft, setLeftText),
        readStream(resRight, setRightText),
      ]);
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const close = () => { abortRef.current?.abort(); setOpen(false); };

  return { open, setOpen, leftText, rightText, loading, error, fetch2, close };
}

export function SimilarityPanel({
  matches,
  alerts,
  allPatients,
  completedSteps,
  currentSnapshot,
}: SimilarityPanelProps) {
  const matchedPatients = useMemo(() => {
    const top = matches.slice(0, 5);
    return top
      .map((m) => allPatients.find((p) => p.patient_id === m.patientId))
      .filter((p): p is PatientGraph => p != null);
  }, [matches, allPatients]);

  const explain = useParallelExplain();

  const handleExplainNode = (patient: PatientGraph, node: PatientNode) => {
    const nodeDesc = currentSnapshot?.primary_name
      ? `Diagnosis: ${currentSnapshot.primary_name}, Severity: ${currentSnapshot.severity ?? "unknown"}, Action: ${currentSnapshot.action ?? "assessment"}, Vitals: BP ${currentSnapshot.systolic ?? "?"}/${currentSnapshot.diastolic ?? "?"} HR ${currentSnapshot.heart_rate ?? "?"} SpO2 ${currentSnapshot.oxygen_saturation ?? "?"}%, Medications: ${(currentSnapshot.medications ?? []).map((m) => m.name).join(", ") || "none"}, Complications: ${(currentSnapshot.complications ?? []).join(", ") || "none"}`
      : "New patient — initial assessment in progress";

    explain.setOpen(true);
    explain.fetch2(node, patient.patient_name, nodeDesc);
  };

  if (completedSteps < 1) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8">
        <Users size={24} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center">
          Complete the admission step to start matching with similar patients.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <Alert key={alert.id} className={getSeverityClasses(alert.severity)}>
              {getSeverityIcon(alert.severity)}
              <AlertTitle className="text-xs font-semibold">{alert.title}</AlertTitle>
              <AlertDescription className="text-[11px] text-muted-foreground">{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Match count summary */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Users size={14} />
        <span>{matches.length} similar patients found</span>
        <span className="mx-1">·</span>
        <Badge className="bg-emerald-500/15 text-emerald-600 text-[9px]">
          {matches.filter((m) => m.outcome === "HEALED").length} healed
        </Badge>
        <Badge className="bg-amber-500/15 text-amber-600 text-[9px]">
          {matches.filter((m) => m.outcome === "HEALED_WITH_COMPLICATIONS").length} complicated
        </Badge>
        <Badge className="bg-red-500/15 text-red-600 text-[9px]">
          {matches.filter((m) => m.outcome === "DECEASED").length} deceased
        </Badge>
      </div>

      <Tabs defaultValue="matches">
        <TabsList>
          <TabsTrigger value="matches" className="gap-1.5 text-xs">
            <ChartBar size={14} /> Matches
          </TabsTrigger>
          <TabsTrigger value="graphs" className="gap-1.5 text-xs">
            <GitFork size={14} /> Patient Graphs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matches" className="mt-3">
          <ScrollArea className="h-[500px]">
            <div className="space-y-2 pr-3">
              {matches.map((m) => (
                <Card key={m.patientId} className="p-0">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold truncate">{m.patientName}</span>
                          <OutcomeBadge status={m.outcome} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formatDiagnosisName(m.sharedDiagnosis)} · {m.totalNodes} nodes · {formatCurrency(m.totalCost)}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          {m.demographicOverlap.sameGender && <Badge variant="outline" className="text-[8px] h-4">Same gender</Badge>}
                          {m.demographicOverlap.sameTriageCode && <Badge variant="outline" className="text-[8px] h-4">Same triage</Badge>}
                          {m.demographicOverlap.ageDiff <= 10 && <Badge variant="outline" className="text-[8px] h-4">Age ±{m.demographicOverlap.ageDiff}y</Badge>}
                          {m.complicationsTotal > 0 && (
                            <Badge variant="outline" className="text-[8px] h-4 border-amber-500/30 text-amber-600">
                              {m.complicationsTotal} complications
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="text-lg font-bold text-primary">{(m.similarityScore * 100).toFixed(0)}%</div>
                        <span className="text-[9px] text-muted-foreground">match</span>
                        <Link href={`/dashboard/patients/${m.patientId}`}
                          className="text-[9px] text-primary hover:underline flex items-center gap-0.5">
                          View <ArrowRight size={8} />
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {matches.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No similar patients found yet. Add more data to refine matching.
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="graphs" className="mt-3">
          <ScrollArea className="h-[500px]">
            <div className="space-y-4 pr-3">
              {matchedPatients.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No similar patients to display graphs for.
                </p>
              ) : (
                matchedPatients.map((p) => {
                  const matchInfo = matches.find((m) => m.patientId === p.patient_id);
                  const bestNode = findMostSimilarNode(p, currentSnapshot);
                  return (
                    <Card key={p.patient_id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xs flex items-center gap-2">
                            {p.patient_name}
                            <OutcomeBadge status={p.final_outcome.status} />
                          </CardTitle>
                          <div className="flex items-center gap-1">
                            {matchInfo && (
                              <Badge variant="outline" className="text-[9px]">
                                {(matchInfo.similarityScore * 100).toFixed(0)}% match
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDiagnosisName(p.nodes[0]?.patient_state?.diagnosis?.primary?.name ?? "unknown")} · {p.nodes.length} decision nodes
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <PatientGraphView nodes={p.nodes} edges={p.edges} />
                        {/* AI explain buttons per node */}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {p.nodes.map((node) => (
                            <Button
                              key={node.node_id}
                              variant={bestNode?.node_id === node.node_id ? "default" : "outline"}
                              size="sm"
                              className="gap-1 text-[9px] h-6 px-2"
                              onClick={() => handleExplainNode(p, node)}
                            >
                              <Sparkle size={10} weight="fill" />
                              #{node.sequence}
                              {bestNode?.node_id === node.node_id && (
                                <span className="text-[7px] opacity-75">most similar</span>
                              )}
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Parallel AI Explanation Drawer */}
      <Drawer open={explain.open} onOpenChange={(o) => { if (!o) explain.close(); }}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <div className="flex items-center gap-2">
              <Sparkle size={18} weight="fill" className="text-primary" />
              <DrawerTitle className="text-sm">AI Parallel Comparison</DrawerTitle>
            </div>
            <DrawerDescription className="text-xs text-muted-foreground">
              Side-by-side: similar patient&apos;s node vs. your new patient
            </DrawerDescription>
          </DrawerHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 pb-4 overflow-auto flex-1">
            {/* Left: similar patient's node */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-primary">Similar Patient&apos;s Node</h4>
              <ScrollArea className="h-[300px] rounded border p-3">
                {explain.loading && !explain.leftText && (
                  <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
                    <CircleNotch size={16} className="animate-spin" />
                    <span className="text-xs">Analyzing…</span>
                  </div>
                )}
                {explain.leftText && (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed whitespace-pre-wrap">
                    {explain.leftText}
                  </div>
                )}
              </ScrollArea>
            </div>
            {/* Right: comparison with new patient */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-emerald-600">Comparison & Insights for Your Patient</h4>
              <ScrollArea className="h-[300px] rounded border p-3">
                {explain.loading && !explain.rightText && (
                  <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
                    <CircleNotch size={16} className="animate-spin" />
                    <span className="text-xs">Comparing…</span>
                  </div>
                )}
                {explain.rightText && (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed whitespace-pre-wrap">
                    {explain.rightText}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
          {explain.error && (
            <p className="text-xs text-destructive px-4 pb-2">{explain.error}</p>
          )}
          <DrawerFooter className="flex-row justify-end border-t pt-3">
            <DrawerClose asChild>
              <Button variant="outline" size="sm" className="gap-1 text-xs">
                <X size={12} /> Close
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

