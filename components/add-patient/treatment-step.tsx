"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VoiceInputButton } from "./voice-input-button";
import {
  Pill,
  ArrowRight,
  ArrowLeft,
  Plus,
  X,
  Stethoscope,
  Shuffle,
} from "@phosphor-icons/react";
import { generateTreatmentData } from "@/lib/add-patient/mock-generators";
import type { ActionCategory } from "@/lib/types/decision";

export interface TreatmentData {
  action: string;
  action_category: ActionCategory;
  reasoning: string;
  guidelines: string;
  medications: Array<{ name: string; dose: string; route: string }>;
  orders: string[];
}

interface TreatmentStepProps {
  data: Partial<TreatmentData>;
  onComplete: (data: TreatmentData) => void;
  onBack: () => void;
  stepLabel?: string;
  submitLabel?: string;
}

export function TreatmentStep({ data, onComplete, onBack, stepLabel, submitLabel }: TreatmentStepProps) {
  const [form, setForm] = useState<TreatmentData>({
    action: data.action ?? "",
    action_category: data.action_category ?? "treatment",
    reasoning: data.reasoning ?? "",
    guidelines: data.guidelines ?? "",
    medications: data.medications ?? [],
    orders: data.orders ?? [],
  });

  const [newMedName, setNewMedName] = useState("");
  const [newMedDose, setNewMedDose] = useState("");
  const [newMedRoute, setNewMedRoute] = useState("IV");
  const [newOrder, setNewOrder] = useState("");

  const set = <K extends keyof TreatmentData>(key: K, val: TreatmentData[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const addMedication = () => {
    if (!newMedName.trim()) return;
    set("medications", [
      ...form.medications,
      { name: newMedName.trim(), dose: newMedDose.trim(), route: newMedRoute },
    ]);
    setNewMedName("");
    setNewMedDose("");
  };

  const addOrder = () => {
    if (!newOrder.trim()) return;
    set("orders", [...form.orders, newOrder.trim()]);
    setNewOrder("");
  };

  const canSubmit = form.action.trim() !== "" && form.reasoning.trim() !== "";

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setForm(generateTreatmentData())}
        >
          <Shuffle size={14} />
          Autofill (Test Data)
        </Button>
      </div>
      {/* Decision */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Stethoscope size={16} className="text-primary" />
            {stepLabel ?? "Treatment Decision"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Action <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. initiate_anticoagulation_therapy"
                value={form.action}
                onChange={(e) => set("action", e.target.value)}
              />
              <VoiceInputButton
                onTranscript={(t) =>
                  set("action", t.toLowerCase().replace(/\s+/g, "_"))
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Category
            </label>
            <Select
              value={form.action_category}
              onValueChange={(v) => set("action_category", v as ActionCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  "admission",
                  "triage",
                  "diagnostic",
                  "treatment",
                  "monitoring",
                  "consultation",
                  "transfer",
                  "procedure",
                  "discharge",
                ].map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Reasoning <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-2">
              <Textarea
                placeholder="Clinical reasoning for this decision..."
                value={form.reasoning}
                onChange={(e) => set("reasoning", e.target.value)}
                rows={3}
              />
              <VoiceInputButton
                onTranscript={(t) =>
                  set("reasoning", form.reasoning ? `${form.reasoning} ${t}` : t)
                }
                className="mt-1"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Guidelines Followed
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. ESC PE Guidelines 2019"
                value={form.guidelines}
                onChange={(e) => set("guidelines", e.target.value)}
              />
              <VoiceInputButton
                onTranscript={(t) => set("guidelines", t)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Medications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Pill size={16} className="text-primary" />
            Medications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Medication name"
              value={newMedName}
              onChange={(e) => setNewMedName(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Dose"
              value={newMedDose}
              onChange={(e) => setNewMedDose(e.target.value)}
              className="w-24"
            />
            <Select value={newMedRoute} onValueChange={setNewMedRoute}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IV">IV</SelectItem>
                <SelectItem value="PO">PO</SelectItem>
                <SelectItem value="SC">SC</SelectItem>
                <SelectItem value="IM">IM</SelectItem>
                <SelectItem value="topical">Topical</SelectItem>
              </SelectContent>
            </Select>
            <VoiceInputButton onTranscript={(t) => setNewMedName(t)} />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={addMedication}
            >
              <Plus size={14} />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {form.medications.map((m, i) => (
              <Badge key={i} variant="secondary" className="gap-1 text-xs">
                {m.name} {m.dose} ({m.route})
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "medications",
                      form.medications.filter((_, j) => j !== i),
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

      {/* Additional orders */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Additional Orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="e.g. CBC, chest X-ray, transfer to ICU"
              value={newOrder}
              onChange={(e) => setNewOrder(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addOrder();
                }
              }}
            />
            <VoiceInputButton onTranscript={(t) => setNewOrder(t)} />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={addOrder}
            >
              <Plus size={14} />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {form.orders.map((o, i) => (
              <Badge key={i} variant="secondary" className="gap-1 text-xs">
                {o}
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "orders",
                      form.orders.filter((_, j) => j !== i),
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
        <Button onClick={() => onComplete(form)} disabled={!canSubmit} className="gap-2">
          {submitLabel ?? "Complete & Review"}
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}

