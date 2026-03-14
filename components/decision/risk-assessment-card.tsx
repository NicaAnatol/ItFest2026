"use client";

import type { RiskAssessment } from "@/lib/types/decision";
import { RiskGauge } from "./risk-gauge";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  getRiskLevel,
  getRiskBgColor,
  formatRiskPercentage,
  formatDiagnosisName,
} from "@/lib/utils/format";
import { ShieldWarning, Warning } from "@phosphor-icons/react";

interface RiskAssessmentCardProps {
  risk: RiskAssessment;
}

export function RiskAssessmentCard({ risk }: RiskAssessmentCardProps) {
  const mortalityLevel = getRiskLevel(risk.mortality_risk.total);
  const compLevel = getRiskLevel(risk.complication_risk.overall);

  return (
    <div className="space-y-4">
      {/* Mortality Risk */}
      <div className="flex items-start gap-4">
        <RiskGauge value={risk.mortality_risk.total} size={80} label="Mortality" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldWarning size={16} className="text-muted-foreground" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Mortality Risk
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-[10px] text-muted-foreground">Baseline</p>
              <p className="font-mono font-medium">{formatRiskPercentage(risk.mortality_risk.baseline)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">From Decision</p>
              <p className="font-mono font-medium">{formatRiskPercentage(risk.mortality_risk.from_this_decision)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Total</p>
              <p className={`font-mono font-semibold ${getRiskBgColor(mortalityLevel)} inline-block rounded px-1`}>
                {formatRiskPercentage(risk.mortality_risk.total)}
              </p>
            </div>
          </div>
          {risk.mortality_risk.factors_contributing && (
            <div className="space-y-1">
              {risk.mortality_risk.factors_contributing.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  <div className="h-1.5 flex-1 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-red-500/60"
                      style={{ width: `${Math.min(100, f.contribution * 1000)}%` }}
                    />
                  </div>
                  <span className="w-20 truncate text-muted-foreground">
                    {f.factor.replace(/_/g, " ")}
                  </span>
                  <span className="w-10 text-right font-mono">
                    {formatRiskPercentage(f.contribution)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Complication Risk */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Warning size={16} className="text-muted-foreground" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Complication Risk
          </span>
          <Badge className={getRiskBgColor(compLevel) + " text-[10px]"}>
            {formatRiskPercentage(risk.complication_risk.overall)}
          </Badge>
        </div>
        {risk.complication_risk.breakdown && (
          <div className="flex gap-3 text-xs">
            <span>Minor: {formatRiskPercentage(risk.complication_risk.breakdown.minor)}</span>
            <span>Moderate: {formatRiskPercentage(risk.complication_risk.breakdown.moderate)}</span>
            <span>Severe: {formatRiskPercentage(risk.complication_risk.breakdown.severe)}</span>
          </div>
        )}
      </div>

      {/* Top Potential Complications */}
      {risk.potential_complications.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Potential Complications ({risk.potential_complications.length})
          </p>
          <div className="space-y-1.5">
            {risk.potential_complications.slice(0, 4).map((c, i) => {
              const level = getRiskLevel(c.probability);
              return (
                <div key={i} className="flex items-center gap-2 rounded border border-border/50 p-2 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{formatDiagnosisName(c.complication_type)}</p>
                    <div className="mt-0.5 flex items-center gap-1">
                      <Progress value={c.probability * 100} className="h-1 flex-1" />
                      <span className={`font-mono text-[10px] ${getRiskBgColor(level)} rounded px-1`}>
                        {formatRiskPercentage(c.probability)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-muted-foreground">
                    <p>if occurs:</p>
                    <p className="font-mono">{formatRiskPercentage(c.mortality_if_occurs)} fatal</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

