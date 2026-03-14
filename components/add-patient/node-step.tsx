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
  Heartbeat,
  Pill,
  Stethoscope,
  MagnifyingGlass,
  Plus,
  X,
  ArrowRight,
  ArrowLeft,
  Shuffle,
} from "@phosphor-icons/react";
import type { ActionCategory } from "@/lib/types/decision";
import { generateNodeData } from "@/lib/add-patient/mock-generators";

/** A single clinical decision node — captures health state + diagnosis + decision */
export interface NodeData {
  // Health state
  systolic: number;
  diastolic: number;
  heart_rate: number;
  respiratory_rate: number;
  oxygen_saturation: number;
  on_oxygen: boolean;
  temperature: number;
  gcs: number;
  pain_score: number;
  // Diagnosis
  primary_name: string;
  primary_icd10: string;
  severity: string;
  confidence: number;
  // Active medications
  medications: Array<{ name: string; dose: string; route: string }>;
  // Active complications
  complications: string[];
  // Decision
  action: string;
  action_category: ActionCategory;
  reasoning: string;
  guidelines: string;
  orders: string[];
  // Lab highlights (optional)
  hemoglobin?: number;
  white_blood_cells?: number;
  creatinine?: number;
  troponin?: number;
  lactate?: number;
}

interface NodeStepProps {
  nodeIndex: number;
  data: Partial<NodeData>;
  onComplete: (data: NodeData) => void;
  onBack: () => void;
}

const EMPTY: NodeData = {
  systolic: 120, diastolic: 80, heart_rate: 80, respiratory_rate: 16,
  oxygen_saturation: 98, on_oxygen: false, temperature: 36.8, gcs: 15, pain_score: 0,
  primary_name: "", primary_icd10: "", severity: "moderate", confidence: 0.8,
  medications: [], complications: [],
  action: "", action_category: "treatment", reasoning: "", guidelines: "", orders: [],
};

