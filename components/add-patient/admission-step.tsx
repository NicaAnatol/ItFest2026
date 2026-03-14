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
import { FirstAid, Plus, X, ArrowRight, Shuffle } from "@phosphor-icons/react";
import { generateAdmissionData } from "@/lib/add-patient/mock-generators";
import type { TriageCode } from "@/lib/types/patient";

export interface AdmissionData {
  patient_name: string;
  age: number;
  gender: string;
  weight_kg: number;
  height_cm: number;
  chief_complaint: string;
  triage_code: TriageCode;
  admission_method: string;
  chronic_conditions: string[];
  allergies: string[];
  risk_factors: string[];
}

interface AdmissionStepProps {
  data: Partial<AdmissionData>;
  onComplete: (data: AdmissionData) => void;
}

export function AdmissionStep({ data, onComplete }: AdmissionStepProps) {
  const [form, setForm] = useState<AdmissionData>({
    patient_name: data.patient_name ?? "",
    age: data.age ?? 0,
    gender: data.gender ?? "",
    weight_kg: data.weight_kg ?? 70,
    height_cm: data.height_cm ?? 170,
    chief_complaint: data.chief_complaint ?? "",
    triage_code: data.triage_code ?? "YELLOW",
    admission_method: data.admission_method ?? "emergency",
    chronic_conditions: data.chronic_conditions ?? [],
    allergies: data.allergies ?? [],
    risk_factors: data.risk_factors ?? [],
  });

  const [newChronic, setNewChronic] = useState("");
  const [newAllergy, setNewAllergy] = useState("");
  const [newRiskFactor, setNewRiskFactor] = useState("");

  const set = <K extends keyof AdmissionData>(key: K, val: AdmissionData[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const addToList = (
    key: "chronic_conditions" | "allergies" | "risk_factors",
    value: string,
    setter: (v: string) => void,
  ) => {
    if (!value.trim()) return;
    set(key, [...form[key], value.trim()]);
    setter("");
  };

  const removeFromList = (
    key: "chronic_conditions" | "allergies" | "risk_factors",
    idx: number,
  ) => {
    set(
      key,
      form[key].filter((_, i) => i !== idx),
    );
  };

  const canSubmit =
    form.patient_name.trim() !== "" &&
    form.age > 0 &&
    form.gender !== "" &&
    form.chief_complaint.trim() !== "";

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setForm(generateAdmissionData())}
        >
          <Shuffle size={14} />
          Autofill (Test Data)
        </Button>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FirstAid size={16} className="text-primary" />
            Patient Demographics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Full Name <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Patient name"
                value={form.patient_name}
                onChange={(e) => set("patient_name", e.target.value)}
              />
              <VoiceInputButton
                onTranscript={(t) => set("patient_name", t)}
              />
            </div>
          </div>

          {/* Age + Gender */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Age <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                min={0}
                max={120}
                value={form.age || ""}
                onChange={(e) => set("age", Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Gender <span className="text-destructive">*</span>
              </label>
              <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Weight + Height */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Weight (kg)
              </label>
              <Input
                type="number"
                min={1}
                value={form.weight_kg || ""}
                onChange={(e) => set("weight_kg", Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Height (cm)
              </label>
              <Input
                type="number"
                min={1}
                value={form.height_cm || ""}
                onChange={(e) => set("height_cm", Number(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Admission Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Chief Complaint */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Chief Complaint <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. chest pain, shortness of breath"
                value={form.chief_complaint}
                onChange={(e) => set("chief_complaint", e.target.value)}
              />
              <VoiceInputButton
                onTranscript={(t) =>
                  set("chief_complaint", form.chief_complaint ? `${form.chief_complaint} ${t}` : t)
                }
              />
            </div>
          </div>

          {/* Triage + Method */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Triage Code
              </label>
              <Select
                value={form.triage_code}
                onValueChange={(v) => set("triage_code", v as TriageCode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RED">🔴 RED — Immediate</SelectItem>
                  <SelectItem value="ORANGE">🟠 ORANGE — Very Urgent</SelectItem>
                  <SelectItem value="YELLOW">🟡 YELLOW — Urgent</SelectItem>
                  <SelectItem value="GREEN">🟢 GREEN — Standard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Admission Method
              </label>
              <Select
                value={form.admission_method}
                onValueChange={(v) => set("admission_method", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="ambulance">Ambulance</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="walk-in">Walk-in</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Medical history */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Medical History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Chronic conditions */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Chronic Conditions
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. hypertension, diabetes"
                value={newChronic}
                onChange={(e) => setNewChronic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addToList("chronic_conditions", newChronic, setNewChronic);
                  }
                }}
              />
              <VoiceInputButton onTranscript={(t) => setNewChronic(t)} />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() =>
                  addToList("chronic_conditions", newChronic, setNewChronic)
                }
              >
                <Plus size={14} />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {form.chronic_conditions.map((c, i) => (
                <Badge key={i} variant="secondary" className="gap-1 text-xs">
                  {c}
                  <button
                    type="button"
                    onClick={() => removeFromList("chronic_conditions", i)}
                  >
                    <X size={10} />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Allergies */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Allergies
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. penicillin, ibuprofen"
                value={newAllergy}
                onChange={(e) => setNewAllergy(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addToList("allergies", newAllergy, setNewAllergy);
                  }
                }}
              />
              <VoiceInputButton onTranscript={(t) => setNewAllergy(t)} />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() =>
                  addToList("allergies", newAllergy, setNewAllergy)
                }
              >
                <Plus size={14} />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {form.allergies.map((a, i) => (
                <Badge key={i} variant="secondary" className="gap-1 text-xs">
                  {a}
                  <button
                    type="button"
                    onClick={() => removeFromList("allergies", i)}
                  >
                    <X size={10} />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Risk factors */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Risk Factors
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. smoking, obesity"
                value={newRiskFactor}
                onChange={(e) => setNewRiskFactor(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addToList("risk_factors", newRiskFactor, setNewRiskFactor);
                  }
                }}
              />
              <VoiceInputButton onTranscript={(t) => setNewRiskFactor(t)} />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() =>
                  addToList("risk_factors", newRiskFactor, setNewRiskFactor)
                }
              >
                <Plus size={14} />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {form.risk_factors.map((r, i) => (
                <Badge key={i} variant="secondary" className="gap-1 text-xs">
                  {r}
                  <button
                    type="button"
                    onClick={() => removeFromList("risk_factors", i)}
                  >
                    <X size={10} />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => onComplete(form)} disabled={!canSubmit} className="gap-2">
          Continue to Triage
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}

