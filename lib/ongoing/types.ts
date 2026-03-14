// Types for ongoing (in-progress) patients persisted in localStorage.

import type { AdmissionData } from "@/components/add-patient/admission-step";
import type { TriageData } from "@/components/add-patient/triage-step";
import type { DiagnosticData } from "@/components/add-patient/diagnostic-step";
import type { TreatmentData } from "@/components/add-patient/treatment-step";
import type { OutcomeData } from "@/components/add-patient/outcome-step";

export interface OngoingPatient {
  id: string;
  createdAt: string;
  updatedAt: string;
  currentStep: string;
  admissionData: AdmissionData | null;
  triageData: TriageData | null;
  diagnosticData: DiagnosticData | null;
  treatmentData: TreatmentData | null;
  assessments: DiagnosticData[];
  cycleTreatments: TreatmentData[];
  outcomeData: OutcomeData | null;
}

