"use client";

import { usePatientData } from "@/hooks/use-patient-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PatientCard } from "@/components/patient/patient-card";
import { OutcomeBadge } from "@/components/patient/outcome-badge";
import {
  formatCurrency,
  formatDiagnosisName,
  formatPercentage,
} from "@/lib/utils/format";
import Link from "next/link";
import {
  Users,
  Heartbeat,
  Clock,
  CurrencyEur,
  ChartBar,
  FirstAid,
} from "@phosphor-icons/react";
import type { OutcomeStatus } from "@/lib/types/patient";
import { RiskHeatmap } from "@/components/dashboard/risk-heatmap";

export default function DashboardPage() {
  const { patients, metadata, loading, error } = usePatientData();

  if (error) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-destructive">Error loading data: {error}</p>
      </div>
    );
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  const stats = metadata?.statistics;
  const total = patients.length;
  const healed = patients.filter((p) => p.final_outcome.status === "HEALED").length;
  const complicated = patients.filter((p) => p.final_outcome.status === "HEALED_WITH_COMPLICATIONS").length;
  const deceased = patients.filter((p) => p.final_outcome.status === "DECEASED").length;
  const avgLos = total ? patients.reduce((s, p) => s + p.discharge.duration_days, 0) / total : 0;
  const totalCost = patients.reduce((s, p) => s + (p.final_outcome.summary.total_cost_eur || 0), 0);

  // Diagnosis distribution
  const diagMap: Record<string, number> = {};
  patients.forEach((p) => {
    const d = p.nodes[0]?.patient_state?.diagnosis?.primary?.name ?? "unknown";
    diagMap[d] = (diagMap[d] || 0) + 1;
  });
  const diagEntries = Object.entries(diagMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
  const maxDiag = diagEntries[0]?.[1] ?? 1;

  // Recent patients
  const recent = [...patients]
    .sort((a, b) => new Date(b.admission.timestamp).getTime() - new Date(a.admission.timestamp).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Hospital AI Predictive Analysis Overview
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Patients"
          value={String(total)}
          icon={Users}
          description="Tracked patient flows"
        />
        <StatCard
          title="Avg Length of Stay"
          value={`${avgLos.toFixed(1)}d`}
          icon={Clock}
          description="Average across all patients"
        />
        <StatCard
          title="Total Cost"
          value={formatCurrency(totalCost)}
          icon={CurrencyEur}
          description={`Avg ${formatCurrency(Math.round(totalCost / Math.max(1, total)))}/patient`}
        />
        <StatCard
          title="Complications"
          value={String(stats?.total_complications ?? 0)}
          icon={Heartbeat}
          description={`${deceased} deceased · ${complicated} with complications`}
        />
      </div>

      {/* Outcome Distribution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Outcome Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <OutcomeBar label="Healed" count={healed} total={total} status="HEALED" />
            <OutcomeBar label="Complications" count={complicated} total={total} status="HEALED_WITH_COMPLICATIONS" />
            <OutcomeBar label="Deceased" count={deceased} total={total} status="DECEASED" />
          </div>
        </CardContent>
      </Card>

      {/* Risk Heatmap */}
      <RiskHeatmap patients={patients} />

      {/* Two columns: Diagnosis Distribution + Recent Patients */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Diagnosis distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <FirstAid size={16} />
              Top Diagnoses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {diagEntries.map(([name, count]) => (
              <div key={name} className="flex items-center gap-2 text-xs">
                <span className="w-40 truncate text-muted-foreground" title={formatDiagnosisName(name)}>
                  {formatDiagnosisName(name)}
                </span>
                <div className="h-2 flex-1 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/60"
                    style={{ width: `${(count / maxDiag) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right font-mono">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent patients */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Recent Patients</CardTitle>
              <Link href="/dashboard/patients" className="text-xs text-primary hover:underline">
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {recent.map((p) => (
              <PatientCard key={p.patient_id} patient={p} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <Icon size={18} className="text-muted-foreground" />
        </div>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function OutcomeBar({
  label,
  count,
  total,
  status,
}: {
  label: string;
  count: number;
  total: number;
  status: OutcomeStatus;
}) {
  const pct = total ? (count / total) * 100 : 0;
  return (
    <div className="flex-1 space-y-1">
      <div className="flex items-center justify-between">
        <OutcomeBadge status={status} size="sm" />
        <span className="text-xs font-mono">{count}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${
            status === "HEALED"
              ? "bg-emerald-500"
              : status === "HEALED_WITH_COMPLICATIONS"
                ? "bg-amber-500"
                : "bg-red-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">{formatPercentage(pct)}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-1 h-4 w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-lg" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  );
}

