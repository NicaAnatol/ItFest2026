"use client";

import type { Flag } from "@/lib/types/historical";
import { Badge } from "@/components/ui/badge";
import { getFlagSeverityColor, formatRiskPercentage } from "@/lib/utils/format";
import {
  Warning,
  WarningCircle,
  Info,
  ShieldCheck,
  Lightbulb,
} from "@phosphor-icons/react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CaretDown } from "@phosphor-icons/react";

const severityIcons: Record<string, React.ElementType> = {
  CRITICAL: Warning,
  WARNING: WarningCircle,
  INFO: Info,
};

interface AiFlagProps {
  flag: Flag;
  defaultOpen?: boolean;
}

export function AiFlag({ flag, defaultOpen = false }: AiFlagProps) {
  const Icon = severityIcons[flag.severity] ?? Info;

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <div className={`rounded-lg border p-3 ${getFlagSeverityColor(flag.severity)}`}>
        <CollapsibleTrigger className="flex w-full items-start gap-2 text-left">
          <Icon size={16} weight="fill" className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px]">
                {flag.type.replace(/_/g, " ")}
              </Badge>
              <Badge variant="outline" className="text-[9px]">
                {flag.severity}
              </Badge>
            </div>
            <p className="mt-1 text-xs font-medium">{flag.message}</p>
          </div>
          <CaretDown size={14} className="mt-1 shrink-0 transition-transform [[data-state=open]>&]:rotate-180" />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="mt-3 space-y-3 border-t border-current/10 pt-3">
            {/* Evidence */}
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wider opacity-70">
                Evidence
              </p>
              <div className="flex flex-wrap gap-1.5">
                {flag.evidence.similar_cases !== undefined && (
                  <Badge variant="secondary" className="text-[9px]">
                    {flag.evidence.similar_cases} similar cases
                  </Badge>
                )}
                {flag.evidence.complication_rate !== undefined && (
                  <Badge variant="secondary" className="text-[9px]">
                    Rate: {formatRiskPercentage(flag.evidence.complication_rate)}
                  </Badge>
                )}
                {flag.evidence.deaths_from_complication !== undefined && (
                  <Badge variant="secondary" className="text-[9px]">
                    {flag.evidence.deaths_from_complication} deaths
                  </Badge>
                )}
              </div>
            </div>

            {/* Patient-specific factors */}
            {flag.patient_specific_factors && flag.patient_specific_factors.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-wider opacity-70">
                  Patient-Specific Factors
                </p>
                <ul className="space-y-0.5 pl-3">
                  {flag.patient_specific_factors.map((f, i) => (
                    <li key={i} className="text-[10px] list-disc">{f.replace(/_/g, " ")}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendation */}
            <div className="flex items-start gap-1.5 rounded-md bg-background/50 p-2">
              <Lightbulb size={14} className="mt-0.5 shrink-0" weight="bold" />
              <div>
                <p className="text-[10px] font-semibold">
                  {flag.recommendation.action.replace(/_/g, " ")}
                </p>
                {flag.recommendation.message && (
                  <p className="text-[10px] opacity-70">{flag.recommendation.message}</p>
                )}
              </div>
            </div>

            {/* Alternative */}
            {flag.alternative_if_unacceptable && (
              <div className="rounded-md bg-background/50 p-2 space-y-1">
                <p className="text-[10px] font-semibold flex items-center gap-1">
                  <ShieldCheck size={12} />
                  Safer Alternative: {flag.alternative_if_unacceptable.option.replace(/_/g, " ")}
                </p>
                <p className="text-[10px]">
                  ✓ {flag.alternative_if_unacceptable.advantage.replace(/_/g, " ")}
                </p>
                <p className="text-[10px] opacity-70">
                  ✗ {flag.alternative_if_unacceptable.disadvantage.replace(/_/g, " ")}
                </p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

