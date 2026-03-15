// Graph manipulation helpers

import type { PatientNode, PatientEdge } from "@/lib/types/patient";

/** Convert edge list to adjacency list */
export function buildAdjacencyList(edges: PatientEdge[]): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    if (!adj.has(edge.from)) adj.set(edge.from, []);
    adj.get(edge.from)!.push(edge.to);
  }
  return adj;
}

/** Get node depth (distance from NODE_0) */
export function getNodeDepth(nodeId: string, edges: PatientEdge[]): number {
  const adj = buildAdjacencyList(edges);
  const visited = new Set<string>();
  const queue: [string, number][] = [["NODE_0", 0]];
  visited.add("NODE_0");

  while (queue.length) {
    const [current, depth] = queue.shift()!;
    if (current === nodeId) return depth;
    const neighbors = adj.get(current) ?? [];
    for (const n of neighbors) {
      if (!visited.has(n)) {
        visited.add(n);
        queue.push([n, depth + 1]);
      }
    }
  }
  return -1;
}

/** Get critical path — the longest path from first to last node */
export function getCriticalPath(nodes: PatientNode[], _edges: PatientEdge[]): PatientNode[] {
  if (!nodes.length) return [];
  // Since the graph is sequential, the critical path is just all nodes in order
  return [...nodes].sort((a, b) => a.sequence - b.sequence);
}

/** Get list of department transitions */
export function getDepartmentTransitions(
  nodes: PatientNode[],
): Array<{ from: string; to: string; at_node: string; at_sequence: number }> {
  const sorted = [...nodes].sort((a, b) => a.sequence - b.sequence);
  const transitions: Array<{ from: string; to: string; at_node: string; at_sequence: number }> = [];

  for (let i = 1; i < sorted.length; i++) {
    const prevDept = sorted[i - 1].logistics.location.department.id;
    const currDept = sorted[i].logistics.location.department.id;
    if (prevDept !== currDept) {
      transitions.push({
        from: prevDept,
        to: currDept,
        at_node: sorted[i].node_id,
        at_sequence: sorted[i].sequence,
      });
    }
  }
  return transitions;
}

/** Group nodes by department */
export function getNodesByDepartment(
  nodes: PatientNode[],
): Map<string, PatientNode[]> {
  const map = new Map<string, PatientNode[]>();
  for (const node of nodes) {
    const deptId = node.logistics.location.department.id;
    if (!map.has(deptId)) map.set(deptId, []);
    map.get(deptId)!.push(node);
  }
  return map;
}

/** Get node by its ID from a list */
export function findNodeInList(nodes: PatientNode[], nodeId: string): PatientNode | undefined {
  return nodes.find((n) => n.node_id === nodeId);
}

