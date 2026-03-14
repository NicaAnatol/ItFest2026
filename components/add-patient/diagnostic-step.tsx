"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { VoiceInputButton } from "./voice-input-button";
import {
  MagnifyingGlass,
  TestTube,
  ArrowRight,
  ArrowLeft,
  Plus,
  X,
  Shuffle,
} from "@phosphor-icons/react";
import { generateDiagnosticData } from "@/lib/add-patient/mock-generators";

export interface DiagnosticData {
  primary_name: string;
  primary_icd10: string;
  severity: string;
  acuity: string;
  confidence: number;
  differentials: Array<{ name: string; probability: number }>;
  // Key labs
  hemoglobin?: number;
  white_blood_cells?: number;
  creatinine?: number;
  troponin?: number;
  d_dimer?: number;
  lactate?: number;
  glucose?: number;
  potassium?: number;
  // Imaging
  imaging_notes: string;
}

interface DiagnosticStepProps {
  data: Partial<DiagnosticData>;
  onComplete: (data: DiagnosticData) => void;
  onBack: () => void;
  stepLabel?: string;
  submitLabel?: string;
}

export function DiagnosticStep({ data, onComplete, onBack, stepLabel, submitLabel }: DiagnosticStepProps) {
  const [form, setForm] = useState<DiagnosticData>({
    primary_name: data.primary_name ?? "",
    primary_icd10: data.primary_icd10 ?? "",
    severity: data.severity ?? "moderate",
    acuity: data.acuity ?? "acute",
    confidence: data.confidence ?? 0.8,
    differentials: data.differentials ?? [],
    hemoglobin: data.hemoglobin,
    white_blood_cells: data.white_blood_cells,
    creatinine: data.creatinine,
    troponin: data.troponin,
    d_dimer: data.d_dimer,
    lactate: data.lactate,
    glucose: data.glucose,
    potassium: data.potassium,
    imaging_notes: data.imaging_notes ?? "",
  });

  const [newDiffName, setNewDiffName] = useState("");
  const [newDiffProb, setNewDiffProb] = useState(0.1);

  const set = <K extends keyof DiagnosticData>(key: K, val: DiagnosticData[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const addDifferential = () => {
    if (!newDiffName.trim()) return;
    set("differentials", [
      ...form.differentials,
      { name: newDiffName.trim(), probability: newDiffProb },
    ]);
    setNewDiffName("");
    setNewDiffProb(0.1);
  };

  const canSubmit = form.primary_name.trim() !== "";

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setForm(generateDiagnosticData())}
        >
          <Shuffle size={14} />
          Autofill (Test Data)
        </Button>
      </div>
      {/* Primary Diagnosis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <MagnifyingGlass size={16} className="text-primary" />
            {stepLabel ?? "Primary Diagnosis"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Diagnosis Name <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. bilateral_pulmonary_embolism"
                value={form.primary_name}
                onChange={(e) => set("primary_name", e.target.value)}
              />
              <VoiceInputButton
                onTranscript={(t) =>
                  set("primary_name", t.toLowerCase().replace(/\s+/g, "_"))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                ICD-10 Code
              </label>
              <Input
                placeholder="e.g. I26.99"
                value={form.primary_icd10}
                onChange={(e) => set("primary_icd10", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Confidence
              </label>
              <Input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={form.confidence}
                onChange={(e) => set("confidence", Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Severity
              </label>
              <Select value={form.severity} onValueChange={(v) => set("severity", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mild">Mild</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="severe">Severe</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Acuity
              </label>
              <Select value={form.acuity} onValueChange={(v) => set("acuity", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="acute">Acute</SelectItem>
                  <SelectItem value="subacute">Sub-acute</SelectItem>
                  <SelectItem value="chronic">Chronic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Differentials */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Differential Diagnoses
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Diagnosis name"
                value={newDiffName}
                onChange={(e) => setNewDiffName(e.target.value)}
                className="flex-1"
              />
              <Input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={newDiffProb}
                onChange={(e) => setNewDiffProb(Number(e.target.value))}
                className="w-20"
                placeholder="Prob"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={addDifferential}
              >
                <Plus size={14} />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {form.differentials.map((d, i) => (
                <Badge key={i} variant="secondary" className="gap-1 text-xs">
                  {d.name} ({(d.probability * 100).toFixed(0)}%)
                  <button
                    type="button"
                    onClick={() =>
                      set(
                        "differentials",
                        form.differentials.filter((_, j) => j !== i),
                      )
                    }
                  >
                    <X size={10} />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lab Results */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TestTube size={16} className="text-primary" />
            Key Lab Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[10px] text-muted-foreground mb-3">
            Fill in only available results. Leave blank if not ordered.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "hemoglobin" as const, label: "Hemoglobin (g/dL)", placeholder: "14.0" },
              { key: "white_blood_cells" as const, label: "WBC (×10³/μL)", placeholder: "7.5" },
              { key: "creatinine" as const, label: "Creatinine (mg/dL)", placeholder: "1.0" },
              { key: "troponin" as const, label: "Troponin (ng/mL)", placeholder: "0.01" },
              { key: "d_dimer" as const, label: "D-Dimer (μg/mL)", placeholder: "0.5" },
              { key: "lactate" as const, label: "Lactate (mmol/L)", placeholder: "1.0" },
              { key: "glucose" as const, label: "Glucose (mg/dL)", placeholder: "100" },
              { key: "potassium" as const, label: "Potassium (mEq/L)", placeholder: "4.0" },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="space-y-1">
                <label className="text-[10px] text-muted-foreground">{label}</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={placeholder}
                  value={form[key] ?? ""}
                  onChange={(e) =>
                    set(key, e.target.value ? Number(e.target.value) : undefined)
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Imaging notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Imaging Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. CT angiography: bilateral PE confirmed"
              value={form.imaging_notes}
              onChange={(e) => set("imaging_notes", e.target.value)}
            />
            <VoiceInputButton
              onTranscript={(t) =>
                set("imaging_notes", form.imaging_notes ? `${form.imaging_notes} ${t}` : t)
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft size={16} />
          Back
        </Button>
        <Button onClick={() => onComplete(form)} disabled={!canSubmit} className="gap-2">
          {submitLabel ?? "Continue to Treatment"}
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}

