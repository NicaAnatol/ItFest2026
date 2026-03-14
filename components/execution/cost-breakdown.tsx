"use client";

import type { CostBreakdown } from "@/lib/types/execution";
import { formatCurrency } from "@/lib/utils/format";
import { CurrencyEur } from "@phosphor-icons/react";

interface CostBreakdownProps {
  cost: CostBreakdown;
}

const COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-purple-500",
  "bg-rose-500",
  "bg-cyan-500",
];

export function CostBreakdownChart({ cost }: CostBreakdownProps) {
  const items = [
    { label: "Personnel", value: cost.personnel, color: COLORS[0] },
    { label: "Medications", value: cost.medications, color: COLORS[1] },
    { label: "Equipment", value: cost.equipment, color: COLORS[2] },
    { label: "Consumables", value: cost.consumables, color: COLORS[3] },
    ...(cost.investigations ? [{ label: "Investigations", value: cost.investigations, color: COLORS[4] }] : []),
    ...(cost.procedures ? [{ label: "Procedures", value: cost.procedures, color: COLORS[5] }] : []),
  ].filter((i) => i.value > 0);

  const total = cost.total;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <CurrencyEur size={14} />
          Cost Breakdown
        </div>
        <span className="text-sm font-bold">{formatCurrency(total)}</span>
      </div>

      {/* Stacked bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {items.map((item) => (
          <div
            key={item.label}
            className={`${item.color} transition-all`}
            style={{ width: `${(item.value / total) * 100}%` }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
              <span className="text-muted-foreground">{item.label}</span>
            </div>
            <span className="font-mono">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

