"use client";

import { useState, useMemo, useCallback, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { usePatientData } from "@/hooks/use-patient-data";
import { useOngoingPatients } from "@/hooks/use-ongoing-patients";
import type { OngoingPatient } from "@/lib/ongoing/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AdmissionStep } from "@/components/add-patient/admission-step";
import type { AdmissionData } from "@/components/add-patient/admission-step";
import { TriageStep } from "@/components/add-patient/triage-step";
import type { TriageData } from "@/components/add-patient/triage-step";
import { DiagnosticStep } from "@/components/add-patient/diagnostic-step";
import type { DiagnosticData } from "@/components/add-patient/diagnostic-step";
import { TreatmentStep } from "@/components/add-patient/treatment-step";
import type { TreatmentData } from "@/components/add-patient/treatment-step";
import { OutcomeStep } from "@/components/add-patient/outcome-step";
import type { OutcomeData } from "@/components/add-patient/outcome-step";
import { SimilarityPanel } from "@/components/add-patient/similarity-panel";
import type { CurrentClinicalSnapshot } from "@/components/add-patient/similarity-panel";
import {
  findSimilarPatientsPartial,
  computeRiskFlags,
} from "@/lib/add-patient/similarity-engine";
import type { PartialPatient } from "@/lib/add-patient/similarity-engine";
import { buildPatientGraph } from "@/lib/add-patient/build-patient-graph";
import {
  FirstAid,
  Heartbeat,
  MagnifyingGlass,
  Stethoscope,
  Check,
  UserPlus,
  Plus,
  FloppyDisk,
  Trash,
  CircleNotch,
  FlagBanner,
  ArrowRight,
  Pencil,
  HourglassMedium,
} from "@phosphor-icons/react";

type StepId =
  | "admission"
  | "triage"
  | "diagnostic"
  | "treatment"
  | `assess-${number}`
  | `treat-${number}`
  | "outcome"
  | "summary";

export default function AddPatientPage() {
  return (
    <Suspense fallback={<div className="space-y-4 p-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>}>
      <AddPatientContent />
    </Suspense>
  );
}

function AddPatientContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ongoingId = searchParams.get("ongoing");

  const { patients, loading, error, savePatient, deletePatient } = usePatientData();
  const { getById: getOngoing, save: saveOngoing, remove: removeOngoing } = useOngoingPatients();

  const [currentStep, setCurrentStep] = useState<StepId>("admission");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  // Base step data
  const [admissionData, setAdmissionData] = useState<AdmissionData | null>(null);
  const [triageData, setTriageData] = useState<TriageData | null>(null);
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticData | null>(null);
  const [treatmentData, setTreatmentData] = useState<TreatmentData | null>(null);

  // Cycle data: strict alternating Assessment → Treatment
  const [assessments, setAssessments] = useState<DiagnosticData[]>([]);
  const [cycleTreatments, setCycleTreatments] = useState<TreatmentData[]>([]);

  // Final outcome
  const [outcomeData, setOutcomeData] = useState<OutcomeData | null>(null);

  // Editing indices (-1 = adding new)
  const [editingAssessIdx, setEditingAssessIdx] = useState(-1);
  const [editingTreatIdx, setEditingTreatIdx] = useState(-1);

  // Track if we've already loaded the ongoing patient (prevent re-loading on re-renders)
  const [ongoingLoaded, setOngoingLoaded] = useState(false);

  // Load ongoing patient from localStorage on mount
  useEffect(() => {
    if (!ongoingId || ongoingLoaded) return;
    const op = getOngoing(ongoingId);
    if (op) {
      if (op.admissionData) setAdmissionData(op.admissionData);
      if (op.triageData) setTriageData(op.triageData);
      if (op.diagnosticData) setDiagnosticData(op.diagnosticData);
      if (op.treatmentData) setTreatmentData(op.treatmentData);
      if (op.assessments.length) setAssessments(op.assessments);
      if (op.cycleTreatments.length) setCycleTreatments(op.cycleTreatments);
      if (op.outcomeData) setOutcomeData(op.outcomeData);
      setCurrentStep(op.currentStep as StepId);
    }
    setOngoingLoaded(true);
  }, [ongoingId, ongoingLoaded, getOngoing]);

  // Save as ongoing handler
  const handleSaveAsOngoing = useCallback(() => {
    if (!admissionData) return;
    const op: OngoingPatient = {
      id: ongoingId || `ongoing_${Date.now().toString(36)}`,
      createdAt: ongoingId ? (getOngoing(ongoingId)?.createdAt ?? new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentStep,
      admissionData,
      triageData,
      diagnosticData,
      treatmentData,
      assessments,
      cycleTreatments,
      outcomeData,
    };
    saveOngoing(op);
    router.push("/dashboard/ongoing");
  }, [admissionData, triageData, diagnosticData, treatmentData, assessments, cycleTreatments, outcomeData, currentStep, ongoingId, getOngoing, saveOngoing, router]);

  const completedSteps = useMemo(() => {
    let n = 0;
    if (admissionData) n++;
    if (triageData) n++;
    if (diagnosticData) n++;
    if (treatmentData) n++;
    n += assessments.length;
    n += cycleTreatments.length;
    if (outcomeData) n++;
    return n;
  }, [admissionData, triageData, diagnosticData, treatmentData, assessments, cycleTreatments, outcomeData]);

  // State invariants
  // needsAssessment: last action was a treatment (initial or cycle) → must assess
  const needsAssessment = assessments.length === cycleTreatments.length;
  // canTreatOrFinish: last action was an assessment → add treatment or finalize
  const canTreatOrFinish = assessments.length > cycleTreatments.length;

  // Build partial patient for similarity matching
  const partialPatient = useMemo<PartialPatient | null>(() => {
    if (!admissionData) return null;
    const pp: PartialPatient = {
      patient_name: admissionData.patient_name,
      age: admissionData.age,
      gender: admissionData.gender,
      weight_kg: admissionData.weight_kg,
      height_cm: admissionData.height_cm,
      chief_complaint: admissionData.chief_complaint,
      triage_code: admissionData.triage_code,
      admission_method: admissionData.admission_method,
      chronic_conditions: admissionData.chronic_conditions,
      allergies: admissionData.allergies,
      risk_factors: admissionData.risk_factors,
      completedSteps,
    };
    if (triageData) {
      pp.vitals = {
        systolic: triageData.systolic, diastolic: triageData.diastolic,
        heart_rate: triageData.heart_rate, respiratory_rate: triageData.respiratory_rate,
        oxygen_saturation: triageData.oxygen_saturation, temperature: triageData.temperature,
        gcs: triageData.gcs, pain: triageData.pain_score,
      };
      pp.symptoms = triageData.symptoms;
    }
    if (diagnosticData) {
      pp.diagnosis = {
        primary_name: diagnosticData.primary_name, primary_icd10: diagnosticData.primary_icd10,
        severity: diagnosticData.severity, acuity: diagnosticData.acuity,
        differentials: diagnosticData.differentials,
      };
      pp.lab_results = {
        hemoglobin: diagnosticData.hemoglobin, white_blood_cells: diagnosticData.white_blood_cells,
        creatinine: diagnosticData.creatinine, troponin: diagnosticData.troponin,
        d_dimer: diagnosticData.d_dimer, lactate: diagnosticData.lactate,
      };
    }
    if (treatmentData) {
      pp.treatment = {
        action: treatmentData.action, action_category: treatmentData.action_category,
        medications: treatmentData.medications.map((m) => m.name),
        reasoning: treatmentData.reasoning,
      };
    }
    // Build nodes from assessment/treatment cycles for similarity engine
    if (assessments.length > 0) {
      pp.nodes = assessments.map((a, i) => {
        const t = cycleTreatments[i];
        return {
          primary_name: a.primary_name,
          primary_icd10: a.primary_icd10,
          severity: a.severity,
          action: t?.action ?? "post_treatment_assessment",
          action_category: t?.action_category ?? "diagnostic",
          medications: (t?.medications ?? []).map((m) => m.name),
          complications: [],
        };
      });
    }
    return pp;
  }, [admissionData, triageData, diagnosticData, treatmentData, assessments, cycleTreatments, completedSteps]);

  // Build clinical snapshot for the similarity panel
  const currentSnapshot = useMemo<CurrentClinicalSnapshot | undefined>(() => {
    const latestDiag = assessments.length > 0 ? assessments[assessments.length - 1] : diagnosticData;
    const latestTreat = cycleTreatments.length > 0 ? cycleTreatments[cycleTreatments.length - 1] : treatmentData;
    if (!latestDiag) return undefined;
    return {
      primary_name: latestDiag.primary_name,
      primary_icd10: latestDiag.primary_icd10,
      severity: latestDiag.severity,
      action: latestTreat?.action,
      action_category: latestTreat?.action_category,
      medications: (latestTreat?.medications ?? []).map((m) => ({ name: m.name })),
      complications: [],
      systolic: triageData?.systolic,
      diastolic: triageData?.diastolic,
      heart_rate: triageData?.heart_rate,
      oxygen_saturation: triageData?.oxygen_saturation,
    };
  }, [assessments, cycleTreatments, diagnosticData, treatmentData, triageData]);

  // Similarity computation
  const matches = useMemo(() => {
    if (!partialPatient || !patients.length) return [];
    return findSimilarPatientsPartial(partialPatient, patients);
  }, [partialPatient, patients]);

  const alerts = useMemo(() => {
    if (!partialPatient) return [];
    return computeRiskFlags(matches, partialPatient);
  }, [matches, partialPatient]);

  // ─── Step handlers ───

  const handleAdmission = useCallback((data: AdmissionData) => {
    setAdmissionData(data); setCurrentStep("triage");
  }, []);
  const handleTriage = useCallback((data: TriageData) => {
    setTriageData(data); setCurrentStep("diagnostic");
  }, []);
  const handleDiagnostic = useCallback((data: DiagnosticData) => {
    setDiagnosticData(data); setCurrentStep("treatment");
  }, []);
  const handleTreatment = useCallback((data: TreatmentData) => {
    setTreatmentData(data); setCurrentStep("summary");
  }, []);

  // Assessment completed
  const handleAssessmentComplete = useCallback((data: DiagnosticData) => {
    setAssessments((prev) => {
      if (editingAssessIdx >= 0 && editingAssessIdx < prev.length) {
        const copy = [...prev];
        copy[editingAssessIdx] = data;
        return copy;
      }
      return [...prev, data];
    });
    setEditingAssessIdx(-1);
    setCurrentStep("summary");
  }, [editingAssessIdx]);

  // Cycle treatment completed
  const handleCycleTreatmentComplete = useCallback((data: TreatmentData) => {
    setCycleTreatments((prev) => {
      if (editingTreatIdx >= 0 && editingTreatIdx < prev.length) {
        const copy = [...prev];
        copy[editingTreatIdx] = data;
        return copy;
      }
      return [...prev, data];
    });
    setEditingTreatIdx(-1);
    setCurrentStep("summary");
  }, [editingTreatIdx]);

  // Outcome completed
  const handleOutcomeComplete = useCallback((data: OutcomeData) => {
    setOutcomeData(data);
    setCurrentStep("summary");
  }, []);

  // Navigation helpers
  const handleAddAssessment = () => {
    setEditingAssessIdx(-1);
    setCurrentStep(`assess-${assessments.length}`);
  };
  const handleAddCycleTreatment = () => {
    setEditingTreatIdx(-1);
    setCurrentStep(`treat-${cycleTreatments.length}`);
  };
  const handleEditAssessment = (idx: number) => {
    setEditingAssessIdx(idx);
    setCurrentStep(`assess-${idx}`);
  };
  const handleEditCycleTreatment = (idx: number) => {
    setEditingTreatIdx(idx);
    setCurrentStep(`treat-${idx}`);
  };
  const handleGoToOutcome = () => {
    setCurrentStep("outcome");
  };

  // Remove last cycle (assessment + optional treatment)
  const handleRemoveLastCycle = () => {
    if (cycleTreatments.length === assessments.length) {
      // Last item is a treatment — remove it
      setCycleTreatments((prev) => prev.slice(0, -1));
    } else {
      // Last item is an assessment (no treatment yet) — remove it
      setAssessments((prev) => prev.slice(0, -1));
    }
    // Also clear outcome if it was set
    setOutcomeData(null);
  };

  // Save & delete
  const handleSave = async () => {
    if (!admissionData || !triageData || !diagnosticData || !treatmentData || !outcomeData) return;
    setSaving(true);
    setSaveError(null);
    try {
      const graph = buildPatientGraph(
        admissionData, triageData, diagnosticData, treatmentData,
        assessments, cycleTreatments, outcomeData,
      );
      await savePatient(graph);
      setSavedId(graph.patient_id);
      // Remove from ongoing if this was an ongoing patient
      if (ongoingId) {
        removeOngoing(ongoingId);
      }
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!savedId) return;
    setSaving(true);
    try {
      await deletePatient(savedId);
      setSavedId(null);
      setAdmissionData(null); setTriageData(null); setDiagnosticData(null);
      setTreatmentData(null); setAssessments([]); setCycleTreatments([]);
      setOutcomeData(null); setCurrentStep("admission");
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  if (error) return <p className="text-destructive p-12 text-center">Error: {error}</p>;
  if (loading) return <div className="space-y-4 p-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;

  const isAssessStep = typeof currentStep === "string" && currentStep.startsWith("assess-");
  const isTreatStep = typeof currentStep === "string" && currentStep.startsWith("treat-");
  const assessStepIdx = isAssessStep ? parseInt(currentStep.split("-")[1], 10) : -1;
  const treatStepIdx = isTreatStep ? parseInt(currentStep.split("-")[1], 10) : -1;
  const isSummary = currentStep === "summary";
  const isOutcome = currentStep === "outcome";
  const hasBaseSteps = !!(admissionData && triageData && diagnosticData && treatmentData);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            {ongoingId ? (
              <><HourglassMedium size={22} className="text-primary" /> Continue: {admissionData?.patient_name ?? "Ongoing Patient"}</>
            ) : (
              <><UserPlus size={22} className="text-primary" /> Add New Patient</>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            {ongoingId
              ? "Continue adding details to this ongoing patient. Save progress at any time."
              : "Record patient information step by step. Save as ongoing to continue later."}
          </p>
        </div>
        {/* Save as Ongoing button — always visible after admission is completed */}
        {admissionData && !savedId && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs shrink-0"
            onClick={handleSaveAsOngoing}
          >
            <HourglassMedium size={14} weight="bold" />
            {ongoingId ? "Save Progress" : "Mark as Ongoing"}
          </Button>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex flex-wrap items-center gap-1">
        {/* Base steps */}
        {([
          { id: "admission" as const, label: "Admission", icon: FirstAid, done: !!admissionData },
          { id: "triage" as const, label: "Triage", icon: Heartbeat, done: !!triageData },
          { id: "diagnostic" as const, label: "Diagnosis", icon: MagnifyingGlass, done: !!diagnosticData },
          { id: "treatment" as const, label: "Treatment", icon: Stethoscope, done: !!treatmentData },
        ]).map((step, i, arr) => {
          const isCurrent = currentStep === step.id;
          const Icon = step.icon;
          return (
            <div key={step.id} className="flex items-center gap-1">
              <button
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  isCurrent ? "bg-primary text-primary-foreground"
                    : step.done ? "bg-primary/15 text-primary cursor-pointer"
                      : "bg-muted text-muted-foreground"
                }`}
                disabled={!step.done && !isCurrent}
                onClick={() => { if (step.done) setCurrentStep(step.id); }}
              >
                {step.done ? <Check size={12} weight="bold" /> : <Icon size={12} />}
                {step.label}
              </button>
              {i < arr.length - 1 && <Separator className="w-3" />}
            </div>
          );
        })}

        {/* Dynamic cycle pills: Assess 1 → Treat 2 → Assess 2 → Treat 3 → ... */}
        {assessments.map((_, i) => (
          <div key={`assess-${i}`} className="flex items-center gap-1">
            <Separator className="w-3" />
            <button
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                currentStep === `assess-${i}` ? "bg-primary text-primary-foreground"
                  : "bg-blue-500/15 text-blue-600 cursor-pointer"
              }`}
              onClick={() => handleEditAssessment(i)}
            >
              <MagnifyingGlass size={10} weight="bold" />
              Assess {i + 1}
            </button>
            {/* Corresponding cycle treatment (if it exists) */}
            {i < cycleTreatments.length && (
              <>
                <Separator className="w-3" />
                <button
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    currentStep === `treat-${i}` ? "bg-primary text-primary-foreground"
                      : "bg-emerald-500/15 text-emerald-600 cursor-pointer"
                  }`}
                  onClick={() => handleEditCycleTreatment(i)}
                >
                  <Stethoscope size={10} weight="bold" />
                  Treat {i + 2}
                </button>
              </>
            )}
          </div>
        ))}

        {/* Outcome pill */}
        {outcomeData && (
          <>
            <Separator className="w-3" />
            <button
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isOutcome ? "bg-primary text-primary-foreground"
                  : "bg-amber-500/15 text-amber-600 cursor-pointer"
              }`}
              onClick={() => setCurrentStep("outcome")}
            >
              <FlagBanner size={10} weight="bold" />
              Outcome
            </button>
          </>
        )}

        {/* Summary pill */}
        {hasBaseSteps && (
          <>
            <Separator className="w-3" />
            <button
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isSummary ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary cursor-pointer"
              }`}
              onClick={() => setCurrentStep("summary")}
            >
              <Check size={10} weight="bold" />
              Summary
            </button>
          </>
        )}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          {currentStep === "admission" && (
            <AdmissionStep data={admissionData ?? {}} onComplete={handleAdmission} />
          )}
          {currentStep === "triage" && (
            <TriageStep data={triageData ?? {}} onComplete={handleTriage} onBack={() => setCurrentStep("admission")} />
          )}
          {currentStep === "diagnostic" && (
            <DiagnosticStep data={diagnosticData ?? {}} onComplete={handleDiagnostic} onBack={() => setCurrentStep("triage")} />
          )}
          {currentStep === "treatment" && (
            <TreatmentStep data={treatmentData ?? {}} onComplete={handleTreatment} onBack={() => setCurrentStep("diagnostic")} />
          )}
          {isAssessStep && (
            <DiagnosticStep
              data={editingAssessIdx >= 0 && editingAssessIdx < assessments.length ? assessments[editingAssessIdx] : {}}
              onComplete={handleAssessmentComplete}
              onBack={() => setCurrentStep("summary")}
              stepLabel={`Post-Treatment Assessment #${assessStepIdx + 1}`}
              submitLabel="Complete Assessment"
            />
          )}
          {isTreatStep && (
            <TreatmentStep
              data={editingTreatIdx >= 0 && editingTreatIdx < cycleTreatments.length ? cycleTreatments[editingTreatIdx] : {}}
              onComplete={handleCycleTreatmentComplete}
              onBack={() => setCurrentStep("summary")}
              stepLabel={`Follow-up Treatment #${treatStepIdx + 2}`}
              submitLabel="Save Treatment"
            />
          )}
          {isOutcome && (
            <OutcomeStep
              data={outcomeData ?? {}}
              onComplete={handleOutcomeComplete}
              onBack={() => setCurrentStep("summary")}
            />
          )}
          {isSummary && hasBaseSteps && (
            <SummaryPanel
              admission={admissionData}
              triage={triageData}
              diagnostic={diagnosticData}
              treatment={treatmentData}
              assessments={assessments}
              cycleTreatments={cycleTreatments}
              outcomeData={outcomeData}
              matches={matches}
              alerts={alerts}
              needsAssessment={needsAssessment}
              canTreatOrFinish={canTreatOrFinish}
              onAddAssessment={handleAddAssessment}
              onAddTreatment={handleAddCycleTreatment}
              onEditAssessment={handleEditAssessment}
              onEditTreatment={handleEditCycleTreatment}
              onGoToOutcome={handleGoToOutcome}
              onRemoveLastCycle={handleRemoveLastCycle}
              onSave={handleSave}
              onDelete={handleDelete}
              onSaveOngoing={handleSaveAsOngoing}
              saving={saving}
              saveError={saveError}
              savedId={savedId}
              isOngoing={!!ongoingId}
            />
          )}
        </div>
        <div>
          <SimilarityPanel
            matches={matches}
            alerts={alerts}
            allPatients={patients}
            completedSteps={completedSteps}
            currentSnapshot={currentSnapshot}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Summary panel with cycle management, outcome, save / delete ───

function SummaryPanel({
  admission, triage, diagnostic, treatment,
  assessments, cycleTreatments, outcomeData,
  matches, alerts,
  needsAssessment, canTreatOrFinish,
  onAddAssessment, onAddTreatment,
  onEditAssessment, onEditTreatment,
  onGoToOutcome, onRemoveLastCycle,
  onSave, onDelete, onSaveOngoing, saving, saveError, savedId, isOngoing,
}: {
  admission: AdmissionData;
  triage: TriageData;
  diagnostic: DiagnosticData;
  treatment: TreatmentData;
  assessments: DiagnosticData[];
  cycleTreatments: TreatmentData[];
  outcomeData: OutcomeData | null;
  matches: { length: number };
  alerts: { length: number };
  needsAssessment: boolean;
  canTreatOrFinish: boolean;
  onAddAssessment: () => void;
  onAddTreatment: () => void;
  onEditAssessment: (idx: number) => void;
  onEditTreatment: (idx: number) => void;
  onGoToOutcome: () => void;
  onRemoveLastCycle: () => void;
  onSave: () => void;
  onDelete: () => void;
  onSaveOngoing: () => void;
  saving: boolean;
  saveError: string | null;
  savedId: string | null;
  isOngoing: boolean;
}) {
  const totalNodes = 1 + assessments.length + cycleTreatments.length;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check size={20} className="text-emerald-500" weight="bold" />
              <h2 className="text-lg font-bold">Patient Record</h2>
            </div>
            <div className="flex gap-2">
              {savedId ? (
                <Button variant="destructive" size="sm" className="gap-1.5 text-xs" onClick={onDelete} disabled={saving}>
                  {saving ? <CircleNotch size={14} className="animate-spin" /> : <Trash size={14} />}
                  Delete Patient
                </Button>
              ) : (
                <>
                  {!outcomeData && (
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onSaveOngoing}>
                      <HourglassMedium size={14} weight="bold" />
                      {isOngoing ? "Save Progress" : "Mark as Ongoing"}
                    </Button>
                  )}
                  {outcomeData && (
                    <Button size="sm" className="gap-1.5 text-xs" onClick={onSave} disabled={saving}>
                      {saving ? <CircleNotch size={14} className="animate-spin" /> : <FloppyDisk size={14} />}
                      Save to Database
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {saveError && <p className="text-xs text-destructive">{saveError}</p>}
          {savedId && (
            <p className="text-xs text-emerald-600">
              ✓ Saved as <span className="font-mono">{savedId}</span>
            </p>
          )}

          <Separator />

          {/* Base info summary */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div><span className="text-muted-foreground">Patient</span><p className="font-medium">{admission.patient_name}</p></div>
            <div><span className="text-muted-foreground">Age / Gender</span><p className="font-medium">{admission.age}y / {admission.gender}</p></div>
            <div><span className="text-muted-foreground">Chief Complaint</span><p className="font-medium">{admission.chief_complaint}</p></div>
            <div><span className="text-muted-foreground">Triage</span><p className="font-medium">{admission.triage_code}</p></div>
            <div><span className="text-muted-foreground">Vitals</span><p className="font-medium">BP {triage.systolic}/{triage.diastolic} · HR {triage.heart_rate} · SpO₂ {triage.oxygen_saturation}%</p></div>
            <div><span className="text-muted-foreground">Initial Diagnosis</span><p className="font-medium">{diagnostic.primary_name.replaceAll("_", " ")} ({diagnostic.primary_icd10})</p></div>
            <div><span className="text-muted-foreground">Initial Treatment</span><p className="font-medium">{treatment.action.replaceAll("_", " ")}</p></div>
            <div><span className="text-muted-foreground">Medications</span><p className="font-medium">{treatment.medications.length > 0 ? treatment.medications.map((m) => m.name).join(", ") : "None"}</p></div>
          </div>

          {/* Assessment / Treatment cycles */}
          {assessments.length > 0 && (
            <>
              <Separator />
              <h3 className="text-xs font-semibold">Treatment Cycles ({assessments.length} assessment{assessments.length > 1 ? "s" : ""}, {cycleTreatments.length} follow-up treatment{cycleTreatments.length !== 1 ? "s" : ""})</h3>
              <div className="space-y-2">
                {assessments.map((assess, i) => {
                  const treat = cycleTreatments[i];
                  return (
                    <div key={i} className="rounded-lg border p-3 space-y-2">
                      {/* Assessment row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs">
                          <Badge className="bg-blue-500/15 text-blue-600 text-[9px]">Assess {i + 1}</Badge>
                          <span className="font-medium">{assess.primary_name.replaceAll("_", " ")}</span>
                          <span className="text-muted-foreground">({assess.severity})</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEditAssessment(i)}>
                          <Pencil size={12} />
                        </Button>
                      </div>
                      {/* Treatment row (if it exists) */}
                      {treat && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs">
                            <Badge className="bg-emerald-500/15 text-emerald-600 text-[9px]">Treat {i + 2}</Badge>
                            <span className="font-medium">{treat.action.replaceAll("_", " ")}</span>
                            {treat.medications.length > 0 && (
                              <span className="text-muted-foreground">
                                ({treat.medications.map((m) => m.name).join(", ")})
                              </span>
                            )}
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEditTreatment(i)}>
                            <Pencil size={12} />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Outcome display */}
          {outcomeData && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <FlagBanner size={14} className="text-primary" weight="bold" />
                  <span className="font-semibold">Final Outcome:</span>
                  <Badge className={
                    outcomeData.status === "HEALED" ? "bg-emerald-500/15 text-emerald-600"
                    : outcomeData.status === "HEALED_WITH_COMPLICATIONS" ? "bg-amber-500/15 text-amber-600"
                    : "bg-red-500/15 text-red-600"
                  }>
                    {outcomeData.status.replaceAll("_", " ")}
                  </Badge>
                  <span className="text-muted-foreground">→ {outcomeData.discharge_destination.replaceAll("_", " ")}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onGoToOutcome}>
                  <Pencil size={12} />
                </Button>
              </div>
              {outcomeData.complications.length > 0 && (
                <div className="flex flex-wrap gap-1 ml-6">
                  {outcomeData.complications.map((c, i) => (
                    <Badge key={i} variant="secondary" className="text-[9px] border-amber-500/30 text-amber-600">
                      {c.replaceAll("_", " ")}
                    </Badge>
                  ))}
                </div>
              )}
            </>
          )}

          <Separator />

          {/* Action buttons — enforce the cycle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs">
              <Badge variant="outline" className="text-[9px]">{matches.length} similar patients</Badge>
              {alerts.length > 0 && <Badge className="bg-red-500/15 text-red-600 text-[9px]">{alerts.length} alert(s)</Badge>}
              <Badge variant="outline" className="text-[9px]">{totalNodes} total nodes</Badge>
            </div>
            <div className="flex gap-2">
              {/* Remove last cycle */}
              {(assessments.length > 0 || outcomeData) && !savedId && (
                <Button variant="outline" size="sm" className="gap-1.5 text-xs text-destructive" onClick={onRemoveLastCycle}>
                  <Trash size={14} />
                  Undo Last
                </Button>
              )}

              {/* Add Assessment button — only when last step was a treatment */}
              {needsAssessment && !outcomeData && !savedId && (
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onAddAssessment}>
                  <MagnifyingGlass size={14} />
                  Add Assessment
                </Button>
              )}

              {/* After an assessment: Add Treatment or Finalize */}
              {canTreatOrFinish && !outcomeData && !savedId && (
                <>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onAddTreatment}>
                    <Plus size={14} />
                    Add Follow-up Treatment
                  </Button>
                  <Button size="sm" className="gap-1.5 text-xs" onClick={onGoToOutcome}>
                    <FlagBanner size={14} />
                    Finalize Case
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Hint text */}
          {!outcomeData && !savedId && (
            <p className="text-[10px] text-muted-foreground italic">
              {needsAssessment
                ? "→ After the treatment, add a diagnostic assessment to evaluate the patient's response."
                : "→ Based on the assessment, add another treatment or finalize the case with an outcome."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
