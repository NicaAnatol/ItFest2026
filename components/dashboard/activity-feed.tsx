"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { TriageBadge } from "@/components/patient/triage-badge";
import { OutcomeBadge } from "@/components/patient/outcome-badge";
import { ClockCounterClockwise, ArrowRight } from "@phosphor-icons/react";
import type { RecentAdmission } from "@/lib/data/dashboard-stats";
import type { OutcomeStatus, TriageCode } from "@/lib/types/patient";
import { formatDiagnosisName } from "@/lib/utils/format";

interface ActivityFeedProps {
  admissions: RecentAdmission[];
}

function timeAgo(iso: string): string {
  const now = new Date();
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 365) return `${Math.floor(diffDays / 365)}y ago`;
  if (diffDays > 30) return `${Math.floor(diffDays / 30)}mo ago`;
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  return "just now";
}

export function ActivityFeed({ admissions }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <ClockCounterClockwise size={16} weight="fill" className="text-primary" />
            Recent Activity
          </CardTitle>
          <Link
            href="/dashboard/patients"
            className="text-xs text-primary hover:underline"
          >
            View all →
          </Link>
        </div>
        <CardDescription className="text-xs">
          Latest patient admissions — click to explore their clinical journey.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {admissions.map((a) => (
          <Link
            key={a.patientId}
            href={`/dashboard/patients/${a.patientId}`}
            className="group"
          >
            <div className="flex items-center gap-3 rounded-lg p-2 transition-all hover:bg-muted/50">
              {/* Timeline dot */}
              <div className="flex flex-col items-center shrink-0">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <div className="mt-1 h-6 w-px bg-border" />
              </div>
              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold truncate group-hover:text-primary">
                    {a.patientName}
                  </span>
                  <TriageBadge code={a.triageCode as TriageCode} size="sm" />
                  <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
                    {timeAgo(a.timestamp)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="truncate">{a.chiefComplaint}</span>
                  <span className="shrink-0">·</span>
                  <span className="shrink-0">{formatDiagnosisName(a.diagnosis)}</span>
                </div>
              </div>
              <OutcomeBadge status={a.outcome as OutcomeStatus} size="sm" />
              <ArrowRight
                size={12}
                className="shrink-0 text-muted-foreground/0 transition-all group-hover:text-muted-foreground"
              />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

