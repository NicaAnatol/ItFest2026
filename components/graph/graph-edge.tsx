"use client";

import { formatDuration } from "@/lib/utils/format";

interface GraphEdgeProps {
  type: string;
  durationSeconds?: number;
}

export function GraphEdge({ type, durationSeconds }: GraphEdgeProps) {
  return (
    <div className="flex flex-col items-center justify-center px-1">
      <svg width="40" height="2" className="text-border">
        <line
          x1="0" y1="1" x2="40" y2="1"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray={type === "transfer" ? "4 3" : "none"}
          className="animate-edge-draw"
        />
      </svg>
      {durationSeconds && durationSeconds > 0 && (
        <span className="mt-0.5 text-[8px] font-mono text-muted-foreground">
          {formatDuration(durationSeconds)}
        </span>
      )}
    </div>
  );
}

