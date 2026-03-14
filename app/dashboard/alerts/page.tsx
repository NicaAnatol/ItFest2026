"use client";

import { useMemo, useState } from "react";
import { usePatientData } from "@/hooks/use-patient-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Warning,
  WarningCircle,
  Info,
  Skull,
  ShieldWarning,
  Heartbeat,
  Pill,
  Lightning,
  Users,
  Funnel,
  ArrowRight,
} from "@phosphor-icons/react";
import Link from "next/link";
import type { PatientGraph } from "@/lib/types/patient";
import type { Flag, FlagSeverity } from "@/lib/types/historical";
import {
  formatDiagnosisName,
  formatActionName,
  getRiskLevel,
  getRiskBgColor,
  formatRiskPercentage,
  getFlagSeverityColor,
} from "@/lib/utils/format";

interface AggregatedAlert {
  flag: Flag;
  patient: PatientGraph;
  nodeSequence: number;
  nodeAction: string;
  mortalityRisk: number;
  department: string;
}

type SeverityFilter = "ALL" | FlagSeverity;

export default function AlertCenterPage() {
  const { patients, loading, error } = usePatientData();
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Aggregate all flags from all patients
  const allAlerts = useMemo<AggregatedAlert[]>(() => {
    const alerts: AggregatedAlert[] = [];
    for (const patient of patients) {
      for (const node of patient.nodes) {
        for (const flag of node.historical_analysis.flags) {
          alerts.push({
            flag,
            patient,
            nodeSequence: node.sequence,
            nodeAction: node.decision.action,
            mortalityRisk: node.risk_assessment.mortality_risk.total,
            department: node.logistics.location.department.name,
          });
        }
      }
    }
    // Sort: CRITICAL first, then WARNING, then INFO; within same severity, by risk
    const severityOrder: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    alerts.sort((a, b) => {
      const sa = severityOrder[a.flag.severity] ?? 3;
      const sb = severityOrder[b.flag.severity] ?? 3;
      if (sa !== sb) return sa - sb;
      return b.mortalityRisk - a.mortalityRisk;
    });
    return alerts;
  }, [patients]);

  // Get unique flag types
  const flagTypes = useMemo(() => {
    const types = new Set(allAlerts.map((a) => a.flag.type));
    return Array.from(types).sort();
  }, [allAlerts]);

  // Filter
  const filtered = useMemo(() => {
    return allAlerts.filter((a) => {
      if (severityFilter !== "ALL" && a.flag.severity !== severityFilter) return false;
      if (typeFilter !== "ALL" && a.flag.type !== typeFilter) return false;
      return true;
    });
  }, [allAlerts, severityFilter, typeFilter]);

  // Stats
  const stats = useMemo(() => {
    const critical = allAlerts.filter((a) => a.flag.severity === "CRITICAL").length;
    const warning = allAlerts.filter((a) => a.flag.severity === "WARNING").length;
    const info = allAlerts.filter((a) => a.flag.severity === "INFO").length;
    const affectedPatients = new Set(allAlerts.map((a) => a.patient.patient_id)).size;
    const highRiskPatients = new Set(
      allAlerts
        .filter((a) => a.flag.severity === "CRITICAL")
        .map((a) => a.patient.patient_id),
    ).size;
    return { critical, warning, info, total: allAlerts.length, affectedPatients, highRiskPatients };
  }, [allAlerts]);

  if (error) {
    return <p className="text-destructive p-12 text-center">Error: {error}</p>;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ShieldWarning size={24} weight="fill" className="text-primary" />
          Alert Center
        </h1>
        <p className="text-sm text-muted-foreground">
          Hospital-wide AI flag monitoring — {stats.total} alerts across {stats.affectedPatients} patients
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-red-600 dark:text-red-400">Critical</p>
              <Warning size={18} weight="fill" className="text-red-500" />
            </div>
            <p className="mt-1 text-3xl font-bold text-red-600 dark:text-red-400">{stats.critical}</p>
            <p className="text-[10px] text-muted-foreground">{stats.highRiskPatients} patients affected</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Warning</p>
              <WarningCircle size={18} weight="fill" className="text-amber-500" />
            </div>
            <p className="mt-1 text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.warning}</p>
            <p className="text-[10px] text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Informational</p>
              <Info size={18} weight="fill" className="text-blue-500" />
            </div>
            <p className="mt-1 text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.info}</p>
            <p className="text-[10px] text-muted-foreground">For awareness</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Patients Affected</p>
              <Users size={18} className="text-muted-foreground" />
            </div>
            <p className="mt-1 text-3xl font-bold">{stats.affectedPatients}</p>
            <p className="text-[10px] text-muted-foreground">of {patients.length} total</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Funnel size={16} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground mr-1">Severity:</span>
            {(["ALL", "CRITICAL", "WARNING", "INFO"] as const).map((s) => (
              <Button
                key={s}
                variant={severityFilter === s ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSeverityFilter(s)}
              >
                {s === "ALL" ? "All" : s}
                {s === "CRITICAL" && ` (${stats.critical})`}
                {s === "WARNING" && ` (${stats.warning})`}
                {s === "INFO" && ` (${stats.info})`}
              </Button>
            ))}

            <Separator orientation="vertical" className="h-4 mx-1" />
            <span className="text-xs text-muted-foreground mr-1">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-7 rounded-md border bg-background px-2 text-xs outline-none"
            >
              <option value="ALL">All types</option>
              {flagTypes.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Alert List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {filtered.length} Alert{filtered.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="divide-y">
              {filtered.map((alert, i) => (
                <AlertRow key={`${alert.flag.flag_id}-${i}`} alert={alert} />
              ))}
              {filtered.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No alerts match the current filters.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function AlertRow({ alert }: { alert: AggregatedAlert }) {
  const SeverityIcon =
    alert.flag.severity === "CRITICAL"
      ? Warning
      : alert.flag.severity === "WARNING"
        ? WarningCircle
        : Info;

  const severityColor =
    alert.flag.severity === "CRITICAL"
      ? "text-red-500"
      : alert.flag.severity === "WARNING"
        ? "text-amber-500"
        : "text-blue-500";

  const riskLevel = getRiskLevel(alert.mortalityRisk);

  const typeIconMap: Record<string, React.ElementType> = {
    HIGH_RISK_COMPLICATION: Skull,
    TIMING_CRITICAL: Lightning,
    DOSAGE_CHECK: Pill,
    INTERACTION_WARNING: Pill,
    HIGH_RISK_PRESENTATION: Heartbeat,
    AGE_RELATED_RISK: Users,
  };
  const TypeIcon = typeIconMap[alert.flag.type] ?? ShieldWarning;

  return (
    <div className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors">
      <div className={`mt-0.5 ${severityColor}`}>
        <SeverityIcon size={18} weight="fill" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold">{alert.flag.message}</span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={`text-[9px] ${getFlagSeverityColor(alert.flag.severity)}`}>
            {alert.flag.severity}
          </Badge>
          <Badge variant="outline" className="text-[9px] gap-1">
            <TypeIcon size={10} />
            {alert.flag.type.replace(/_/g, " ")}
          </Badge>
          <Badge variant="outline" className={`text-[9px] ${getRiskBgColor(riskLevel)}`}>
            Mortality {formatRiskPercentage(alert.mortalityRisk)}
          </Badge>
          <Badge variant="secondary" className="text-[9px]">
            {alert.department.replace(/_/g, " ")}
          </Badge>
        </div>

        <p className="mt-1 text-[10px] text-muted-foreground">
          Patient: <span className="font-medium text-foreground">{alert.patient.patient_name}</span>
          {" · "}
          Node #{alert.nodeSequence}: {formatActionName(alert.nodeAction)}
          {" · "}
          Dx: {formatDiagnosisName(alert.patient.nodes[0]?.patient_state?.diagnosis?.primary?.name ?? "unknown")}
        </p>
      </div>

      <Link href={`/dashboard/patients/${alert.patient.patient_id}`}>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
          <ArrowRight size={14} />
        </Button>
      </Link>
    </div>
  );
}

