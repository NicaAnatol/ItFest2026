"use client";

import type { OutcomeStatus } from "@/lib/types/patient";
import { Badge } from "@/components/ui/badge";
import { getOutcomeColor, getOutcomeLabel } from "@/lib/utils/format";
import { CheckCircle, Warning, Skull } from "@phosphor-icons/react";

const iconMap: Record<OutcomeStatus, React.ElementType> = {
  HEALED: CheckCircle,
  HEALED_WITH_COMPLICATIONS: Warning,
  DECEASED: Skull,
};

interface OutcomeBadgeProps {
  status: OutcomeStatus;
  size?: "sm" | "md";
  showIcon?: boolean;
}

export function OutcomeBadge({ status, size = "sm", showIcon = true }: OutcomeBadgeProps) {
  const Icon = iconMap[status] ?? CheckCircle;
  const iconSize = size === "sm" ? 14 : 16;

  return (
    <Badge
      variant="outline"
      className={`gap-1 border-0 font-medium ${getOutcomeColor(status)} ${
        size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"
      }`}
    >
      {showIcon && <Icon size={iconSize} weight="fill" />}
      {getOutcomeLabel(status)}
    </Badge>
  );
}

