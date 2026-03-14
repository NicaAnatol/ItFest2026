"use client";

import { useState } from "react";
import type { PatientGraph } from "@/lib/types/patient";
import { useCrossCaseAnalysis } from "@/hooks/use-cross-case-analysis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PatientMatchList } from "./patient-match-list";
import { ComparisonGraph } from "./comparison-graph";
import { StepExplainer } from "./step-explainer";
import { DivergenceList } from "./divergence-card";
import { OutcomeCorrelationBars } from "./outcome-correlation-bars";
import { InsightsPanel } from "./insights-panel";
import {
  GitFork,
  ChartBar,
  Sparkle,
  Users,
  Warning,
} from "@phosphor-icons/react";

interface CrossCasePanelProps {
  patient: PatientGraph;
}

export function CrossCasePanel({ patient }: CrossCasePanelProps) {
  const {
    matches,
    toggleMatch,
    selectedMatches,
    alignedPairs,
    divergences,
    correlations,
    loading,
    aiAnalysis,
    analyzeWithAI,
  } = useCrossCaseAnalysis(patient);

  /** -1 = walkthrough not started, 0+ = active step index */
  const [activeStepIndex, setActiveStepIndex] = useState(-1);

  if (loading) {
    return <CrossCaseSkeleton />;
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8">
        <Users size={24} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No similar cases found in the dataset for this patient.
        </p>
      </div>
    );
  }

  // Stats summary
  const outcomeBreakdown = {
    healed: selectedMatches.filter((m) => m.outcome === "HEALED").length,
    complicated: selectedMatches.filter((m) => m.outcome === "HEALED_WITH_COMPLICATIONS").length,
    deceased: selectedMatches.filter((m) => m.outcome === "DECEASED").length,
  };

  return (
    <div className="space-y-6">
      {/* Similar Cases */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users size={16} className="text-muted-foreground" />
              Similar Cases
            </CardTitle>
            <div className="flex items-center gap-2 text-[10px]">
              <Badge className="bg-emerald-500/15 text-emerald-600 text-[9px]">
                {outcomeBreakdown.healed} healed
              </Badge>
              <Badge className="bg-amber-500/15 text-amber-600 text-[9px]">
                {outcomeBreakdown.complicated} complications
              </Badge>
              <Badge className="bg-red-500/15 text-red-600 text-[9px]">
                {outcomeBreakdown.deceased} deceased
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PatientMatchList matches={matches} onToggle={toggleMatch} />
        </CardContent>
      </Card>

      {/* Analysis sections */}
      {selectedMatches.length > 0 && (
        <Tabs defaultValue="graph">
          <TabsList>
            <TabsTrigger value="graph" className="gap-1.5">
              <GitFork size={14} />
              Comparison Graph
            </TabsTrigger>
            <TabsTrigger value="divergences" className="gap-1.5">
              <Warning size={14} />
              Divergences
              {divergences.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[9px]">
                  {divergences.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="correlations" className="gap-1.5">
              <ChartBar size={14} />
              Outcome Patterns
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-1.5">
              <Sparkle size={14} />
              AI Analysis
            </TabsTrigger>
          </TabsList>

          {/* Comparison Graph */}
          <TabsContent value="graph" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Decision Pattern Matrix
                </CardTitle>
                <p className="text-[10px] text-muted-foreground">
                  Patients grouped by outcome. Cells are color-coded by action type.
                  Agreement bars show how many patients took the same action at each stage.
                  <span className="text-orange-400"> ◆ diamonds</span> mark divergence points. Hover any cell for details.
                </p>
              </CardHeader>
              <CardContent>
                <ComparisonGraph
                  alignedPairs={alignedPairs}
                  divergences={divergences}
                  comparedPatientIds={selectedMatches.map((m) => m.patientId)}
                  activeStepIndex={activeStepIndex}
                  onStageSelect={setActiveStepIndex}
                />

                {/* Step-by-step AI explainer */}
                <StepExplainer
                  alignedPairs={alignedPairs}
                  divergences={divergences}
                  activeStepIndex={activeStepIndex}
                  onStepChange={setActiveStepIndex}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Divergences */}
          <TabsContent value="divergences" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Decision Divergence Points
                </CardTitle>
                <p className="text-[10px] text-muted-foreground">
                  Points where the reference patient&apos;s treatment path diverged from similar cases.
                  These reveal where different choices led to different outcomes.
                </p>
              </CardHeader>
              <CardContent>
                <DivergenceList divergences={divergences} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Outcome Correlations */}
          <TabsContent value="correlations" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Decision–Outcome Correlations
                </CardTitle>
                <p className="text-[10px] text-muted-foreground">
                  Which decision patterns across similar cases correlate with positive or negative outcomes.
                  Higher significance indicates patterns with notable outcome deviation.
                </p>
              </CardHeader>
              <CardContent>
                <OutcomeCorrelationBars correlations={correlations} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Analysis */}
          <TabsContent value="ai" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Sparkle size={16} className="text-primary" weight="bold" />
                  AI Clinical Pathway Analysis
                </CardTitle>
                <p className="text-[10px] text-muted-foreground">
                  AI-powered analysis of cross-case decision patterns to identify complication-causing
                  sequences, protective patterns, and timing-critical decisions.
                </p>
              </CardHeader>
              <CardContent>
                <InsightsPanel
                  text={aiAnalysis.text}
                  insights={aiAnalysis.insights}
                  loading={aiAnalysis.loading}
                  error={aiAnalysis.error}
                  onAnalyze={analyzeWithAI}
                  disabled={selectedMatches.length === 0}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function CrossCaseSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-48" />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

