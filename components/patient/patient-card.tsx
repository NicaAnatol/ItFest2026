"use client";

import Link from "next/link";
import type { PatientGraph } from "@/lib/types/patient";
import { getPatientSummary } from "@/lib/data/analytics";
import { Card, CardContent } from "@/components/ui/card";
import { OutcomeBadge } from "./outcome-badge";
import { TriageBadge } from "./triage-badge";
import {
  formatDiagnosisName,
  formatDate,
  formatCurrency,
  formatDurationDays,
} from "@/lib/utils/format";
import {
  User,
  Calendar,
  Clock,
  CurrencyEur,
  GitBranch,
  Buildings,
  FirstAid,
} from "@phosphor-icons/react";

interface PatientCardProps {
  patient: PatientGraph;
}

export function PatientCard({ patient }: PatientCardProps) {
  const summary = getPatientSummary(patient);

  return (
    <Link href={`/dashboard/patients/${summary.patient_id}`}>
      <Card className="group cursor-pointer transition-all hover:border-primary/40 hover:shadow-md">
        <CardContent className="p-4">
          {/* Header Row */}
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-semibold group-hover:text-primary">
                  {summary.patient_name}
                </h3>
                <TriageBadge code={summary.triage_code} />
              </div>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                {summary.patient_id}
              </p>
            </div>
            <OutcomeBadge status={summary.outcome} />
          </div>

          {/* Diagnosis */}
          <div className="mb-3 flex items-center gap-1.5 text-xs">
            <FirstAid size={12} className="shrink-0 text-primary" weight="bold" />
            <span className="truncate font-medium">
              {formatDiagnosisName(summary.primary_diagnosis)}
            </span>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <User size={12} />
              <span>
                {summary.age}y {summary.gender}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar size={12} />
              <span>{formatDate(summary.admission_date)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={12} />
              <span>LOS: {formatDurationDays(summary.los_days)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CurrencyEur size={12} />
              <span>{formatCurrency(summary.total_cost_eur)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <GitBranch size={12} />
              <span>{summary.total_nodes} nodes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Buildings size={12} />
              <span>{summary.total_departments} depts</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

