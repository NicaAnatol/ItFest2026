"use client";

import { useMemo } from "react";
import { usePatientData } from "@/hooks/use-patient-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { OutcomeBadge } from "@/components/patient/outcome-badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { CriticalAlertsWidget } from "@/components/dashboard/critical-alerts-widget";
import { DepartmentLoadChart } from "@/components/dashboard/department-load-chart";
import { CostBreakdownSummary } from "@/components/dashboard/cost-breakdown-summary";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RiskHeatmap } from "@/components/dashboard/risk-heatmap";
import { computeDashboardStats } from "@/lib/data/dashboard-stats";
import {
  formatCurrency,
  formatDiagnosisName,
  formatPercentage,
  formatRiskPercentage,
} from "@/lib/utils/format";
import {
  Users,
  Heartbeat,
  Clock,
  CurrencyEur,
  ChartBar,
  FirstAid,
  ShieldCheck,
} from "@phosphor-icons/react";
import type { OutcomeStatus } from "@/lib/types/patient";

export default function DashboardPage() {
  const { patients, loading, error } = usePatientData();

  const stats = useMemo(() => {
    if (!patients.length) return null;
    return computeDashboardStats(patients);
  }, [patients]);

  if (error) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-destructive">Error loading data: {error}</p>
      </div>
    );
  }

  if (loading || !stats) {
    return <DashboardSkeleton />;
  }

  const maxDiag = stats.diagnosisDistribution[0]?.[1] ?? 1;

  return (
    <div className="space-y-6">
      {/* Header + Quick Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Hospital AI Predictive Analysis Overview
          </p>
        </div>
        <QuickActions />
      </div>

      {/* KPI Stats Grid — 5 cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Patients"
          value={String(stats.total)}
          icon={Users}
          description="Tracked patient flows"
          hint="Total number of patient decision graphs in the system. Each patient is modeled as a directed graph of clinical decisions from admission through discharge."
          accent="default"
        />
        <StatCard
          title="Avg Length of Stay"
          value={`${stats.avgLos.toFixed(1)}d`}
          icon={Clock}
          description="Average across all patients"
          hint="Mean number of days patients spend in the hospital, from admission to discharge."
        />
        <StatCard
          title="Total Cost"
          value={formatCurrency(stats.totalCost)}
          icon={CurrencyEur}
          description={`Avg ${formatCurrency(stats.avgCostPerPatient)}/patient`}
          hint="Cumulative cost across all tracked patient stays."
        />
        <StatCard
          title="Decision Quality"
          value={formatPercentage(stats.decisionQuality.ratio * 100, 0)}
          icon={ShieldCheck}
          description={`${stats.decisionQuality.appropriate}/${stats.decisionQuality.total} appropriate`}
          hint="Ratio of appropriate clinical decisions to total decisions across all patient journeys. Higher is better — indicates evidence-based care alignment."
          accent="success"
          trend={{
            value: `${stats.avgQualityScore.toFixed(1)}/10 quality`,
            positive: stats.avgQualityScore >= 6,
          }}
        />
        <StatCard
          title="Complications"
          value={String(stats.complicated + stats.deceased)}
          icon={Heartbeat}
          description={`${stats.deceased} deceased · ${stats.complicated} with complications`}
          hint="Total patients with non-clean outcomes."
          accent={stats.deceased > 0 ? "danger" : "warning"}
        />
      </div>

      {/* Row 2: Outcome Distribution + Cost Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Outcome Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <ChartBar size={16} className="text-primary" />
              Outcome Distribution
            </CardTitle>
            <CardDescription className="text-xs">
              How patient cases resolved. Each bar shows count and percentage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <OutcomeBar count={stats.healed} total={stats.total} status="HEALED" />
              <OutcomeBar count={stats.complicated} total={stats.total} status="HEALED_WITH_COMPLICATIONS" />
              <OutcomeBar count={stats.deceased} total={stats.total} status="DECEASED" />
            </div>

            {/* Triage breakdown mini-bar */}
            <div className="mt-4 pt-4 border-t">
              <p className="text-[10px] font-medium text-muted-foreground mb-2">Triage Distribution</p>
              <div className="flex gap-1 h-5 w-full rounded-full overflow-hidden">
                {(["RED", "ORANGE", "YELLOW", "GREEN"] as const).map((code) => {
                  const count = stats.triageDistribution[code] || 0;
                  const pct = stats.total ? (count / stats.total) * 100 : 0;
                  const colors = {
                    RED: "bg-red-500",
                    ORANGE: "bg-orange-500",
                    YELLOW: "bg-yellow-400",
                    GREEN: "bg-emerald-500",
                  };
                  if (pct === 0) return null;
                  return (
                    <div
                      key={code}
                      className={`${colors[code]} flex items-center justify-center text-[9px] font-bold text-white transition-all`}
                      style={{ width: `${pct}%` }}
                      title={`${code}: ${count} (${pct.toFixed(0)}%)`}
                    >
                      {pct >= 10 ? count : ""}
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
                {(["RED", "ORANGE", "YELLOW", "GREEN"] as const).map((code) => (
                  <span key={code}>
                    {code}: {stats.triageDistribution[code] || 0}
                  </span>
                ))}
              </div>
            </div>

            {/* Risk distribution */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-medium text-muted-foreground">Risk Distribution</p>
                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[9px]">
                  Avg readmission risk: {formatRiskPercentage(stats.avgReadmissionRisk)}
                </Badge>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {(["critical", "high", "moderate", "low"] as const).map((level) => {
                  const colors = {
                    critical: "bg-red-500/15 text-red-600 dark:text-red-400",
                    high: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
                    moderate: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                    low: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                  };
                  return (
                    <div
                      key={level}
                      className={`rounded-lg p-2 text-center ${colors[level]}`}
                    >
                      <p className="text-lg font-bold">{stats.riskDistribution[level]}</p>
                      <p className="text-[9px] capitalize">{level}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cost Breakdown Donut */}
        <CostBreakdownSummary breakdown={stats.costBreakdown} />
      </div>

      {/* Row 3: Risk Heatmap */}
      <RiskHeatmap patients={patients} />

      {/* Row 4: Department Load + Critical Alerts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DepartmentLoadChart departments={stats.departmentLoad} totalPatients={stats.total} />
        <CriticalAlertsWidget alerts={stats.criticalAlerts} />
      </div>

      {/* Row 5: Top Diagnoses + Activity Feed */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Diagnosis distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <FirstAid size={16} />
              Top Diagnoses
            </CardTitle>
            <CardDescription className="text-xs">
              Most frequent primary diagnoses at admission. Bar length is relative to the most common diagnosis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.diagnosisDistribution.map(([name, count]) => (
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

        {/* Activity Feed */}
        <ActivityFeed admissions={stats.recentAdmissions} />
      </div>
    </div>
  );
}

function OutcomeBar({
  count,
  total,
  status,
}: {
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
      <div className="flex justify-between">
        <div>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="mt-1 h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
      <Skeleton className="h-48 rounded-lg" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  );
}

