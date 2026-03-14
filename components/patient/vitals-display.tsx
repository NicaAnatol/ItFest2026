"use client";

import type { Vitals } from "@/lib/types/patient-state";
import {
  getVitalStatus,
  getVitalStatusColor,
} from "@/lib/utils/format";
import {
  Heartbeat,
  Thermometer,
  Wind,
  Drop,
  Brain,
  Lightning,
} from "@phosphor-icons/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface VitalsDisplayProps {
  vitals: Vitals;
  compact?: boolean;
}

export function VitalsDisplay({ vitals, compact = false }: VitalsDisplayProps) {
  const items = [
    {
      label: "BP",
      value: `${vitals.blood_pressure.systolic}/${vitals.blood_pressure.diastolic}`,
      unit: "mmHg",
      status: getVitalStatus("systolic", vitals.blood_pressure.systolic),
      icon: Drop,
    },
    {
      label: "HR",
      value: `${vitals.heart_rate.value}`,
      unit: "bpm",
      status: getVitalStatus("heart_rate", vitals.heart_rate.value),
      icon: Heartbeat,
    },
    {
      label: "RR",
      value: `${vitals.respiratory_rate.value}`,
      unit: "/min",
      status: getVitalStatus("respiratory_rate", vitals.respiratory_rate.value),
      icon: Wind,
    },
    {
      label: "SpO2",
      value: `${vitals.oxygen_saturation.value}`,
      unit: `%${vitals.oxygen_saturation.on_oxygen ? " (O₂)" : ""}`,
      status: getVitalStatus("oxygen_saturation", vitals.oxygen_saturation.value),
      icon: Wind,
    },
    {
      label: "Temp",
      value: `${vitals.temperature.value}`,
      unit: "°C",
      status: getVitalStatus("temperature", vitals.temperature.value),
      icon: Thermometer,
    },
    {
      label: "Pain",
      value: `${vitals.pain_score}`,
      unit: "/10",
      status: getVitalStatus("pain", vitals.pain_score),
      icon: Lightning,
    },
    {
      label: "GCS",
      value: `${vitals.consciousness.gcs}`,
      unit: "/15",
      status: getVitalStatus("gcs", vitals.consciousness.gcs),
      icon: Brain,
    },
  ];

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Tooltip key={item.label}>
            <TooltipTrigger asChild>
              <div
                className={`flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1 text-xs font-medium ${getVitalStatusColor(item.status)}`}
              >
                <item.icon size={12} weight="bold" />
                <span>{item.value}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {item.label}: {item.value}
                {item.unit}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-2 rounded-lg border border-border/50 bg-card p-2"
        >
          <div className={`rounded-md p-1.5 ${getVitalStatusColor(item.status)} bg-current/10`}>
            <item.icon size={16} weight="bold" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {item.label}
            </p>
            <p className={`text-sm font-semibold ${getVitalStatusColor(item.status)}`}>
              {item.value}
              <span className="text-[10px] font-normal text-muted-foreground">
                {" "}{item.unit}
              </span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

