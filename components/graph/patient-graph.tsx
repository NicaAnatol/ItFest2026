"use client";

import { useState, useRef, useEffect } from "react";
import type { PatientNode, PatientEdge } from "@/lib/types/patient";
import { GraphNode } from "./graph-node";
import { GraphEdge } from "./graph-edge";
import {
  getDepartmentColor,
  getDepartmentLabel,
  formatDuration,
} from "@/lib/utils/format";

interface PatientGraphProps {
  nodes: PatientNode[];
  edges: PatientEdge[];
  selectedNodeId?: string | null;
  onNodeClick?: (node: PatientNode) => void;
}

/**
 * Approximate px occupied by one node cell (GraphNode ≈ 100 + GraphEdge ≈ 48).
 * Used to compute how many nodes fit per row before wrapping.
 */
const NODE_CELL_W = 140;
const MIN_PER_ROW = 2;

export function PatientGraphView({
  nodes,
  edges,
  selectedNodeId,
  onNodeClick,
}: PatientGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [perRow, setPerRow] = useState(6);

  const sorted = [...nodes].sort((a, b) => a.sequence - b.sequence);

  // ── Responsive: compute how many nodes fit per row ──────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setPerRow(Math.max(MIN_PER_ROW, Math.floor(w / NODE_CELL_W)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Split nodes into rows ──────────────────────────────────────────
  const rows: PatientNode[][] = [];
  for (let i = 0; i < sorted.length; i += perRow) {
    rows.push(sorted.slice(i, i + perRow));
  }

  // ── Edge lookup ────────────────────────────────────────────────────
  const edgeMap = new Map<string, PatientEdge>();
  for (const e of edges) {
    edgeMap.set(`${e.from}->${e.to}`, e);
  }

  // ── Unique departments for legend ──────────────────────────────────
  const deptSet = new Set<string>();
  const deptLegend: Array<{ deptId: string; deptName: string }> = [];
  for (const n of sorted) {
    const id = n.logistics.location.department.id;
    if (!deptSet.has(id)) {
      deptSet.add(id);
      deptLegend.push({
        deptId: id,
        deptName: n.logistics.location.department.name,
      });
    }
  }

  return (
    <div ref={containerRef} className="space-y-3">
      {/* ── Department legend ─────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {deptLegend.map((g) => (
          <div
            key={g.deptId}
            className="flex items-center gap-1.5 text-xs"
          >
            <div
              className={`h-2.5 w-2.5 rounded-full ${getDepartmentColor(g.deptId)}`}
            />
            <span className="text-muted-foreground">
              {getDepartmentLabel(g.deptName)}
            </span>
          </div>
        ))}
      </div>

      {/* ── Snake graph ───────────────────────────────────────────── */}
      <div>
        {rows.map((row, rowIdx) => {
          const isReversed = rowIdx % 2 === 1;
          const isLastRow = rowIdx === rows.length - 1;

          // Display order: reversed for odd rows so flow goes R→L
          const displayNodes = isReversed ? [...row].reverse() : row;

          // U-turn edge between last logical node of this row →
          // first logical node of the next row.
          const turnEdge =
            !isLastRow && rows[rowIdx + 1]?.[0]
              ? edgeMap.get(
                  `${row[row.length - 1].node_id}->${rows[rowIdx + 1][0].node_id}`,
                )
              : undefined;

          return (
            <div key={rowIdx}>
              {/* ── Row of nodes ──────────────────────────────────── */}
              <div
                className={`flex items-center gap-0 py-2 ${
                  isReversed ? "justify-end" : "justify-start"
                }`}
              >
                {displayNodes.map((node, i) => {
                  const nextDisplay = displayNodes[i + 1];

                  // Look up the logical edge between consecutive nodes.
                  // In reversed rows the display order is flipped so
                  // from/to must be swapped.
                  let edge: PatientEdge | undefined;
                  if (nextDisplay) {
                    const from = isReversed
                      ? nextDisplay.node_id
                      : node.node_id;
                    const to = isReversed
                      ? node.node_id
                      : nextDisplay.node_id;
                    edge = edgeMap.get(`${from}->${to}`);
                  }

                  return (
                    <div key={node.node_id} className="flex items-center">
                      <GraphNode
                        node={node}
                        isSelected={selectedNodeId === node.node_id}
                        onClick={onNodeClick}
                      />
                      {edge && (
                        <GraphEdge
                          type={edge.type}
                          durationSeconds={edge.time_elapsed_seconds}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ── U-turn connector to next row ──────────────────── */}
              {!isLastRow && (
                <div
                  className={`flex ${
                    isReversed
                      ? "justify-start pl-10"
                      : "justify-end pr-10"
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <svg
                      width="24"
                      height="28"
                      viewBox="0 0 24 28"
                      className="text-border"
                    >
                      {/* Dashed vertical line */}
                      <line
                        x1="12"
                        y1="0"
                        x2="12"
                        y2="28"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray="4 3"
                      />
                      {/* Downward arrow */}
                      <path
                        d="M 7 22 L 12 28 L 17 22"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {turnEdge?.time_elapsed_seconds != null &&
                      turnEdge.time_elapsed_seconds > 0 && (
                        <span className="text-[8px] font-mono text-muted-foreground">
                          {formatDuration(turnEdge.time_elapsed_seconds)}
                        </span>
                      )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
