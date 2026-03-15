"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatRiskPercentage } from "@/lib/utils/format";
import {
  Warning,
  CheckCircle,
  CaretDown,
  ShieldCheck,
} from "@phosphor-icons/react";

interface AiAlertBannerProps {
  baselineRisk: number;
  adjustedRisk: number;
  recommendation: "PROCEED" | "CAUTION" | "ALTERNATIVE";
  message: string;
  details?: string;
  alternativeLabel?: string;
  alternativeRisk?: number;
}

export function AiAlertBanner({
  baselineRisk,
  adjustedRisk,
  recommendation,
  message,
  details,
  alternativeLabel,
  alternativeRisk,
}: AiAlertBannerProps) {
  const bgColor =
    recommendation === "ALTERNATIVE"
      ? "bg-red-500/10 border-red-500/30"
      : recommendation === "CAUTION"
        ? "bg-amber-500/10 border-amber-500/30"
        : "bg-emerald-500/10 border-emerald-500/30";

  const RecIcon =
    recommendation === "ALTERNATIVE"
      ? Warning
      : recommendation === "CAUTION"
        ? Warning
        : CheckCircle;

  return (
    <Collapsible>
      <div className={`rounded-lg border p-4 ${bgColor}`}>
        <div className="flex items-start gap-3">
          <RecIcon size={20} weight="fill" className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            {/* Risk comparison */}
            <div className="flex items-center gap-2 text-sm">
              <span className="font-mono text-muted-foreground">
                {formatRiskPercentage(baselineRisk)} baseline
              </span>
              <span>→</span>
              <span className="font-mono font-bold">
                {formatRiskPercentage(adjustedRisk)} adjusted
              </span>
            </div>

            {/* Recommendation badge */}
            <div className="mt-1.5 flex items-center gap-2">
              <Badge
                className={
                  recommendation === "PROCEED"
                    ? "bg-emerald-500/15 text-emerald-700"
                    : recommendation === "CAUTION"
                      ? "bg-amber-500/15 text-amber-700"
                      : "bg-red-500/15 text-red-700"
                }
              >
                {recommendation === "PROCEED" && "✅ PROCEED"}
                {recommendation === "CAUTION" && "⚠️ CAUTION"}
                {recommendation === "ALTERNATIVE" && "🔄 CONSIDER ALTERNATIVE"}
              </Badge>
            </div>

            <p className="mt-1.5 text-xs">{message}</p>

            {/* Alternative suggestion */}
            {alternativeLabel && alternativeRisk !== undefined && (
              <div className="mt-2 flex items-center gap-2 rounded-md bg-background/50 p-2 text-xs">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>
                  <span className="font-medium">{alternativeLabel}</span> — Risk:{" "}
                  <span className="font-mono">{formatRiskPercentage(alternativeRisk)}</span>
                </span>
              </div>
            )}
          </div>

          {details && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                <CaretDown size={14} className="transition-transform [[data-state=open]>&]:rotate-180" />
              </Button>
            </CollapsibleTrigger>
          )}
        </div>

        {details && (
          <CollapsibleContent>
            <div className="mt-3 border-t border-current/10 pt-3">
              <p className="text-xs text-muted-foreground whitespace-pre-line">{details}</p>
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}

