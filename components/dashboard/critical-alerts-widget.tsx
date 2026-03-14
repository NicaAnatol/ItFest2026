"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import Link from "next/link";
import { Warning, ShieldWarning, ArrowRight } from "@phosphor-icons/react";
import type { CriticalAlert } from "@/lib/data/dashboard-stats";
import {
  formatDiagnosisName,
  formatRiskPercentage,
  getRiskLevel,
  getRiskBgColor,
  getDepartmentLabel,
} from "@/lib/utils/format";

interface CriticalAlertsWidgetProps {
  alerts: CriticalAlert[];
}

export function CriticalAlertsWidget({ alerts }: CriticalAlertsWidgetProps) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <ShieldWarning size={16} weight="fill" className="text-emerald-500" />
            Critical Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">No critical alerts — all clear.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <ShieldWarning size={16} weight="fill" className="text-red-500" />
            Critical Alerts
          </CardTitle>
          <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 text-[10px]">
            {alerts.length} active
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Highest-risk clinical flags across all patients, sorted by mortality risk.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.slice(0, 6).map((alert, i) => (
          <Link
            key={`${alert.patientId}-${alert.flag.flag_id}-${i}`}
            href={`/dashboard/patients/${alert.patientId}`}
            className="group"
          >
            <div className="flex items-start gap-3 rounded-lg border border-transparent p-2 transition-all hover:border-border hover:bg-muted/50">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500/15">
                <Warning size={14} weight="fill" className="text-red-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold truncate group-hover:text-primary">
                    {alert.patientName}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        className={`text-[9px] shrink-0 ${getRiskBgColor(getRiskLevel(alert.mortalityRisk))}`}
                      >
                        {formatRiskPercentage(alert.mortalityRisk)}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Mortality risk at flagged node
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {alert.flag.message}
                </p>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{formatDiagnosisName(alert.diagnosis)}</span>
                  <span>·</span>
                  <span>{getDepartmentLabel(alert.department)}</span>
                </div>
              </div>
              <ArrowRight
                size={14}
                className="mt-1 shrink-0 text-muted-foreground/0 transition-all group-hover:text-muted-foreground"
              />
            </div>
          </Link>
        ))}
        {alerts.length > 6 && (
          <Link
            href="/dashboard/alerts"
            className="block text-center text-xs text-primary hover:underline pt-1"
          >
            View all {alerts.length} alerts →
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

