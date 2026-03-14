"use client";

import type { TriageCode } from "@/lib/types/patient";
import { Badge } from "@/components/ui/badge";
import { getTriageColor } from "@/lib/utils/format";

interface TriageBadgeProps {
  code: TriageCode;
  size?: "sm" | "md";
}

export function TriageBadge({ code, size = "sm" }: TriageBadgeProps) {
  return (
    <Badge
      className={`font-bold ${getTriageColor(code)} ${
        size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"
      }`}
    >
      {code}
    </Badge>
  );
}

