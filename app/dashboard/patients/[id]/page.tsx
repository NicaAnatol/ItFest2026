"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePatientById, usePatientData } from "@/hooks/use-patient-data";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OutcomeBadge } from "@/components/patient/outcome-badge";
import { TriageBadge } from "@/components/patient/triage-badge";
import { PatientGraphView } from "@/components/graph/patient-graph";
import { InteractivePatientGraph } from "@/components/graph/interactive-graph";
import { GraphTimeline } from "@/components/graph/graph-timeline";
import { NodeDetailSheet } from "@/components/patient/node-detail-sheet";
import { CostBreakdownChart } from "@/components/execution/cost-breakdown";
import {
  formatDiagnosisName,
  formatDate,
  formatCurrency,
  formatDurationDays,
  formatPercentage,
} from "@/lib/utils/format";
import type { PatientNode } from "@/lib/types/patient";
import {
  User,
  Clock,
  CurrencyEur,
  GitBranch,
  Buildings,
  Heartbeat,
  FirstAid,
  ArrowLeft,
  Warning,
  Skull,
  Trash,
  CircleNotch,
} from "@phosphor-icons/react";
import Link from "next/link";
import { CrossCasePanel } from "@/components/cross-case/cross-case-panel";
import { AiExplainButton } from "@/components/ai/ai-explain-button";
import { PatientChat } from "@/components/ai/patient-chat";
import { PathwayOptimizer } from "@/components/ai/pathway-optimizer";
import {
  buildComplicationExplainContext,
  buildComplicationExplainQuestion,
} from "@/lib/ai/explain-context";

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { patient, loading, error } = usePatientById(id);
  const { deletePatient } = usePatientData();
  const [selectedNode, setSelectedNode] = useState<PatientNode | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleNodeClick = (node: PatientNode) => {
    setSelectedNode(node);
    setSheetOpen(true);
  };

  const handleDeletePatient = async () => {
    if (!confirm("Are you sure you want to permanently delete this patient?")) return;
    setDeleting(true);
    try {
      await deletePatient(id);
      router.push("/dashboard/patients");
    } catch {
      alert("Failed to delete patient");
      setDeleting(false);
    }
  };

  if (error) {
    return <p className="text-destructive p-12 text-center">Error: {error}</p>;
  }

  if (loading) {
    return <PatientDetailSkeleton />;
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <p className="text-lg font-semibold">Patient not found</p>
        <Link href="/dashboard/patients" className="mt-2 text-sm text-primary hover:underline">
          ← Back to patients
        </Link>
      </div>
    );
  }

  const firstNode = patient.nodes[0];
  const demo = firstNode?.patient_state?.demographics;
  const fo = patient.flow_analytics;
  const outcome = patient.final_outcome;
  const costAnalysis = fo.cost_analysis;

  return (
    <div className="space-y-6">
      {/* Back link + delete */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/patients"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Back to patients
        </Link>
        <div className="flex items-center gap-2">
          <PatientChat patient={patient} />
          <PathwayOptimizer patient={patient} />
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleDeletePatient}
            disabled={deleting}
          >
            {deleting ? <CircleNotch size={14} className="animate-spin" /> : <Trash size={14} />}
            Delete Patient
          </Button>
        </div>
      </div>

      {/* Patient Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{patient.patient_name}</h1>
            <OutcomeBadge status={outcome.status} size="md" />
            <TriageBadge code={patient.admission.triage_code} size="md" />
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{patient.patient_id}</p>
          <div className="mt-2 flex items-center gap-1.5 text-sm">
            <FirstAid size={16} className="text-primary" weight="bold" />
            <span className="font-medium">
              {formatDiagnosisName(firstNode?.patient_state?.diagnosis?.primary?.name ?? "unknown")}
            </span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <MiniStat icon={User} label="Demographics" value={`${demo?.age}y ${demo?.gender}`} />
          <MiniStat icon={Clock} label="LOS" value={formatDurationDays(patient.discharge.duration_days)} />
          <MiniStat icon={CurrencyEur} label="Total Cost" value={formatCurrency(outcome.summary.total_cost_eur)} />
          <MiniStat icon={GitBranch} label="Nodes" value={String(outcome.summary.total_nodes)} />
          <MiniStat icon={Buildings} label="Departments" value={String(outcome.summary.total_departments)} />
          <MiniStat icon={Heartbeat} label="Complications" value={String(outcome.summary.complications_total)} />
        </div>
      </div>

      <Separator />

      {/* Main Tabs */}
      <Tabs defaultValue="graph">
        <ScrollArea className="w-full">
          <TabsList className="w-max">
            <TabsTrigger value="graph">Graph View</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="complications">
              Complications
              {outcome.summary.complications_total > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[9px]">
                  {outcome.summary.complications_total}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="cost">Cost Analysis</TabsTrigger>
            <TabsTrigger value="cross-case">
              Pattern Analysis
            </TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>
        </ScrollArea>

        {/* Graph View */}
        <TabsContent value="graph" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Interactive Patient Journey Graph</CardTitle>
                <AiExplainButton
                  context={{
                    patient_id: patient.patient_id,
                    patient_name: patient.patient_name,
                    diagnosis: firstNode?.patient_state?.diagnosis?.primary,
                    demographics: demo,
                    outcome: outcome.status,
                    total_nodes: outcome.summary.total_nodes,
                    total_departments: outcome.summary.total_departments,
                    department_flow: fo.department_utilization.map((d) => ({
                      department: d.department,
                      nodes: d.nodes,
                      cost: d.cost_eur,
                    })),
                    edges_count: patient.edges.length,
                    complications_total: outcome.summary.complications_total,
                  }}
                  question="Explain the overall patient journey graph — what departments did the patient go through, what was the flow of care, and what were the key transitions? Highlight anything unusual about the path."
                  title="AI — Patient Journey Explanation"
                  label="Explain Journey"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Click any node for details · Drag to rearrange · Scroll to zoom · Department swim lanes
              </p>
            </CardHeader>
            <CardContent>
              <InteractivePatientGraph
                nodes={patient.nodes}
                edges={patient.edges}
                selectedNodeId={selectedNode?.node_id}
                onNodeClick={handleNodeClick}
              />
            </CardContent>
          </Card>

          {/* Linear fallback */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Linear View</CardTitle>
            </CardHeader>
            <CardContent>
              <PatientGraphView
                nodes={patient.nodes}
                edges={patient.edges}
                selectedNodeId={selectedNode?.node_id}
                onNodeClick={handleNodeClick}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline View */}
        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Decision Timeline</CardTitle>
                <AiExplainButton
                  context={{
                    patient_id: patient.patient_id,
                    diagnosis: firstNode?.patient_state?.diagnosis?.primary?.name,
                    outcome: outcome.status,
                    decisions: patient.nodes.map((n) => ({
                      sequence: n.sequence,
                      action: n.decision.action,
                      category: n.decision.action_category,
                      department: n.logistics.location.department.name,
                      timestamp: n.timestamp.exact,
                      flags_count: n.historical_analysis.flags.length,
                      quality: n.transition_outcome.net_impact.decision_quality,
                      mortality_risk: n.risk_assessment.mortality_risk.total,
                    })),
                    decision_quality: fo.decision_quality_analysis,
                  }}
                  question="Summarize the timeline of decisions made for this patient. Which decisions were most critical? Were there any suboptimal decisions or delays? What was the overall decision-making quality?"
                  title="AI — Decision Timeline Analysis"
                  label="Explain Timeline"
                />
              </div>
            </CardHeader>
            <CardContent>
              <GraphTimeline
                nodes={patient.nodes}
                selectedNodeId={selectedNode?.node_id}
                onNodeClick={handleNodeClick}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Complications */}
        <TabsContent value="complications" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Complication Tracking</CardTitle>
                <AiExplainButton
                  context={{
                    patient_id: patient.patient_id,
                    diagnosis: firstNode?.patient_state?.diagnosis?.primary?.name,
                    outcome: outcome.status,
                    complications: fo.complication_tracking.timeline,
                    final_complications: outcome.final_complications,
                    total_complications: outcome.summary.complications_total,
                    complications_resolved: outcome.summary.complications_resolved,
                    complications_permanent: outcome.summary.complications_permanent,
                  }}
                  question="Explain the complications that occurred during this patient's stay. What caused them, were they predicted by the AI system, and how were they managed? Were any preventable?"
                  title="AI — Complications Analysis"
                  label="Explain Complications"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {fo.complication_tracking.timeline.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No complications recorded.</p>
              ) : (
                fo.complication_tracking.timeline.map((c) => (
                  <div key={c.complication_id} className="flex items-start gap-3 rounded-lg border p-3">
                    <div className={`mt-0.5 rounded-full p-1 ${c.permanent ? "bg-red-500/15 text-red-500" : "bg-amber-500/15 text-amber-500"}`}>
                      {c.permanent ? <Skull size={14} weight="fill" /> : <Warning size={14} weight="fill" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium">{c.type.replace(/_/g, " ")}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
                        <Badge variant="outline">At: {c.introduced_at}</Badge>
                        {c.resolved_at ? (
                          <Badge variant="secondary">Resolved: {c.resolved_at}</Badge>
                        ) : (
                          <Badge className="bg-red-500/15 text-red-600">Unresolved</Badge>
                        )}
                        {c.permanent && <Badge className="bg-red-500/15 text-red-600">Permanent</Badge>}
                        {c.was_predicted && (
                          <Badge className="bg-emerald-500/15 text-emerald-600">Predicted by AI</Badge>
                        )}
                      </div>
                    </div>
                    <AiExplainButton
                      compact
                      context={buildComplicationExplainContext(c)}
                      question={buildComplicationExplainQuestion(c)}
                      title={`AI — Complication: ${c.type.replace(/_/g, " ")}`}
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost Analysis */}
        <TabsContent value="cost" className="mt-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium">Cost Analysis</h3>
            <AiExplainButton
              context={{
                patient_id: patient.patient_id,
                diagnosis: firstNode?.patient_state?.diagnosis?.primary?.name,
                outcome: outcome.status,
                cost_analysis: costAnalysis,
                department_utilization: fo.department_utilization,
                los_days: patient.discharge.duration_days,
              }}
              question="Analyze the cost breakdown for this patient. Which departments and resource types consumed the most? How does the cost per day compare? Were there any cost drivers that could have been optimized? Frame the analysis in terms of value — cost vs outcome."
              title="AI — Cost Analysis"
              label="Explain Costs"
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <CostBreakdownChart
                  cost={{
                    personnel: costAnalysis.breakdown.personnel,
                    medications: costAnalysis.breakdown.medications,
                    equipment: costAnalysis.breakdown.equipment,
                    consumables: 0,
                    investigations: costAnalysis.breakdown.investigations,
                    procedures: costAnalysis.breakdown.procedures,
                    total: costAnalysis.total_cost_eur,
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Department Utilization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {fo.department_utilization.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span>{d.department.replace(/_/g, " ")}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px]">{d.nodes} nodes</Badge>
                      <span className="font-mono">{formatCurrency(d.cost_eur)}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cross-Case Pattern Analysis */}
        <TabsContent value="cross-case" className="mt-4">
          <CrossCasePanel patient={patient} />
        </TabsContent>

        {/* Summary */}
        <TabsContent value="summary" className="mt-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium">Patient Summary</h3>
            <AiExplainButton
              context={{
                patient_id: patient.patient_id,
                patient_name: patient.patient_name,
                demographics: demo,
                admission: patient.admission,
                discharge: patient.discharge,
                diagnosis: firstNode?.patient_state?.diagnosis?.primary,
                medical_history: firstNode?.patient_state?.medical_history,
                outcome: outcome,
                decision_quality: fo.decision_quality_analysis,
                cost: costAnalysis.total_cost_eur,
                los_days: patient.discharge.duration_days,
                quality_score: fo.outcome_quality.quality_score,
                complications_total: outcome.summary.complications_total,
              }}
              question="Provide a comprehensive summary of this patient's hospital stay — from admission to discharge. Cover the diagnosis, key decisions, complications, outcome, and overall quality of care. What lessons can be learned from this case?"
              title="AI — Patient Summary"
              label="Explain Summary"
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Admission</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <Row label="Method" value={patient.admission.method} />
                <Row label="Chief Complaint" value={formatDiagnosisName(patient.admission.chief_complaint)} />
                <Row label="Date" value={formatDate(patient.admission.timestamp)} />
                <Row label="Triage" value={patient.admission.triage_code} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Discharge</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <Row label="Date" value={formatDate(patient.discharge.timestamp)} />
                <Row label="Duration" value={formatDurationDays(patient.discharge.duration_days)} />
                <Row label="Destination" value={outcome.discharge_destination} />
                <Row label="Readmission Risk" value={formatPercentage(outcome.readmission_risk_30day * 100)} />
                <Row label="Quality Score" value={formatPercentage(fo.outcome_quality.quality_score * 100)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Final Outcome</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <OutcomeBadge status={outcome.status} size="md" />
                {outcome.final_complications.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Permanent Complications:</p>
                    {outcome.final_complications.map((c) => (
                      <div key={c.complication_id} className="rounded border border-red-500/20 bg-red-500/5 p-2 text-xs">
                        <p className="font-medium">{c.type.replace(/_/g, " ")}</p>
                        <p className="text-muted-foreground">
                          Caused by: {c.caused_by_node} · QoL impact: {(c.quality_of_life_impact * 100).toFixed(0)}%
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Decision Quality</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <Row label="Total Decisions" value={String(fo.decision_quality_analysis.total_decisions)} />
                <Row label="Appropriate" value={String(fo.decision_quality_analysis.appropriate)} />
                <Row label="Suboptimal" value={String(fo.decision_quality_analysis.suboptimal)} />
                <Row
                  label="Appropriate Rate"
                  value={formatPercentage(
                    fo.decision_quality_analysis.total_decisions
                      ? (fo.decision_quality_analysis.appropriate / fo.decision_quality_analysis.total_decisions) * 100
                      : 0,
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Node Detail Sheet */}
      <NodeDetailSheet node={selectedNode} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <Icon size={16} className="mx-auto text-muted-foreground" />
      <p className="text-xs font-semibold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function PatientDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-24" />
      <div className="flex justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-20" />
          ))}
        </div>
      </div>
      <Skeleton className="h-px w-full" />
      <Skeleton className="h-10 w-96" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}

