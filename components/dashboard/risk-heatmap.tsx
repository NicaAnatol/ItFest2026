"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import type { PatientGraph } from "@/lib/types/patient";
import {
  getRiskLevel,
  formatDiagnosisName,
  formatRiskPercentage,
  getOutcomeLabel,
} from "@/lib/utils/format";
import { Warning, Heartbeat } from "@phosphor-icons/react";

interface RiskHeatmapProps {
  patients: PatientGraph[];
}

interface PatientRiskSummary {
  patient: PatientGraph;
  maxMortalityRisk: number;
  avgMortalityRisk: number;
  totalFlags: number;
  criticalFlags: number;
  complicationsActive: number;
  riskLevel: "low" | "moderate" | "high" | "critical";
}

export function RiskHeatmap({ patients }: RiskHeatmapProps) {
  const riskSummaries = useMemo<PatientRiskSummary[]>(() => {
    return patients
      .map((patient) => {
        const risks = patient.nodes.map((n) => n.risk_assessment.mortality_risk.total);
        const maxRisk = Math.max(...risks);
        const avgRisk = risks.reduce((s, r) => s + r, 0) / risks.length;
        const totalFlags = patient.nodes.reduce(
          (s, n) => s + n.historical_analysis.flags.length,
          0,
        );
        const criticalFlags = patient.nodes.reduce(
          (s, n) =>
            s + n.historical_analysis.flags.filter((f) => f.severity === "CRITICAL").length,
          0,
        );
        const lastNode = patient.nodes[patient.nodes.length - 1];
        const complicationsActive = lastNode?.patient_state?.complications_active?.length ?? 0;

        return {
          patient,
          maxMortalityRisk: maxRisk,
          avgMortalityRisk: avgRisk,
          totalFlags,
          criticalFlags,
          complicationsActive,
          riskLevel: getRiskLevel(maxRisk),
        };
      })
      .sort((a, b) => b.maxMortalityRisk - a.maxMortalityRisk);
  }, [patients]);

  const criticalCount = riskSummaries.filter((r) => r.riskLevel === "critical").length;
  const highCount = riskSummaries.filter((r) => r.riskLevel === "high").length;

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-medium flex items-center gap-1.5">
            <Heartbeat size={14} weight="fill" className="text-primary" />
            Patient Risk Heatmap
          </CardTitle>
          <div className="flex items-center gap-1.5 text-[9px]">
            {criticalCount > 0 && (
              <Badge className="bg-red-500/15 text-red-600 text-[9px] px-1.5 py-0">
                {criticalCount} critical
              </Badge>
            )}
            {highCount > 0 && (
              <Badge className="bg-orange-500/15 text-orange-600 text-[9px] px-1.5 py-0">
                {highCount} high
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="text-[10px]">
          Each tile = one patient, colored by peak mortality risk. Hover for details.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <ScrollArea className="h-44">
          <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-14 gap-1.5 pr-3">
            {riskSummaries.map((rs) => (
              <HeatmapCell key={rs.patient.patient_id} data={rs} />
            ))}
          </div>
        </ScrollArea>

        {/* Legend */}
        <div className="mt-2 flex items-center justify-center gap-2.5 text-[9px] text-muted-foreground">
          <div className="flex items-center gap-0.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-emerald-500/60" />
            Low
          </div>
          <div className="flex items-center gap-0.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-amber-400/60" />
            Moderate
          </div>
          <div className="flex items-center gap-0.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-orange-500/70" />
            High
          </div>
          <div className="flex items-center gap-0.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-red-500/80" />
            Critical
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HeatmapCell({ data }: { data: PatientRiskSummary }) {
  const bgColor =
    data.riskLevel === "critical"
      ? "bg-red-500/70 hover:bg-red-500/90"
      : data.riskLevel === "high"
        ? "bg-orange-500/60 hover:bg-orange-500/80"
        : data.riskLevel === "moderate"
          ? "bg-amber-400/50 hover:bg-amber-400/70"
          : "bg-emerald-500/40 hover:bg-emerald-500/60";

  const diagnosis =
    data.patient.nodes[0]?.patient_state?.diagnosis?.primary?.name ?? "unknown";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href={`/dashboard/patients/${data.patient.patient_id}`}>
          <div
            className={`
              relative flex aspect-square items-center justify-center rounded-md
              ${bgColor} cursor-pointer transition-all hover:scale-110 hover:shadow-md
              ${data.criticalFlags > 0 ? "ring-1 ring-red-500/50" : ""}
            `}
          >
            {data.criticalFlags > 0 && (
              <Warning size={11} weight="fill" className="text-white/90" />
            )}
            <span className="text-[7px] font-bold text-white/90 absolute bottom-0.5 leading-none">
              {formatRiskPercentage(data.maxMortalityRisk)}
            </span>
          </div>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <p className="text-xs font-semibold">{data.patient.patient_name}</p>
          <p className="text-[10px] text-muted-foreground">
            {formatDiagnosisName(diagnosis)}
          </p>
          <div className="flex flex-wrap gap-1 text-[10px]">
            <Badge variant="outline" className="text-[9px]">
              Peak Risk: {formatRiskPercentage(data.maxMortalityRisk)}
            </Badge>
            <Badge variant="outline" className="text-[9px]">
              {data.totalFlags} flags ({data.criticalFlags} critical)
            </Badge>
            <Badge variant="outline" className="text-[9px]">
              {getOutcomeLabel(data.patient.final_outcome.status)}
            </Badge>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
