"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, TrendUp, TrendDown } from "@phosphor-icons/react";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  description: string;
  hint?: string;
  trend?: { value: string; positive: boolean } | null;
  accent?: "default" | "success" | "warning" | "danger";
}

const accentStyles = {
  default: "border-l-primary/40",
  success: "border-l-emerald-500/60",
  warning: "border-l-amber-500/60",
  danger: "border-l-red-500/60",
};

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  hint,
  trend,
  accent = "default",
}: StatCardProps) {
  return (
    <Card className={`border-l-3 ${accentStyles[accent]} transition-shadow hover:shadow-md`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <div className="flex items-center gap-1">
            {hint && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  >
                    <Info size={13} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-64 text-xs">
                  {hint}
                </TooltipContent>
              </Tooltip>
            )}
            <Icon size={18} className="text-muted-foreground" />
          </div>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <p className="text-2xl font-bold">{value}</p>
          {trend && (
            <span
              className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${
                trend.positive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {trend.positive ? <TrendUp size={12} weight="bold" /> : <TrendDown size={12} weight="bold" />}
              {trend.value}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[10px] text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

