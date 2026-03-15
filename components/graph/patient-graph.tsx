"use client";

import type { PatientNode, PatientEdge } from "@/lib/types/patient";
import { GraphNode } from "./graph-node";
import { GraphEdge } from "./graph-edge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getDepartmentColor, getDepartmentLabel } from "@/lib/utils/format";

interface PatientGraphProps {
  nodes: PatientNode[];
  edges: PatientEdge[];
  selectedNodeId?: string | null;
  onNodeClick?: (node: PatientNode) => void;
}

export function PatientGraphView({
  nodes,
  edges,
  selectedNodeId,
  onNodeClick,
}: PatientGraphProps) {
  const sorted = [...nodes].sort((a, b) => a.sequence - b.sequence);

  // Group nodes by department for color stripes
  const deptGroups: Array<{ deptId: string; deptName: string; startIdx: number; endIdx: number }> = [];
  let currentDeptId = "";
  for (let i = 0; i < sorted.length; i++) {
    const deptId = sorted[i].logistics.location.department.id;
    if (deptId !== currentDeptId) {
      if (deptGroups.length > 0) {
        deptGroups[deptGroups.length - 1].endIdx = i - 1;
      }
      deptGroups.push({
        deptId,
        deptName: sorted[i].logistics.location.department.name,
        startIdx: i,
        endIdx: i,
      });
      currentDeptId = deptId;
    }
  }
  if (deptGroups.length > 0) {
    deptGroups[deptGroups.length - 1].endIdx = sorted.length - 1;
  }

  // Build edge lookup
  const edgeMap = new Map<string, PatientEdge>();
  for (const e of edges) {
    edgeMap.set(`${e.from}->${e.to}`, e);
  }

  return (
    <div className="space-y-3">
      {/* Department legend */}
      <div className="flex flex-wrap gap-2">
        {deptGroups.map((g, i) => (
          <div key={`${g.deptId}-${i}`} className="flex items-center gap-1.5 text-xs">
            <div className={`h-2.5 w-2.5 rounded-full ${getDepartmentColor(g.deptId)}`} />
            <span className="text-muted-foreground">{getDepartmentLabel(g.deptName)}</span>
          </div>
        ))}
      </div>

      {/* Graph */}
      <ScrollArea className="w-full">
        <div className="flex items-center gap-0 pb-4 pt-2 px-2" style={{ minWidth: sorted.length * 100 }}>
          {sorted.map((node, i) => {
            const nextNode = sorted[i + 1];
            const edge = nextNode
              ? edgeMap.get(`${node.node_id}->${nextNode.node_id}`)
              : undefined;

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
      </ScrollArea>
    </div>
  );
}

