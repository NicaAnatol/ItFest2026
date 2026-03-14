"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VoiceInputButton } from "./voice-input-button";
import {
  Heartbeat,
  Thermometer,
  Wind,
  Drop,
  Brain,
  ArrowRight,
  ArrowLeft,
  Plus,
  X,
  Shuffle,
} from "@phosphor-icons/react";
import { generateTriageData } from "@/lib/add-patient/mock-generators";

export interface TriageData {
  systolic: number;
  diastolic: number;
  heart_rate: number;
  respiratory_rate: number;
  oxygen_saturation: number;
  on_oxygen: boolean;
  temperature: number;
  gcs: number;
  pain_score: number;
  symptoms: string[];
}

interface TriageStepProps {
  data: Partial<TriageData>;
  onComplete: (data: TriageData) => void;
  onBack: () => void;
}

export function TriageStep({ data, onComplete, onBack }: TriageStepProps) {
  const [form, setForm] = useState<TriageData>({
    systolic: data.systolic ?? 120,
    diastolic: data.diastolic ?? 80,
    heart_rate: data.heart_rate ?? 80,
    respiratory_rate: data.respiratory_rate ?? 16,
    oxygen_saturation: data.oxygen_saturation ?? 98,
    on_oxygen: data.on_oxygen ?? false,
    temperature: data.temperature ?? 36.8,
    gcs: data.gcs ?? 15,
    pain_score: data.pain_score ?? 0,
    symptoms: data.symptoms ?? [],
  });

  const [newSymptom, setNewSymptom] = useState("");

  const set = <K extends keyof TriageData>(key: K, val: TriageData[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const addSymptom = () => {
    if (!newSymptom.trim()) return;
    set("symptoms", [...form.symptoms, newSymptom.trim()]);
    setNewSymptom("");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setForm(generateTriageData())}
        >
          <Shuffle size={14} />
          Autofill (Test Data)
        </Button>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Heartbeat size={16} className="text-primary" />
            Vital Signs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Blood Pressure */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Drop size={12} /> Blood Pressure (mmHg)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-muted-foreground">Systolic</span>
                <Input
                  type="number"
                  value={form.systolic}
                  onChange={(e) => set("systolic", Number(e.target.value))}
                />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground">Diastolic</span>
                <Input
                  type="number"
                  value={form.diastolic}
                  onChange={(e) => set("diastolic", Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* HR + RR */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Heartbeat size={12} /> Heart Rate (bpm)
              </label>
              <Input
                type="number"
                value={form.heart_rate}
                onChange={(e) => set("heart_rate", Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Wind size={12} /> Respiratory Rate
              </label>
              <Input
                type="number"
                value={form.respiratory_rate}
                onChange={(e) => set("respiratory_rate", Number(e.target.value))}
              />
            </div>
          </div>

          {/* SpO2 + Temperature */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                SpO₂ (%)
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={form.oxygen_saturation}
                  onChange={(e) =>
                    set("oxygen_saturation", Number(e.target.value))
                  }
                />
                <Button
                  type="button"
                  variant={form.on_oxygen ? "default" : "outline"}
                  size="sm"
                  className="shrink-0 text-[10px]"
                  onClick={() => set("on_oxygen", !form.on_oxygen)}
                >
                  O₂
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Thermometer size={12} /> Temperature (°C)
              </label>
              <Input
                type="number"
                step="0.1"
                value={form.temperature}
                onChange={(e) => set("temperature", Number(e.target.value))}
              />
            </div>
          </div>

          {/* GCS + Pain */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Brain size={12} /> GCS (3-15)
              </label>
              <Input
                type="number"
                min={3}
                max={15}
                value={form.gcs}
                onChange={(e) => set("gcs", Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Pain Score (0-10)
              </label>
              <Input
                type="number"
                min={0}
                max={10}
                value={form.pain_score}
                onChange={(e) => set("pain_score", Number(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Symptoms */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Presenting Symptoms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="e.g. chest pain, dyspnea, fever"
              value={newSymptom}
              onChange={(e) => setNewSymptom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSymptom();
                }
              }}
            />
            <VoiceInputButton onTranscript={(t) => setNewSymptom(t)} />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={addSymptom}
            >
              <Plus size={14} />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {form.symptoms.map((s, i) => (
              <Badge key={i} variant="secondary" className="gap-1 text-xs">
                {s}
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "symptoms",
                      form.symptoms.filter((_, j) => j !== i),
                    )
                  }
                >
                  <X size={10} />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft size={16} />
          Back
        </Button>
        <Button onClick={() => onComplete(form)} className="gap-2">
          Continue to Diagnosis
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}

