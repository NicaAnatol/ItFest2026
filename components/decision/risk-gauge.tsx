"use client";

import { getRiskLevel } from "@/lib/utils/format";

interface RiskGaugeProps {
  /** 0..1 */
  value: number;
  size?: number;
  label?: string;
}

export function RiskGauge({ value, size = 80, label }: RiskGaugeProps) {
  const level = getRiskLevel(value);
  const radius = (size - 8) / 2;
  const circumference = Math.PI * radius; // semicircle
  const offset = circumference * (1 - Math.min(1, value));
  const percentage = (value * 100).toFixed(1);

  const colorMap: Record<string, string> = {
    low: "#22c55e",
    moderate: "#eab308",
    high: "#f97316",
    critical: "#ef4444",
  };
  const strokeColor = colorMap[level] ?? "#a1a1aa";

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size / 2 + 8} viewBox={`0 0 ${size} ${size / 2 + 8}`}>
        {/* Background arc */}
        <path
          d={`M 4 ${size / 2 + 4} A ${radius} ${radius} 0 0 1 ${size - 4} ${size / 2 + 4}`}
          fill="none"
          stroke="currentColor"
          className="text-muted"
          strokeWidth={6}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <path
          d={`M 4 ${size / 2 + 4} A ${radius} ${radius} 0 0 1 ${size - 4} ${size / 2 + 4}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="animate-gauge-fill"
          style={{
            "--gauge-circumference": `${circumference}`,
            "--gauge-target": `${offset}`,
          } as React.CSSProperties}
        />
        {/* Value text */}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          className="fill-foreground text-sm font-bold"
          style={{ fontSize: size * 0.18 }}
        >
          {percentage}%
        </text>
      </svg>
      {label && (
        <span className="mt-0.5 text-[10px] text-muted-foreground">{label}</span>
      )}
    </div>
  );
}

