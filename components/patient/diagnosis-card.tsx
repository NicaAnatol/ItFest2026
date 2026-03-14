"use client";

import type { Diagnosis } from "@/lib/types/patient-state";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatDiagnosisName } from "@/lib/utils/format";
import { Stethoscope } from "@phosphor-icons/react";

interface DiagnosisCardProps {
  diagnosis: Diagnosis;
}

export function DiagnosisCard({ diagnosis }: DiagnosisCardProps) {
  const primary = diagnosis.primary;
  const differentials = diagnosis.differential_diagnosis ?? [];

  return (
    <div className="space-y-3">
      {/* Primary Diagnosis */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Stethoscope size={16} weight="bold" className="text-primary" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Primary Diagnosis
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">
            {formatDiagnosisName(primary.name)}
          </p>
          <Badge variant="outline" className="text-[10px] font-mono">
            {primary.icd10}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Progress
            value={primary.confidence * 100}
            className="h-1.5 flex-1"
          />
          <span className="text-xs text-muted-foreground">
            {(primary.confidence * 100).toFixed(0)}%
          </span>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-[10px]">
            {primary.severity}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            {primary.acuity}
          </Badge>
        </div>
      </div>

      {/* Differential Diagnoses */}
      {differentials.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Differential
          </p>
          <div className="space-y-1">
            {differentials.map((diff, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={diff.ruled_out ? "text-muted-foreground line-through" : ""}>
                      {formatDiagnosisName(diff.name)}
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {(diff.probability * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress
                    value={diff.probability * 100}
                    className="mt-0.5 h-1"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

