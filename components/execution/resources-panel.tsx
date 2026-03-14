"use client";

import type { ResourcesConsumed } from "@/lib/types/execution";
import { formatCurrency } from "@/lib/utils/format";
import { User, Wrench, Package } from "@phosphor-icons/react";

interface ResourcesPanelProps {
  resources: ResourcesConsumed;
}

export function ResourcesPanel({ resources }: ResourcesPanelProps) {
  return (
    <div className="space-y-3">
      {/* Personnel */}
      {resources.personnel.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <User size={14} />
            Personnel ({resources.personnel.length})
          </div>
          <div className="space-y-1">
            {resources.personnel.map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-md bg-muted/30 px-2 py-1.5 text-[10px]">
                <div>
                  <span className="font-mono text-muted-foreground">{p.person_id}</span>
                  {p.activities && (
                    <span className="ml-2 text-muted-foreground">
                      ({p.activities.join(", ")})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span>{p.time_spent}</span>
                  <span className="font-mono">{formatCurrency(p.cost)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Equipment */}
      {resources.equipment.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Wrench size={14} />
            Equipment ({resources.equipment.length})
          </div>
          <div className="space-y-1">
            {resources.equipment.map((e, i) => (
              <div key={i} className="flex items-center justify-between text-[10px]">
                <span>{e.equipment}</span>
                <div className="flex items-center gap-3">
                  {e.duration && <span>{e.duration}</span>}
                  <span className="font-mono">{formatCurrency(e.cost)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consumables */}
      {resources.consumables.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Package size={14} />
            Consumables ({resources.consumables.length})
          </div>
          <div className="space-y-1">
            {resources.consumables.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-[10px]">
                <span>{c.item.replace(/_/g, " ")} ×{c.quantity}</span>
                <span className="font-mono">{formatCurrency(c.cost)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

