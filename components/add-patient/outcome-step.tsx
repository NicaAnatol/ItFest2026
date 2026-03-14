"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle,
  Warning,
  Skull,
  ArrowLeft,
  ArrowRight,
  Plus,
  X,
  FlagBanner,
  Shuffle,
} from "@phosphor-icons/react";
import type { OutcomeStatus } from "@/lib/types/patient";
import { generateOutcomeData } from "@/lib/add-patient/mock-generators";

export interface OutcomeData {
  status: OutcomeStatus;
  discharge_destination: string;
  complications: string[];
  readmission_risk: number;
}

interface OutcomeStepProps {
  data: Partial<OutcomeData>;
  onComplete: (data: OutcomeData) => void;
  onBack: () => void;
}

const OUTCOME_OPTIONS: {
  value: OutcomeStatus;
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  {
    value: "HEALED",
    label: "Healed",
    icon: CheckCircle,
    color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  },
  {
    value: "HEALED_WITH_COMPLICATIONS",
    label: "Healed with Complications",
    icon: Warning,
    color: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  },
  {
    value: "DECEASED",
    label: "Deceased",
    icon: Skull,
    color: "bg-red-500/15 text-red-600 border-red-500/30",
  },
];

const DESTINATIONS = [
  "home",
  "rehabilitation_center",
  "long_term_care",
  "transferred",
  "morgue",
];

export function OutcomeStep({ data, onComplete, onBack }: OutcomeStepProps) {
  const [form, setForm] = useState<OutcomeData>({
    status: data.status ?? "HEALED",
    discharge_destination: data.discharge_destination ?? "home",
    complications: data.complications ?? [],
    readmission_risk: data.readmission_risk ?? 0.05,
  });
  const [newComp, setNewComp] = useState("");

  const addComp = () => {
    if (!newComp.trim()) return;
    setForm((prev) => ({
      ...prev,
      complications: [...prev.complications, newComp.trim()],
    }));
    setNewComp("");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setForm(generateOutcomeData())}
        >
          <Shuffle size={14} />
          Autofill (Test Data)
        </Button>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FlagBanner size={16} className="text-primary" weight="bold" />
            Final Outcome
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Based on the latest assessment, select the patient&apos;s final
            outcome status.
          </p>

          {/* Outcome status selector */}
          <div className="grid grid-cols-3 gap-2">
            {OUTCOME_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = form.status === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                    selected
                      ? opt.color + " border-current"
                      : "border-muted bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  }`}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      status: opt.value,
                      discharge_destination:
                        opt.value === "DECEASED" ? "morgue" : prev.discharge_destination === "morgue" ? "home" : prev.discharge_destination,
                    }))
                  }
                >
                  <Icon size={24} weight={selected ? "fill" : "regular"} />
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Discharge destination */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Discharge Destination
            </label>
            <Select
              value={form.discharge_destination}
              onValueChange={(v) =>
                setForm((prev) => ({ ...prev, discharge_destination: v }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DESTINATIONS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Readmission risk */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              30-Day Readmission Risk (0–1)
            </label>
            <Input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={form.readmission_risk}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  readmission_risk: Number(e.target.value),
                }))
              }
            />
          </div>

          {/* Final complications */}
          {(form.status === "HEALED_WITH_COMPLICATIONS" ||
            form.status === "DECEASED") && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Final Complications
              </label>
              <div className="flex gap-1">
                <Input
                  className="h-7 text-xs"
                  placeholder="e.g. acute_kidney_injury"
                  value={newComp}
                  onChange={(e) => setNewComp(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addComp();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={addComp}
                >
                  <Plus size={12} />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {form.complications.map((c, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="gap-1 text-[9px] border-amber-500/30 text-amber-600"
                  >
                    {c.replaceAll("_", " ")}
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          complications: prev.complications.filter(
                            (_, j) => j !== i,
                          ),
                        }))
                      }
                    >
                      <X size={8} />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          className="gap-2 text-xs"
        >
          <ArrowLeft size={14} /> Back
        </Button>
        <Button
          onClick={() => onComplete(form)}
          className="gap-2 text-xs"
        >
          Finalize Outcome
          <ArrowRight size={14} />
        </Button>
      </div>
    </div>
  );
}

