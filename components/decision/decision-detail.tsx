"use client";

import type { Decision } from "@/lib/types/decision";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  formatActionName,
} from "@/lib/utils/format";
import {
  User,
  Lightbulb,
  ListChecks,
  Pill,
  Stethoscope,
  ArrowsLeftRight,
  Heartbeat,
} from "@phosphor-icons/react";

const orderTypeIcons: Record<string, React.ElementType> = {
  laboratory: Stethoscope,
  imaging: Stethoscope,
  medication: Pill,
  monitoring: Heartbeat,
  transfer: ArrowsLeftRight,
};

interface DecisionDetailProps {
  decision: Decision;
}

export function DecisionDetail({ decision }: DecisionDetailProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Badge>{decision.action_category}</Badge>
          <h4 className="text-sm font-semibold">
            {formatActionName(decision.action)}
          </h4>
        </div>
      </div>

      {/* Decision maker */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <User size={14} />
        <span className="font-medium text-foreground">{decision.made_by.name}</span>
        <span>·</span>
        <span>{decision.made_by.specialty?.replace(/_/g, " ")}</span>
        <span>·</span>
        <span>{decision.made_by.experience_years}y exp</span>
        <span>·</span>
        <span>Confidence: {(decision.made_by.decision_confidence * 100).toFixed(0)}%</span>
      </div>

      <Separator />

      {/* Reasoning */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Lightbulb size={14} />
          Reasoning
        </div>
        <p className="text-xs">{decision.reasoning.primary_reason}</p>
        {decision.reasoning.supporting_evidence.length > 0 && (
          <ul className="space-y-1 pl-4">
            {decision.reasoning.supporting_evidence.map((e, i) => (
              <li key={i} className="text-xs text-muted-foreground list-disc">
                {e}
              </li>
            ))}
          </ul>
        )}
        {decision.reasoning.guidelines_followed.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {decision.reasoning.guidelines_followed.map((g, i) => (
              <Badge key={i} variant="outline" className="text-[10px]">
                {g}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Orders */}
      {decision.orders.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <ListChecks size={14} />
            Orders ({decision.orders.length})
          </div>
          <div className="space-y-2">
            {decision.orders.map((order) => {
              const OrderIcon = orderTypeIcons[order.type] ?? ListChecks;
              return (
                <div
                  key={order.order_id}
                  className="flex items-start gap-2 rounded-md border border-border/50 bg-muted/30 p-2"
                >
                  <OrderIcon size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[9px]">
                        {order.type}
                      </Badge>
                      {order.urgency && (
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${
                            order.urgency === "stat" || order.urgency === "immediate"
                              ? "border-red-500/30 text-red-500"
                              : ""
                          }`}
                        >
                          {order.urgency}
                        </Badge>
                      )}
                    </div>
                    {order.tests && (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {order.tests.join(", ")}
                      </p>
                    )}
                    {order.medication && (
                      <p className="mt-1 text-[10px]">
                        <span className="font-medium">{order.medication.name}</span>
                        {order.medication.dose && ` · ${order.medication.dose}`}
                        {order.medication.route && ` · ${order.medication.route}`}
                      </p>
                    )}
                    {order.parameters && (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {order.parameters.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expected outcome */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Expected Outcome
        </p>
        <p className="text-xs">{decision.expected_outcome.primary.replace(/_/g, " ")}</p>
        <div className="flex flex-wrap gap-1">
          {Object.entries(decision.expected_outcome.expected_timeline).map(([k, v]) => (
            <Badge key={k} variant="secondary" className="text-[9px]">
              {k}: {v}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

