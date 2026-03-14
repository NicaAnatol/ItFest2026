"use client";

import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { PatientNode, PatientEdge } from "@/lib/types/patient";
import { Badge } from "@/components/ui/badge";
import {
  getActionCategoryColor,
  formatActionName,
  getRiskLevel,
  getRiskBgColor,
  formatRiskPercentage,
  formatDuration,
} from "@/lib/utils/format";
import { countFlagsBySeverity } from "@/lib/decision/decision-utils";
import {
  Ambulance,
  FirstAid,
  Stethoscope,
  Pill,
  Heartbeat,
  UserCircle,
  ArrowsLeftRight,
  Syringe,
  SignOut,
  Warning,
  CheckCircle,
  XCircle,
} from "@phosphor-icons/react";

const categoryIcons: Record<string, React.ElementType> = {
  admission: Ambulance,
  triage: FirstAid,
  diagnostic: Stethoscope,
  treatment: Pill,
  monitoring: Heartbeat,
  consultation: UserCircle,
  transfer: ArrowsLeftRight,
  procedure: Syringe,
  discharge: SignOut,
};

// ─── Custom Node Component ───

interface ClinicalNodeData {
  patientNode: PatientNode;
  isSelected: boolean;
  onNodeClick: (node: PatientNode) => void;
  [key: string]: unknown;
}