export function NodeStep({ nodeIndex, data, onComplete, onBack }: NodeStepProps) {
  const [form, setForm] = useState<NodeData>({ ...EMPTY, ...data });
  const [newMedName, setNewMedName] = useState("");
  const [newMedDose, setNewMedDose] = useState("");
  const [newMedRoute, setNewMedRoute] = useState("IV");
  const [newComp, setNewComp] = useState("");
  const [newOrder, setNewOrder] = useState("");

  const set = <K extends keyof NodeData>(key: K, val: NodeData[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const addMed = () => {
    if (!newMedName.trim()) return;
    set("medications", [...form.medications, { name: newMedName.trim(), dose: newMedDose.trim(), route: newMedRoute }]);
    setNewMedName(""); setNewMedDose("");
  };
  const addComp = () => {
    if (!newComp.trim()) return;
    set("complications", [...form.complications, newComp.trim()]);
    setNewComp("");
  };
  const addOrder = () => {
    if (!newOrder.trim()) return;
    set("orders", [...form.orders, newOrder.trim()]);
    setNewOrder("");
  };

  const canSubmit = form.action.trim() !== "" && form.primary_name.trim() !== "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Node #{nodeIndex + 1} — Clinical Decision Point</h3>
        <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs"
          onClick={() => setForm(generateNodeData())}
        >
          <Shuffle size={14} />
          Autofill (Test)
        </Button>
      </div>

      {/* ── Vitals ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xs">
            <Heartbeat size={14} className="text-primary" /> Current Vitals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {([
              ["systolic", "SBP", "number"],
              ["diastolic", "DBP", "number"],
              ["heart_rate", "HR", "number"],
              ["respiratory_rate", "RR", "number"],
              ["oxygen_saturation", "SpO₂%", "number"],
              ["temperature", "Temp°C", "number"],
              ["gcs", "GCS", "number"],
              ["pain_score", "Pain", "number"],
            ] as const).map(([key, label]) => (
              <div key={key} className="space-y-0.5">
                <label className="text-[9px] text-muted-foreground">{label}</label>
                <Input type="number" className="h-7 text-xs"
                  value={form[key]} onChange={(e) => set(key, Number(e.target.value))} />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant={form.on_oxygen ? "default" : "outline"}
              size="sm" className="text-[10px] h-6" onClick={() => set("on_oxygen", !form.on_oxygen)}>
              O₂: {form.on_oxygen ? "Yes" : "No"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Diagnosis ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xs">
            <MagnifyingGlass size={14} className="text-primary" /> Diagnosis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <label className="text-[9px] text-muted-foreground">Diagnosis *</label>
              <div className="flex gap-1">
                <Input className="h-7 text-xs" placeholder="e.g. sepsis"
                  value={form.primary_name} onChange={(e) => set("primary_name", e.target.value)} />
                <VoiceInputButton onTranscript={(t) => set("primary_name", t.toLowerCase().replaceAll(" ", "_"))} />
              </div>
            </div>
            <div className="space-y-0.5">
              <label className="text-[9px] text-muted-foreground">ICD-10</label>
              <Input className="h-7 text-xs" placeholder="e.g. A41.9"
                value={form.primary_icd10} onChange={(e) => set("primary_icd10", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <label className="text-[9px] text-muted-foreground">Severity</label>
              <Select value={form.severity} onValueChange={(v) => set("severity", v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mild">Mild</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="severe">Severe</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-0.5">
              <label className="text-[9px] text-muted-foreground">Confidence</label>
              <Input type="number" min={0} max={1} step={0.05} className="h-7 text-xs"
                value={form.confidence} onChange={(e) => set("confidence", Number(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Key labs ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs">Key Labs (optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {([
              ["hemoglobin", "Hgb g/dL"],
              ["white_blood_cells", "WBC ×10³"],
              ["creatinine", "Creat mg/dL"],
              ["troponin", "Trop ng/mL"],
              ["lactate", "Lact mmol/L"],
            ] as const).map(([key, label]) => (
              <div key={key} className="space-y-0.5">
                <label className="text-[8px] text-muted-foreground">{label}</label>
                <Input type="number" step="0.01" className="h-7 text-xs"
                  value={form[key] ?? ""} onChange={(e) =>
                    set(key, e.target.value ? Number(e.target.value) : undefined)} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Decision ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xs">
            <Stethoscope size={14} className="text-primary" /> Decision
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <label className="text-[9px] text-muted-foreground">Action *</label>
              <div className="flex gap-1">
                <Input className="h-7 text-xs" placeholder="e.g. escalate_antibiotics"
                  value={form.action} onChange={(e) => set("action", e.target.value)} />
                <VoiceInputButton onTranscript={(t) => set("action", t.toLowerCase().replaceAll(" ", "_"))} />
              </div>
            </div>
            <div className="space-y-0.5">
              <label className="text-[9px] text-muted-foreground">Category</label>
              <Select value={form.action_category}
                onValueChange={(v) => set("action_category", v as ActionCategory)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["admission","triage","diagnostic","treatment","monitoring","consultation","transfer","procedure","discharge"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-0.5">
            <label className="text-[9px] text-muted-foreground">Reasoning *</label>
            <div className="flex gap-1">
              <Textarea rows={2} className="text-xs" placeholder="Clinical reasoning..."
                value={form.reasoning} onChange={(e) => set("reasoning", e.target.value)} />
              <VoiceInputButton onTranscript={(t) => set("reasoning", form.reasoning ? `${form.reasoning} ${t}` : t)} className="mt-0.5" />
            </div>
          </div>
          <div className="space-y-0.5">
            <label className="text-[9px] text-muted-foreground">Guidelines</label>
            <Input className="h-7 text-xs" placeholder="e.g. Surviving Sepsis Campaign 2021"
              value={form.guidelines} onChange={(e) => set("guidelines", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* ── Medications ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xs">
            <Pill size={14} className="text-primary" /> Active Medications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-1">
            <Input className="h-7 text-xs flex-1" placeholder="Name" value={newMedName} onChange={(e) => setNewMedName(e.target.value)} />
            <Input className="h-7 text-xs w-20" placeholder="Dose" value={newMedDose} onChange={(e) => setNewMedDose(e.target.value)} />
            <Select value={newMedRoute} onValueChange={setNewMedRoute}>
              <SelectTrigger className="h-7 text-xs w-16"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="IV">IV</SelectItem><SelectItem value="PO">PO</SelectItem>
                <SelectItem value="SC">SC</SelectItem><SelectItem value="IM">IM</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={addMed}><Plus size={12} /></Button>
          </div>
          <div className="flex flex-wrap gap-1">{form.medications.map((m, i) => (
            <Badge key={i} variant="secondary" className="gap-1 text-[9px]">
              {m.name} {m.dose} ({m.route})
              <button type="button" onClick={() => set("medications", form.medications.filter((_, j) => j !== i))}><X size={8} /></button>
            </Badge>
          ))}</div>
        </CardContent>
      </Card>

      {/* ── Complications ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs">Active Complications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-1">
            <Input className="h-7 text-xs" placeholder="e.g. acute_kidney_injury"
              value={newComp} onChange={(e) => setNewComp(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addComp(); } }} />
            <VoiceInputButton onTranscript={(t) => setNewComp(t)} />
            <Button type="button" variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={addComp}><Plus size={12} /></Button>
          </div>
          <div className="flex flex-wrap gap-1">{form.complications.map((c, i) => (
            <Badge key={i} variant="secondary" className="gap-1 text-[9px] border-amber-500/30 text-amber-600">
              {c}
              <button type="button" onClick={() => set("complications", form.complications.filter((_, j) => j !== i))}><X size={8} /></button>
            </Badge>
          ))}</div>
        </CardContent>
      </Card>

      {/* ── Orders ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs">Orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-1">
            <Input className="h-7 text-xs" placeholder="e.g. CT scan, ECG, transfer to ICU"
              value={newOrder} onChange={(e) => setNewOrder(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOrder(); } }} />
            <VoiceInputButton onTranscript={(t) => setNewOrder(t)} />
            <Button type="button" variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={addOrder}><Plus size={12} /></Button>
          </div>
          <div className="flex flex-wrap gap-1">{form.orders.map((o, i) => (
            <Badge key={i} variant="secondary" className="gap-1 text-[9px]">
              {o}
              <button type="button" onClick={() => set("orders", form.orders.filter((_, j) => j !== i))}><X size={8} /></button>
            </Badge>
          ))}</div>
        </CardContent>
      </Card>

      {/* ── Navigation ── */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2 text-xs">
          <ArrowLeft size={14} /> Back
        </Button>
        <Button onClick={() => onComplete(form)} disabled={!canSubmit} className="gap-2 text-xs">
          Save Node #{nodeIndex + 1}
          <ArrowRight size={14} />
        </Button>
      </div>
    </div>
  );
}

