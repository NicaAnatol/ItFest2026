"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CurrencyEur } from "@phosphor-icons/react";
import { formatCurrency } from "@/lib/utils/format";

interface CostBreakdownSummaryProps {
  breakdown: {
    personnel: number;
    investigations: number;
    procedures: number;
    medications: number;
    hospitalization: number;
    equipment: number;
  };
}

const CATEGORIES = [
  { key: "hospitalization", label: "Hospitalization", color: "var(--chart-1)" },
  { key: "personnel", label: "Personnel", color: "var(--chart-2)" },
  { key: "procedures", label: "Procedures", color: "var(--chart-3)" },
  { key: "medications", label: "Medications", color: "var(--chart-4)" },
  { key: "investigations", label: "Investigations", color: "var(--chart-5)" },
  { key: "equipment", label: "Equipment", color: "oklch(0.70 0.12 200)" },
] as const;

export function CostBreakdownSummary({ breakdown }: CostBreakdownSummaryProps) {
  const total = useMemo(
    () => Object.values(breakdown).reduce((s, v) => s + v, 0),
    [breakdown],
  );

  const segments = useMemo(() => {
    const mapped = CATEGORIES.map((cat) => {
      const value = breakdown[cat.key];
      const pct = total > 0 ? (value / total) * 100 : 0;
      return { ...cat, value, pct };
    });
    return [...mapped].sort((a, b) => b.value - a.value);
  }, [breakdown, total]);

  // SVG donut ring
  const size = 140;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Build arcs with cumulative offsets
  const arcs = useMemo(() => {
    // Use sorted-by-value order for the legend but original order for the donut
    const ordered = CATEGORIES.map((cat) => {
      const value = breakdown[cat.key];
      const pct = total > 0 ? (value / total) * 100 : 0;
      const dashLength = (pct / 100) * circumference;
      return { ...cat, value, pct, dashLength };
    });
    // Compute cumulative offsets from preceding dash lengths
    return ordered.map((seg, i) => {
      const dashOffset = -ordered
        .slice(0, i)
        .reduce((sum, s) => sum + s.dashLength, 0);
      return { ...seg, dashOffset };
    });
  }, [breakdown, total, circumference]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-1.5">
          <CurrencyEur size={16} weight="fill" className="text-primary" />
          Cost Breakdown
        </CardTitle>
        <CardDescription className="text-xs">
          Hospital-wide cost distribution across 6 categories.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Donut */}
          <div className="relative shrink-0">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              {/* Background ring */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--muted)"
                strokeWidth={strokeWidth}
              />
              {/* Segment arcs */}
              {arcs.map((arc) => (
                <Tooltip key={arc.key}>
                  <TooltipTrigger asChild>
                    <circle
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      fill="none"
                      stroke={arc.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={`${arc.dashLength} ${circumference - arc.dashLength}`}
                      strokeDashoffset={arc.dashOffset}
                      strokeLinecap="butt"
                      transform={`rotate(-90 ${size / 2} ${size / 2})`}
                      className="transition-opacity hover:opacity-80 cursor-default"
                    />
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    <p className="font-semibold">{arc.label}</p>
                    <p>{formatCurrency(Math.round(arc.value))} ({arc.pct.toFixed(1)}%)</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] text-muted-foreground">Total</span>
              <span className="text-sm font-bold">{formatCurrency(Math.round(total))}</span>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-1.5 flex-1 min-w-0">
            {segments.map((seg) => (
              <div key={seg.key} className="flex items-center gap-2 text-[11px]">
                <div
                  className="h-2.5 w-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="truncate text-muted-foreground flex-1">{seg.label}</span>
                <span className="font-mono shrink-0">{seg.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

