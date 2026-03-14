"use client";

import type { Flag } from "@/lib/types/historical";
import { AiFlag } from "./ai-flag";
import { countFlagsBySeverity } from "@/lib/decision/decision-utils";
import { Badge } from "@/components/ui/badge";

interface FlagListProps {
  flags: Flag[];
}

export function FlagList({ flags }: FlagListProps) {
  if (!flags.length) {
    return (
      <p className="text-xs text-muted-foreground italic">No AI flags for this decision.</p>
    );
  }

  // Sort: CRITICAL → WARNING → INFO
  const sortedFlags = [...flags].sort((a, b) => {
    const order: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  });

  const counts = countFlagsBySeverity(flags);

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          AI Flags ({flags.length})
        </span>
        {counts.critical > 0 && (
          <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 text-[9px]">
            {counts.critical} critical
          </Badge>
        )}
        {counts.warning > 0 && (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[9px]">
            {counts.warning} warning
          </Badge>
        )}
        {counts.info > 0 && (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 text-[9px]">
            {counts.info} info
          </Badge>
        )}
      </div>

      {/* Flag list */}
      <div className="space-y-2">
        {sortedFlags.map((flag) => (
          <AiFlag
            key={flag.flag_id}
            flag={flag}
            defaultOpen={flag.severity === "CRITICAL"}
          />
        ))}
      </div>
    </div>
  );
}

