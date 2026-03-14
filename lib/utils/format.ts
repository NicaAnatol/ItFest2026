import type { OutcomeStatus, TriageCode } from "@/lib/types/patient";

// ─── Duration ───

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    return `${m}min`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function formatDurationDays(days: number): string {
  if (days < 1) return `${Math.round(days * 24)}h`;
  return `${days.toFixed(1)}d`;
}

// ─── Timestamps ───

export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Currency ───

export function formatCurrency(eur: number): string {
  return `€${eur.toLocaleString("en-US")}`;
}

// ─── Vitals ───

export type VitalStatus = "normal" | "warning" | "critical";

export function getVitalStatus(type: string, value: number): VitalStatus {
  switch (type) {
    case "systolic":
      if (value < 90 || value > 180) return "critical";
      if (value < 100 || value > 160) return "warning";
      return "normal";
    case "diastolic":
      if (value < 50 || value > 120) return "critical";
      if (value < 60 || value > 100) return "warning";
      return "normal";
    case "heart_rate":
      if (value < 40 || value > 150) return "critical";
      if (value < 50 || value > 120) return "warning";
      return "normal";
    case "respiratory_rate":
      if (value < 8 || value > 30) return "critical";
      if (value < 10 || value > 24) return "warning";
      return "normal";
    case "oxygen_saturation":
      if (value < 85) return "critical";
      if (value < 92) return "warning";
      return "normal";
    case "temperature":
      if (value < 35 || value > 40) return "critical";
      if (value < 36 || value > 38.5) return "warning";
      return "normal";
    case "gcs":
      if (value <= 8) return "critical";
      if (value <= 12) return "warning";
      return "normal";
    case "pain":
      if (value >= 8) return "critical";
      if (value >= 5) return "warning";
      return "normal";
    default:
      return "normal";
  }
}

export function getVitalStatusColor(status: VitalStatus): string {
  switch (status) {
    case "critical": return "text-red-500";
    case "warning": return "text-amber-500";
    case "normal": return "text-emerald-500";
  }
}

export function formatVitalValue(type: string, value: number, unit?: string): string {
  const u = unit ? ` ${unit}` : "";
  return `${value}${u}`;
}

// ─── Diagnosis ───

export function formatDiagnosisName(snakeCase: string): string {
  return snakeCase
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bCopd\b/g, "COPD")
    .replace(/\bAcs\b/g, "ACS")
    .replace(/\bPe\b/g, "PE")
    .replace(/\bIcu\b/g, "ICU")
    .replace(/\bStemi\b/g, "STEMI")
    .replace(/\bNstemi\b/g, "NSTEMI")
    .replace(/\bUti\b/g, "UTI")
    .replace(/\bArds\b/g, "ARDS")
    .replace(/\bDvt\b/g, "DVT");
}

export function formatActionName(snakeCase: string): string {
  return snakeCase.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Triage ───

export function getTriageColor(code: TriageCode): string {
  switch (code) {
    case "RED": return "bg-red-500 text-white";
    case "ORANGE": return "bg-orange-500 text-white";
    case "YELLOW": return "bg-yellow-400 text-black";
    case "GREEN": return "bg-emerald-500 text-white";
    default: return "bg-muted text-muted-foreground";
  }
}

export function getTriageBorderColor(code: TriageCode): string {
  switch (code) {
    case "RED": return "border-red-500";
    case "ORANGE": return "border-orange-500";
    case "YELLOW": return "border-yellow-400";
    case "GREEN": return "border-emerald-500";
    default: return "border-muted";
  }
}

// ─── Outcome ───

export function getOutcomeColor(status: OutcomeStatus): string {
  switch (status) {
    case "HEALED": return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
    case "HEALED_WITH_COMPLICATIONS": return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
    case "DECEASED": return "bg-red-500/15 text-red-700 dark:text-red-400";
    default: return "bg-muted text-muted-foreground";
  }
}

export function getOutcomeDotColor(status: OutcomeStatus): string {
  switch (status) {
    case "HEALED": return "bg-emerald-500";
    case "HEALED_WITH_COMPLICATIONS": return "bg-amber-500";
    case "DECEASED": return "bg-red-500";
    default: return "bg-muted";
  }
}

export function getOutcomeLabel(status: OutcomeStatus): string {
  switch (status) {
    case "HEALED": return "Healed";
    case "HEALED_WITH_COMPLICATIONS": return "Complications";
    case "DECEASED": return "Deceased";
    default: return status;
  }
}

export function getOutcomeIcon(status: OutcomeStatus): string {
  switch (status) {
    case "HEALED": return "CheckCircle";
    case "HEALED_WITH_COMPLICATIONS": return "Warning";
    case "DECEASED": return "Skull";
    default: return "Question";
  }
}

// ─── Risk ───

export type RiskLevel = "low" | "moderate" | "high" | "critical";

export function getRiskLevel(probability: number): RiskLevel {
  if (probability >= 0.20) return "critical";
  if (probability >= 0.10) return "high";
  if (probability >= 0.05) return "moderate";
  return "low";
}

export function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case "critical": return "text-red-500";
    case "high": return "text-orange-500";
    case "moderate": return "text-amber-500";
    case "low": return "text-emerald-500";
  }
}

export function getRiskBgColor(level: RiskLevel): string {
  switch (level) {
    case "critical": return "bg-red-500/15 text-red-700 dark:text-red-400";
    case "high": return "bg-orange-500/15 text-orange-700 dark:text-orange-400";
    case "moderate": return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
    case "low": return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  }
}

export function formatRiskPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

// ─── Flag severity ───

export function getFlagSeverityColor(severity: string): string {
  switch (severity) {
    case "CRITICAL": return "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30";
    case "WARNING": return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
    case "INFO": return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

export function getFlagSeverityIcon(severity: string): string {
  switch (severity) {
    case "CRITICAL": return "Warning";
    case "WARNING": return "WarningCircle";
    case "INFO": return "Info";
    default: return "Question";
  }
}

// ─── Department ───

export function getDepartmentColor(deptId: string): string {
  const colors: Record<string, string> = {
    DEPT_AMBULANCE: "bg-blue-500",
    DEPT_EMERGENCY: "bg-red-500",
    DEPT_ICU: "bg-purple-500",
    DEPT_CARDIOLOGY: "bg-rose-500",
    DEPT_PULMONOLOGY: "bg-cyan-500",
    DEPT_SURGERY: "bg-orange-500",
    DEPT_NEUROLOGY: "bg-indigo-500",
    DEPT_INTERNAL: "bg-teal-500",
    DEPT_ORTHOPEDICS: "bg-lime-500",
    DEPT_STEPDOWN: "bg-violet-500",
    DEPT_RADIOLOGY: "bg-sky-500",
    DEPT_OR: "bg-amber-500",
  };
  return colors[deptId] ?? "bg-muted";
}

export function getDepartmentLabel(name: string): string {
  return name.replace(/_/g, " ");
}

// ─── Action Category ───

export function getActionCategoryColor(category: string): string {
  switch (category) {
    case "admission": return "bg-blue-500";
    case "triage": return "bg-red-500";
    case "diagnostic": return "bg-cyan-500";
    case "treatment": return "bg-emerald-500";
    case "monitoring": return "bg-violet-500";
    case "consultation": return "bg-indigo-500";
    case "transfer": return "bg-orange-500";
    case "procedure": return "bg-amber-500";
    case "discharge": return "bg-teal-500";
    default: return "bg-muted";
  }
}

// ─── Percentage ───

export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

