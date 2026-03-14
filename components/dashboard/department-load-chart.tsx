"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Buildings } from "@phosphor-icons/react";
import type { DeptLoadEntry } from "@/lib/data/dashboard-stats";
import { formatCurrency, getDepartmentColor, getDepartmentLabel } from "@/lib/utils/format";

interface DepartmentLoadChartProps {
  departments: DeptLoadEntry[];
  totalPatients: number;
}

export function DepartmentLoadChart({ departments, totalPatients }: DepartmentLoadChartProps) {
  const maxPatients = Math.max(...departments.map((d) => d.patientCount), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-1.5">
          <Buildings size={16} weight="fill" className="text-primary" />
          Department Load
        </CardTitle>
        <CardDescription className="text-xs">
          Patient volume and cost per department. Bar shows relative patient count.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {departments.slice(0, 8).map((dept) => {
          const pct = (dept.patientCount / maxPatients) * 100;
          const utilPct = Math.round(dept.avgUtilization * 100);
          const isHigh = utilPct >= 85;
          const isMed = utilPct >= 70;

          return (
            <Tooltip key={dept.departmentId}>
              <TooltipTrigger asChild>
                <div className="group cursor-default space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`h-2.5 w-2.5 rounded-sm shrink-0 ${getDepartmentColor(dept.departmentId)}`}
                      />
                      <span className="truncate text-muted-foreground">
                        {getDepartmentLabel(dept.departmentName)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {dept.patientCount} pts
                      </span>
                      {utilPct > 0 && (
                        <Badge
                          className={`text-[9px] ${
                            isHigh
                              ? "bg-red-500/15 text-red-600 dark:text-red-400"
                              : isMed
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {utilPct}%
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${getDepartmentColor(dept.departmentId)} opacity-70`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs space-y-1">
                <p className="font-semibold">{getDepartmentLabel(dept.departmentName)}</p>
                <p>{dept.patientCount} patients ({Math.round((dept.patientCount / totalPatients) * 100)}% of total)</p>
                <p>Total cost: {formatCurrency(Math.round(dept.totalCost))}</p>
                <p>{dept.nodeCount} clinical nodes</p>
                {utilPct > 0 && <p>Avg bed utilization: {utilPct}%</p>}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </CardContent>
    </Card>
  );
}