function ClinicalNodeComponent({ data }: { data: ClinicalNodeData }) {
  const node = data.patientNode;
  const Icon = categoryIcons[node.decision.action_category] ?? Stethoscope;
  const flagCounts = countFlagsBySeverity(node.historical_analysis.flags);
  const hasCritical = flagCounts.critical > 0;
  const hasWarning = flagCounts.warning > 0;
  const riskLevel = getRiskLevel(node.risk_assessment.mortality_risk.total);
  const success = node.transition_outcome.success;

  const deptColorMap: Record<string, string> = {
    DEPT_AMBULANCE: "#3b82f6",
    DEPT_EMERGENCY: "#ef4444",
    DEPT_ICU: "#a855f7",
    DEPT_CARDIOLOGY: "#f43f5e",
    DEPT_PULMONOLOGY: "#06b6d4",
    DEPT_SURGERY: "#f97316",
    DEPT_NEUROLOGY: "#6366f1",
    DEPT_INTERNAL: "#14b8a6",
    DEPT_ORTHOPEDICS: "#84cc16",
    DEPT_STEPDOWN: "#8b5cf6",
    DEPT_RADIOLOGY: "#0ea5e9",
    DEPT_OR: "#f59e0b",
  };

  const borderColor = hasCritical
    ? "#ef4444"
    : hasWarning
      ? "#f59e0b"
      : deptColorMap[node.logistics.location.department.id] ?? "#6b7280";

  return (
    <div
      className={`
        group relative rounded-xl border-2 bg-card p-3 shadow-md cursor-pointer
        transition-all hover:shadow-xl hover:scale-105
        ${data.isSelected ? "ring-2 ring-primary ring-offset-2" : ""}
        ${hasCritical ? "animate-pulse" : ""}
      `}
      style={{
        borderColor,
        minWidth: 180,
        maxWidth: 220,
      }}
      onClick={() => data.onNodeClick(node)}
    >
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground !w-2 !h-2" />

      {/* Department color bar */}
      <div
        className="absolute inset-x-0 top-0 h-1.5 rounded-t-[10px]"
        style={{ backgroundColor: borderColor }}
      />

      {/* Header: Sequence + Icon + Category */}
      <div className="mt-1 flex items-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-white ${getActionCategoryColor(node.decision.action_category)}`}
        >
          <Icon size={16} weight="bold" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold leading-tight">
            #{node.sequence} {formatActionName(node.decision.action)}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">
            {node.logistics.location.department.name.replace(/_/g, " ")}
          </p>
        </div>
      </div>

      {/* Vitals mini row */}
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span>
          BP {node.patient_state.vitals.blood_pressure.systolic}/
          {node.patient_state.vitals.blood_pressure.diastolic}
        </span>
        <span>·</span>
        <span>HR {node.patient_state.vitals.heart_rate.value}</span>
        <span>·</span>
        <span>SpO₂ {node.patient_state.vitals.oxygen_saturation.value}%</span>
      </div>

      {/* Badges row */}
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${getRiskBgColor(riskLevel)}`}>
          Risk {formatRiskPercentage(node.risk_assessment.mortality_risk.total)}
        </Badge>
        {success ? (
          <CheckCircle size={12} className="text-emerald-500" weight="fill" />
        ) : (
          <XCircle size={12} className="text-red-500" weight="fill" />
        )}
        {hasCritical && (
          <Badge className="bg-red-500/20 text-red-600 text-[9px] px-1 py-0 gap-0.5">
            <Warning size={10} weight="fill" />
            {flagCounts.critical}
          </Badge>
        )}
        {hasWarning && !hasCritical && (
          <Badge className="bg-amber-500/20 text-amber-600 text-[9px] px-1 py-0 gap-0.5">
            <Warning size={10} weight="fill" />
            {flagCounts.warning}
          </Badge>
        )}
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  clinical: ClinicalNodeComponent,
};

// ─── Layout Computation ───

function computeLayout(nodes: PatientNode[]) {
  const sorted = [...nodes].sort((a, b) => a.sequence - b.sequence);

  // Group by department to create rows
  const deptOrder: string[] = [];
  const deptNodes: Record<string, PatientNode[]> = {};
  for (const n of sorted) {
    const deptId = n.logistics.location.department.id;
    if (!deptNodes[deptId]) {
      deptNodes[deptId] = [];
      deptOrder.push(deptId);
    }
    deptNodes[deptId].push(n);
  }

  // Create a timeline-based layout with department swim lanes
  const X_GAP = 300;
  const Y_GAP = 160;
  const positions: Record<string, { x: number; y: number }> = {};

  // Assign Y based on department
  const deptY: Record<string, number> = {};
  deptOrder.forEach((deptId, i) => {
    deptY[deptId] = i * Y_GAP;
  });

  // Assign X based on sequence order
  sorted.forEach((n, i) => {
    const deptId = n.logistics.location.department.id;
    positions[n.node_id] = {
      x: i * X_GAP,
      y: deptY[deptId],
    };
  });

  return positions;
}

// ─── Main Component ───

interface InteractiveGraphProps {
  nodes: PatientNode[];
  edges: PatientEdge[];
  selectedNodeId?: string | null;
  onNodeClick?: (node: PatientNode) => void;
}

export function InteractivePatientGraph({
  nodes: patientNodes,
  edges: patientEdges,
  selectedNodeId,
  onNodeClick,
}: InteractiveGraphProps) {
  const positions = useMemo(() => computeLayout(patientNodes), [patientNodes]);

  const handleNodeClick = useCallback(
    (node: PatientNode) => {
      onNodeClick?.(node);
    },
    [onNodeClick],
  );

  const flowNodes = useMemo<Node[]>(() => {
    return patientNodes.map((pn) => ({
      id: pn.node_id,
      type: "clinical",
      position: positions[pn.node_id] ?? { x: 0, y: 0 },
      data: {
        patientNode: pn,
        isSelected: selectedNodeId === pn.node_id,
        onNodeClick: handleNodeClick,
      } satisfies ClinicalNodeData,
    }));
  }, [patientNodes, positions, selectedNodeId, handleNodeClick]);

  const flowEdges = useMemo<Edge[]>(() => {
    return patientEdges.map((pe) => {
      const durationLabel = pe.time_elapsed_seconds
        ? formatDuration(pe.time_elapsed_seconds)
        : "";
      const isTransfer = pe.type === "transfer";

      return {
        id: `${pe.from}->${pe.to}`,
        source: pe.from,
        target: pe.to,
        type: "default",
        animated: isTransfer,
        style: {
          stroke: isTransfer ? "#f97316" : "#6b7280",
          strokeWidth: isTransfer ? 2.5 : 1.5,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isTransfer ? "#f97316" : "#6b7280",
          width: 16,
          height: 16,
        },
        label: durationLabel,
        labelStyle: {
          fontSize: 10,
          fontFamily: "monospace",
          fill: "#9ca3af",
        },
        labelBgStyle: {
          fill: "var(--card)",
          fillOpacity: 0.8,
        },
      };
    });
  }, [patientEdges]);

  const [rfNodes, , onNodesChange] = useNodesState(flowNodes);
  const [rfEdges, , onEdgesChange] = useEdgesState(flowEdges);

  // Minimap node color by department
  const minimapNodeColor = useCallback(
    (node: Node) => {
      const pn = patientNodes.find((p) => p.node_id === node.id);
      if (!pn) return "#6b7280";
      const deptColors: Record<string, string> = {
        DEPT_AMBULANCE: "#3b82f6",
        DEPT_EMERGENCY: "#ef4444",
        DEPT_ICU: "#a855f7",
        DEPT_CARDIOLOGY: "#f43f5e",
        DEPT_PULMONOLOGY: "#06b6d4",
        DEPT_SURGERY: "#f97316",
        DEPT_NEUROLOGY: "#6366f1",
        DEPT_INTERNAL: "#14b8a6",
        DEPT_ORTHOPEDICS: "#84cc16",
        DEPT_STEPDOWN: "#8b5cf6",
        DEPT_RADIOLOGY: "#0ea5e9",
        DEPT_OR: "#f59e0b",
      };
      return deptColors[pn.logistics.location.department.id] ?? "#6b7280";
    },
    [patientNodes],
  );

  return (
    <div className="h-[600px] w-full rounded-lg border bg-card/50">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        className="bg-background"
      >
        <Background gap={20} size={1} className="!bg-muted/30" />
        <Controls className="!bg-card !border-border !shadow-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground" />
        <MiniMap
          nodeColor={minimapNodeColor}
          className="!bg-card !border-border"
          maskColor="rgba(0,0,0,0.15)"
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}


