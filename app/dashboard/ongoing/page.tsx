"use client";

import { useOngoingPatients } from "@/hooks/use-ongoing-patients";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  HourglassMedium,
  Trash,
  ArrowRight,
  UserPlus,
  Heartbeat,
  FirstAid,
  MagnifyingGlass,
  Stethoscope,
  FlagBanner,
  Clock,
} from "@phosphor-icons/react";
import Link from "next/link";
import type { OngoingPatient } from "@/lib/ongoing/types";

function stepLabel(step: string): string {
  if (step === "admission") return "Admission";
  if (step === "triage") return "Triage";
  if (step === "diagnostic") return "Diagnosis";
  if (step === "treatment") return "Treatment";
  if (step === "summary") return "Summary";
  if (step === "outcome") return "Outcome";
  if (step.startsWith("assess-")) return `Assessment ${parseInt(step.split("-")[1], 10) + 1}`;
  if (step.startsWith("treat-")) return `Treatment ${parseInt(step.split("-")[1], 10) + 2}`;
  return step;
}

function progressColor(p: OngoingPatient): string {
  if (p.outcomeData) return "bg-amber-500/15 text-amber-600";
  if (p.assessments.length > 0) return "bg-blue-500/15 text-blue-600";
  if (p.treatmentData) return "bg-emerald-500/15 text-emerald-600";
  if (p.diagnosticData) return "bg-purple-500/15 text-purple-600";
  if (p.triageData) return "bg-orange-500/15 text-orange-600";
  return "bg-muted text-muted-foreground";
}

function nodeCount(p: OngoingPatient): number {
  let n = 0;
  if (p.treatmentData) n = 1;
  n += p.assessments.length + p.cycleTreatments.length;
  return n;
}

function triageColor(code: string): string {
  switch (code) {
    case "RED": return "bg-[var(--color-triage-red)]/15 text-[var(--color-triage-red)]";
    case "ORANGE": return "bg-[var(--color-triage-orange)]/15 text-[var(--color-triage-orange)]";
    case "YELLOW": return "bg-[var(--color-triage-yellow)]/15 text-[var(--color-triage-yellow)]";
    case "GREEN": return "bg-[var(--color-triage-green)]/15 text-[var(--color-triage-green)]";
    default: return "";
  }
}

export default function OngoingPatientsPage() {
  const { ongoingPatients, remove } = useOngoingPatients();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <HourglassMedium size={22} className="text-primary" weight="bold" />
            Ongoing Patients
          </h1>
          <p className="text-sm text-muted-foreground">
            In-progress patients awaiting further treatment or assessment. Click to continue.
          </p>
        </div>
        <Button asChild size="sm" className="gap-1.5 text-xs">
          <Link href="/dashboard/add-patient">
            <UserPlus size={14} />
            New Patient
          </Link>
        </Button>
      </div>

      {ongoingPatients.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-16">
          <HourglassMedium size={40} className="text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">
              No ongoing patients
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Start a new patient and save them as ongoing to see them here.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/dashboard/add-patient">
              <UserPlus size={14} />
              Add Patient
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ongoingPatients.map((p) => (
            <Card key={p.id} className="group relative hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Heartbeat size={14} className="text-primary shrink-0" />
                      <span className="text-sm font-bold truncate">
                        {p.admissionData?.patient_name ?? "Unnamed Patient"}
                      </span>
                    </div>
                    {p.admissionData && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 ml-5">
                        {p.admissionData.age}y / {p.admissionData.gender} · {p.admissionData.chief_complaint}
                      </p>
                    )}
                  </div>
                  {p.admissionData?.triage_code && (
                    <Badge className={`text-[9px] ${triageColor(p.admissionData.triage_code)}`}>
                      {p.admissionData.triage_code}
                    </Badge>
                  )}
                </div>

                <Separator />

                {/* Status indicators */}
                <div className="flex flex-wrap gap-1.5">
                  <Badge className={`text-[9px] ${progressColor(p)}`}>
                    {stepLabel(p.currentStep)}
                  </Badge>
                  {nodeCount(p) > 0 && (
                    <Badge variant="outline" className="text-[9px]">
                      {nodeCount(p)} node{nodeCount(p) !== 1 ? "s" : ""}
                    </Badge>
                  )}
                  {p.assessments.length > 0 && (
                    <Badge variant="outline" className="text-[9px]">
                      {p.assessments.length} assess.
                    </Badge>
                  )}
                  {p.outcomeData && (
                    <Badge className={
                      p.outcomeData.status === "HEALED" ? "bg-emerald-500/15 text-emerald-600 text-[9px]"
                      : p.outcomeData.status === "HEALED_WITH_COMPLICATIONS" ? "bg-amber-500/15 text-amber-600 text-[9px]"
                      : "bg-red-500/15 text-red-600 text-[9px]"
                    }>
                      {p.outcomeData.status.replaceAll("_", " ")}
                    </Badge>
                  )}
                </div>

                {/* Quick info row */}
                {p.diagnosticData && (
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <MagnifyingGlass size={10} />
                    <span>{p.diagnosticData.primary_name.replaceAll("_", " ")} ({p.diagnosticData.severity})</span>
                  </div>
                )}
                {p.treatmentData && (
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Stethoscope size={10} />
                    <span>{p.treatmentData.action.replaceAll("_", " ")}</span>
                  </div>
                )}

                {/* Timestamps */}
                <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                  <Clock size={10} />
                  <span>Updated {new Date(p.updatedAt).toLocaleString()}</span>
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-xs text-destructive h-7"
                    onClick={(e) => {
                      e.preventDefault();
                      if (confirm(`Remove ongoing patient "${p.admissionData?.patient_name ?? "Unnamed"}"?`)) {
                        remove(p.id);
                      }
                    }}
                  >
                    <Trash size={12} />
                    Discard
                  </Button>
                  <Button asChild size="sm" className="gap-1.5 text-xs h-7">
                    <Link href={`/dashboard/add-patient?ongoing=${p.id}`}>
                      Continue
                      <ArrowRight size={12} />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

