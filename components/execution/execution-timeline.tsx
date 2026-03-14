"use client";

import type { Execution } from "@/lib/types/execution";
import { Badge } from "@/components/ui/badge";
import { Clock, Warning, XCircle } from "@phosphor-icons/react";

interface ExecutionTimelineProps {
  execution: Execution;
}

export function ExecutionTimeline({ execution }: ExecutionTimelineProps) {
  const events = execution.events ?? [];
  const delays = execution.delays ?? [];
  const blockers = execution.blockers ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Clock size={14} />
          Execution ({execution.duration.total})
        </div>
        <Badge variant={execution.status === "completed" ? "secondary" : "destructive"} className="text-[9px]">
          {execution.status}
        </Badge>
      </div>

      {/* Events timeline */}
      {events.length > 0 && (
        <div className="relative space-y-0">
          <div className="absolute left-[52px] top-0 bottom-0 w-px bg-border" />

          {events.map((event, i) => (
            <div key={i} className="relative flex items-start gap-2 py-1.5">
              <span className="w-[44px] shrink-0 text-right font-mono text-[9px] text-muted-foreground">
                {event.timestamp}
              </span>
              <div className="relative mt-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium">
                  {event.event.replace(/_/g, " ")}
                </p>
                {event.details && (
                  <p className="text-[9px] text-muted-foreground">{event.details}</p>
                )}
                {event.result && (
                  <p className="text-[9px] text-muted-foreground">Result: {event.result.replace(/_/g, " ")}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delays */}
      {delays.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-amber-500">
            Delays ({delays.length})
          </p>
          {delays.map((d, i) => (
            <div key={i} className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-[10px]">
              <Warning size={12} className="mt-0.5 shrink-0 text-amber-500" />
              <div>
                <p className="font-medium">{d.delay_type}: {d.duration}</p>
                <p className="text-muted-foreground">{d.reason}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Blockers */}
      {blockers.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-red-500">
            Blockers ({blockers.length})
          </p>
          {blockers.map((b, i) => (
            <div key={i} className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/5 p-2 text-[10px]">
              <XCircle size={12} className="mt-0.5 shrink-0 text-red-500" />
              <div>
                <p className="font-medium">{b.blocker_type}: {b.description}</p>
                <p className="text-muted-foreground">Resolution: {b.resolution}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

