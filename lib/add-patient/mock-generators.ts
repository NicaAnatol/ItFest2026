// Realistic mock data generators for each step of the Add Patient wizard.
// Mirrors the distributions from scripts/generate-patient-flows.mjs.

import type { TriageCode } from "@/lib/types/patient";
import type { ActionCategory } from "@/lib/types/decision";
import type { AdmissionData } from "@/components/add-patient/admission-step";
import type { TriageData } from "@/components/add-patient/triage-step";
import type { DiagnosticData } from "@/components/add-patient/diagnostic-step";
import type { TreatmentData } from "@/components/add-patient/treatment-step";
import type { NodeData } from "@/components/add-patient/node-step";
import type { OutcomeData } from "@/components/add-patient/outcome-step";

// ─── Seeded helpers ───

function rng() {
  return Math.random();
}
function randInt(min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// ─── Reference data (subset from generator) ───

const FIRST_NAMES_M = [
  "Ion", "Andrei", "Mihai", "Alexandru", "Stefan", "George",
  "Cristian", "Daniel", "Adrian", "Florin", "Marius", "Bogdan",
];
const FIRST_NAMES_F = [
  "Maria", "Elena", "Ana", "Ioana", "Andreea", "Cristina",
  "Alina", "Mihaela", "Adriana", "Roxana", "Laura", "Simona",
];
const LAST_NAMES = [
  "Popescu", "Ionescu", "Popa", "Stan", "Dumitru", "Barbu",
  "Stoica", "Cristea", "Rusu", "Munteanu", "Lazar", "Radu",
];

const DIAGNOSES = [
  { name: "bilateral_pulmonary_embolism", icd10: "I26.99", severities: ["moderate", "severe"], acuity: "acute", complaints: ["chest pain and dyspnea", "sudden shortness of breath", "pleuritic chest pain"], treatments: ["initiate_anticoagulation_therapy"], meds: [{ name: "Heparin", dose: "5000 IU bolus then 1000 IU/h", route: "IV" }, { name: "Enoxaparin", dose: "1mg/kg", route: "SC" }], category: "cardiovascular" },
  { name: "acute_myocardial_infarction_STEMI", icd10: "I21.0", severities: ["severe", "critical"], acuity: "acute", complaints: ["crushing chest pain radiating to left arm", "chest tightness with diaphoresis"], treatments: ["emergent_PCI_catheterization"], meds: [{ name: "Aspirin", dose: "300mg", route: "PO" }, { name: "Heparin", dose: "60 IU/kg bolus", route: "IV" }, { name: "Ticagrelor", dose: "180mg", route: "PO" }], category: "cardiovascular" },
  { name: "acute_myocardial_infarction_NSTEMI", icd10: "I21.4", severities: ["moderate", "severe"], acuity: "acute", complaints: ["chest pain at rest", "intermittent chest pressure"], treatments: ["medical_management_and_risk_stratification"], meds: [{ name: "Aspirin", dose: "300mg", route: "PO" }, { name: "Metoprolol", dose: "25mg", route: "PO" }], category: "cardiovascular" },
  { name: "community_acquired_pneumonia", icd10: "J18.9", severities: ["mild", "moderate", "severe"], acuity: "acute", complaints: ["productive cough with fever", "fever and pleuritic chest pain", "cough and shortness of breath"], treatments: ["initiate_empiric_antibiotic_therapy"], meds: [{ name: "Ceftriaxone", dose: "2g", route: "IV" }, { name: "Azithromycin", dose: "500mg", route: "IV" }], category: "respiratory" },
  { name: "acute_ischemic_stroke", icd10: "I63.9", severities: ["moderate", "severe", "critical"], acuity: "acute", complaints: ["sudden left-sided weakness", "speech difficulty and facial droop", "sudden confusion and hemiparesis"], treatments: ["administer_IV_thrombolysis"], meds: [{ name: "Alteplase", dose: "0.9mg/kg", route: "IV" }, { name: "Aspirin", dose: "325mg", route: "PO" }], category: "neurological" },
  { name: "acute_appendicitis", icd10: "K35.80", severities: ["mild", "moderate"], acuity: "acute", complaints: ["right lower quadrant pain", "periumbilical pain migrating to RLQ", "nausea and abdominal pain"], treatments: ["surgical_appendectomy"], meds: [{ name: "Cefazolin", dose: "2g", route: "IV" }, { name: "Metronidazole", dose: "500mg", route: "IV" }], category: "surgical" },
  { name: "hip_fracture", icd10: "S72.009A", severities: ["moderate", "severe"], acuity: "acute", complaints: ["fall with inability to bear weight", "hip pain after mechanical fall"], treatments: ["surgical_fixation_ORIF"], meds: [{ name: "Morphine", dose: "4mg", route: "IV" }, { name: "Enoxaparin", dose: "40mg", route: "SC" }], category: "orthopedic" },
  { name: "sepsis", icd10: "A41.9", severities: ["severe", "critical"], acuity: "acute", complaints: ["fever with altered mental status", "high fever with hypotension", "rigors and confusion"], treatments: ["initiate_sepsis_bundle_therapy"], meds: [{ name: "Piperacillin-Tazobactam", dose: "4.5g", route: "IV" }, { name: "Normal Saline", dose: "30mL/kg bolus", route: "IV" }, { name: "Norepinephrine", dose: "0.1mcg/kg/min", route: "IV" }], category: "infectious" },
  { name: "diabetic_ketoacidosis", icd10: "E11.10", severities: ["moderate", "severe"], acuity: "acute", complaints: ["nausea and vomiting with polyuria", "abdominal pain and confusion"], treatments: ["initiate_DKA_protocol"], meds: [{ name: "Insulin Regular", dose: "0.1 U/kg/h", route: "IV" }, { name: "Normal Saline", dose: "1L/h", route: "IV" }, { name: "Potassium Chloride", dose: "20mEq", route: "IV" }], category: "endocrine" },
  { name: "COPD_exacerbation", icd10: "J44.1", severities: ["moderate", "severe"], acuity: "acute", complaints: ["worsening dyspnea", "increased sputum production", "wheezing and shortness of breath"], treatments: ["initiate_COPD_exacerbation_treatment"], meds: [{ name: "Methylprednisolone", dose: "125mg", route: "IV" }, { name: "Albuterol", dose: "2.5mg nebulizer", route: "INH" }], category: "respiratory" },
  { name: "acute_pancreatitis", icd10: "K85.9", severities: ["mild", "moderate", "severe"], acuity: "acute", complaints: ["epigastric pain radiating to back", "severe abdominal pain with vomiting"], treatments: ["supportive_care_and_pain_management"], meds: [{ name: "Morphine", dose: "4mg", route: "IV" }, { name: "Normal Saline", dose: "250mL/h", route: "IV" }, { name: "Ondansetron", dose: "4mg", route: "IV" }], category: "gastrointestinal" },
  { name: "acute_heart_failure_exacerbation", icd10: "I50.9", severities: ["moderate", "severe"], acuity: "acute", complaints: ["progressive dyspnea on exertion", "bilateral leg edema and orthopnea"], treatments: ["initiate_diuresis_and_afterload_reduction"], meds: [{ name: "Furosemide", dose: "40mg", route: "IV" }, { name: "Nitroglycerin", dose: "5mcg/min", route: "IV" }], category: "cardiovascular" },
];

const CHRONIC_CONDITIONS = [
  "hypertension", "type_2_diabetes", "atrial_fibrillation",
  "coronary_artery_disease", "COPD", "chronic_kidney_disease_stage_3",
  "obesity", "hyperlipidemia", "osteoarthritis", "hypothyroidism",
  "depression", "gastroesophageal_reflux",
];

const ALLERGIES = [
  "penicillin", "sulfonamides", "iodine_contrast",
  "aspirin", "latex", "codeine", "morphine", "NSAIDs",
];

const RISK_FACTORS = [
  "smoking_history", "hypertension", "diabetes", "obesity",
  "family_hx_CAD", "sedentary_lifestyle", "alcohol_use",
  "previous_DVT", "recent_surgery", "immobility",
];

const ADMISSION_METHODS = [
  "emergency", "ambulance", "referral", "walk-in", "transfer",
];

const SYMPTOMS_BY_CATEGORY: Record<string, string[]> = {
  cardiovascular: ["chest pain", "dyspnea", "palpitations", "diaphoresis", "syncope", "leg edema"],
  respiratory: ["cough", "shortness of breath", "wheezing", "hemoptysis", "pleuritic chest pain", "sputum production"],
  neurological: ["headache", "weakness", "speech difficulty", "facial droop", "confusion", "visual changes"],
  surgical: ["abdominal pain", "nausea", "vomiting", "rebound tenderness", "guarding"],
  orthopedic: ["pain", "inability to bear weight", "deformity", "swelling", "bruising"],
  infectious: ["fever", "rigors", "confusion", "tachycardia", "hypotension", "malaise"],
  endocrine: ["polyuria", "polydipsia", "nausea", "abdominal pain", "altered mental status"],
  gastrointestinal: ["abdominal pain", "nausea", "vomiting", "diarrhea", "melena"],
};

const GUIDELINES: Record<string, string[]> = {
  cardiovascular: ["ESC PE Guidelines 2019", "AHA/ACC STEMI Guidelines 2013", "ESC ACS Guidelines 2020"],
  respiratory: ["IDSA/ATS CAP Guidelines 2019", "GOLD COPD Guidelines 2024"],
  neurological: ["AHA/ASA Stroke Guidelines 2019"],
  surgical: ["WSES Appendicitis Guidelines 2020", "ACS Trauma Guidelines"],
  orthopedic: ["AAOS Hip Fracture Guidelines 2021"],
  infectious: ["Surviving Sepsis Campaign 2021"],
  endocrine: ["ADA DKA Management Protocol 2024"],
  gastrointestinal: ["ACG Pancreatitis Guidelines 2024"],
};

// ─── Generators ───

export function generateAdmissionData(): AdmissionData {
  const gender = rng() > 0.5 ? "male" : "female";
  const firstName = gender === "male" ? pick(FIRST_NAMES_M) : pick(FIRST_NAMES_F);
  const lastName = pick(LAST_NAMES);
  const age = randInt(22, 88);
  const diagnosis = pick(DIAGNOSES);

  const numChronics = randInt(0, 3);
  const chronics: string[] = [];
  for (let i = 0; i < numChronics; i++) {
    const c = pick(CHRONIC_CONDITIONS);
    if (!chronics.includes(c)) chronics.push(c);
  }

  const numAllergies = randInt(0, 2);
  const allergies: string[] = [];
  for (let i = 0; i < numAllergies; i++) {
    const a = pick(ALLERGIES);
    if (!allergies.includes(a)) allergies.push(a);
  }

  const numRisk = randInt(0, 3);
  const riskFactors: string[] = [];
  for (let i = 0; i < numRisk; i++) {
    const r = pick(RISK_FACTORS);
    if (!riskFactors.includes(r)) riskFactors.push(r);
  }

  const weight = randInt(55, 115);
  const height = randInt(155, 195);

  return {
    patient_name: `${firstName} ${lastName}`,
    age,
    gender,
    weight_kg: weight,
    height_cm: height,
    chief_complaint: pick(diagnosis.complaints),
    triage_code: pick(["RED", "ORANGE", "YELLOW", "GREEN"] as TriageCode[]),
    admission_method: pick(ADMISSION_METHODS),
    chronic_conditions: chronics,
    allergies,
    risk_factors: riskFactors,
  };
}

export function generateTriageData(): TriageData {
  const isSevere = rng() > 0.6;
  const systolic = isSevere ? randInt(80, 140) : randInt(110, 160);
  const diastolic = isSevere ? randInt(50, 85) : randInt(65, 95);
  const hr = isSevere ? randInt(90, 150) : randInt(60, 100);
  const rr = isSevere ? randInt(20, 34) : randInt(12, 22);
  const spo2 = isSevere ? randInt(82, 94) : randInt(94, 99);
  const temp = round2(isSevere ? 36.0 + rng() * 3.0 : 36.2 + rng() * 1.5);
  const gcs = isSevere ? randInt(10, 15) : 15;
  const pain = isSevere ? randInt(5, 10) : randInt(0, 6);

  const diagCategory = pick(Object.keys(SYMPTOMS_BY_CATEGORY));
  const symPool = SYMPTOMS_BY_CATEGORY[diagCategory];
  const numSymptoms = randInt(2, 4);
  const symptoms: string[] = [];
  for (let i = 0; i < numSymptoms; i++) {
    const s = pick(symPool);
    if (!symptoms.includes(s)) symptoms.push(s);
  }

  return {
    systolic,
    diastolic,
    heart_rate: hr,
    respiratory_rate: rr,
    oxygen_saturation: spo2,
    on_oxygen: spo2 < 93,
    temperature: temp,
    gcs,
    pain_score: pain,
    symptoms,
  };
}

export function generateDiagnosticData(): DiagnosticData {
  const diag = pick(DIAGNOSES);
  const severity = pick(diag.severities);

  const numDiffs = randInt(1, 3);
  const differentials: Array<{ name: string; probability: number }> = [];
  for (let i = 0; i < numDiffs; i++) {
    const other = pick(DIAGNOSES);
    if (other.name !== diag.name && !differentials.find((d) => d.name === other.name)) {
      differentials.push({
        name: other.name,
        probability: round2(0.05 + rng() * 0.25),
      });
    }
  }

  // Labs — realistic ranges from the generator
  const hemoglobin = round2(10 + rng() * 6);
  const wbc = round2(4 + rng() * 14);
  const creatinine = round2(0.6 + rng() * 1.8);
  const troponin = diag.category === "cardiovascular" ? round2(rng() * 4) : round2(rng() * 0.03);
  const dDimer = diag.name.includes("embolism") || diag.name.includes("thrombosis") ? randInt(500, 4500) : round2(100 + rng() * 400);
  const lactate = round2(0.5 + rng() * 3.5);
  const glucose = diag.name.includes("diabetic") ? randInt(300, 600) : randInt(75, 180);
  const potassium = round2(3.3 + rng() * 2.2);

  return {
    primary_name: diag.name,
    primary_icd10: diag.icd10,
    severity,
    acuity: diag.acuity,
    confidence: round2(0.7 + rng() * 0.25),
    differentials,
    hemoglobin,
    white_blood_cells: wbc,
    creatinine,
    troponin,
    d_dimer: dDimer,
    lactate,
    glucose,
    potassium,
    imaging_notes: pick([
      `CT angiography: ${diag.name.replaceAll("_", " ")} confirmed`,
      `Chest X-ray: findings consistent with ${diag.name.replaceAll("_", " ")}`,
      `Ultrasound: ${diag.name.replaceAll("_", " ")} — no additional findings`,
      `MRI brain: ${diag.name.replaceAll("_", " ")} with acute changes`,
      `CT abdomen: ${diag.name.replaceAll("_", " ")} identified`,
    ]),
  };
}

export function generateTreatmentData(): TreatmentData {
  const diag = pick(DIAGNOSES);
  const guidelinePool = GUIDELINES[diag.category] ?? ["Standard hospital protocol"];

  const numOrders = randInt(1, 3);
  const orders: string[] = [];
  const orderPool = [
    "Complete blood count (CBC)", "Basic metabolic panel", "Coagulation panel",
    "Arterial blood gas", "Blood cultures x2", "Urinalysis",
    "Chest X-ray", "CT scan", "ECG", "Echocardiogram",
    "Transfer to ICU", "Transfer to ward", "Continuous telemetry monitoring",
    "Foley catheter insertion", "Central line placement",
  ];
  for (let i = 0; i < numOrders; i++) {
    const o = pick(orderPool);
    if (!orders.includes(o)) orders.push(o);
  }

  return {
    action: pick(diag.treatments),
    action_category: pick(["treatment", "procedure", "monitoring", "diagnostic"] as ActionCategory[]),
    reasoning: pick([
      `${diag.name.replaceAll("_", " ")} confirmed — initiating standard-of-care treatment per guidelines.`,
      `Clinical presentation and investigations consistent with ${diag.name.replaceAll("_", " ")}. Immediate treatment warranted given severity.`,
      `Risk-benefit analysis favors intervention. Historical data shows improved outcomes with early treatment in similar cases.`,
    ]),
    guidelines: pick(guidelinePool),
    medications: diag.meds.slice(0, randInt(1, diag.meds.length)),
    orders,
  };
}

export function generateNodeData(): NodeData {
  const diag = pick(DIAGNOSES);
  const isSevere = rng() > 0.5;
  const guidelinePool = GUIDELINES[diag.category] ?? ["Standard hospital protocol"];

  const complications: string[] = [];
  const compPool = [
    "acute_kidney_injury", "hospital_acquired_pneumonia", "electrolyte_imbalance",
    "delirium", "venous_thromboembolism", "pressure_ulcer", "arrhythmia",
    "respiratory_failure", "major_bleeding", "hypoglycemia",
  ];
  if (rng() > 0.6) complications.push(pick(compPool));
  if (rng() > 0.85) complications.push(pick(compPool.filter((c) => !complications.includes(c))));

  const orders: string[] = [];
  const orderPool = [
    "Complete blood count (CBC)", "Basic metabolic panel", "Coagulation panel",
    "Arterial blood gas", "Blood cultures x2", "Urinalysis",
    "Chest X-ray", "CT scan", "ECG", "Echocardiogram",
    "Transfer to ICU", "Transfer to ward", "Continuous telemetry monitoring",
  ];
  for (let i = 0; i < randInt(1, 3); i++) {
    const o = pick(orderPool);
    if (!orders.includes(o)) orders.push(o);
  }

  return {
    systolic: isSevere ? randInt(80, 135) : randInt(110, 155),
    diastolic: isSevere ? randInt(50, 80) : randInt(65, 90),
    heart_rate: isSevere ? randInt(90, 145) : randInt(60, 100),
    respiratory_rate: isSevere ? randInt(20, 32) : randInt(12, 20),
    oxygen_saturation: isSevere ? randInt(84, 94) : randInt(94, 99),
    on_oxygen: isSevere && rng() > 0.3,
    temperature: round2(isSevere ? 36.0 + rng() * 2.5 : 36.3 + rng() * 1.2),
    gcs: isSevere ? randInt(11, 15) : 15,
    pain_score: isSevere ? randInt(4, 9) : randInt(0, 5),
    primary_name: diag.name,
    primary_icd10: diag.icd10,
    severity: pick(diag.severities),
    confidence: round2(0.7 + rng() * 0.28),
    medications: diag.meds.slice(0, randInt(1, diag.meds.length)),
    complications,
    action: pick([
      ...diag.treatments,
      "escalate_treatment", "adjust_medications", "reassess_clinical_status",
      "order_follow_up_imaging", "consult_specialist", "initiate_monitoring",
    ]),
    action_category: pick(["treatment", "monitoring", "diagnostic", "consultation", "procedure"] as ActionCategory[]),
    reasoning: pick([
      `Ongoing management of ${diag.name.replaceAll("_", " ")} — adjusting treatment based on clinical response.`,
      `Patient condition ${isSevere ? "deteriorating" : "stable"}. ${isSevere ? "Escalating care." : "Continuing current plan."}`,
      `Reassessment shows ${isSevere ? "worsening markers" : "improving trend"}. Adapting strategy accordingly.`,
    ]),
    guidelines: pick(guidelinePool),
    orders,
    hemoglobin: round2(9 + rng() * 6),
    white_blood_cells: round2(4 + rng() * 14),
    creatinine: round2(0.6 + rng() * 2.0),
    troponin: diag.category === "cardiovascular" ? round2(rng() * 3) : round2(rng() * 0.04),
    lactate: round2(0.5 + rng() * 4),
  };
}

export function generateOutcomeData(): OutcomeData {
  const r = rng();
  const status = r < 0.6 ? "HEALED" : r < 0.85 ? "HEALED_WITH_COMPLICATIONS" : "DECEASED";

  const compPool = [
    "acute_kidney_injury", "hospital_acquired_pneumonia", "electrolyte_imbalance",
    "delirium", "venous_thromboembolism", "pressure_ulcer", "arrhythmia",
    "respiratory_failure", "major_bleeding", "chronic_pain",
  ];
  const complications: string[] = [];
  if (status !== "HEALED") {
    complications.push(pick(compPool));
    if (rng() > 0.5) complications.push(pick(compPool.filter((c) => !complications.includes(c))));
  }

  const destinations: Record<string, string[]> = {
    HEALED: ["home", "rehabilitation_center"],
    HEALED_WITH_COMPLICATIONS: ["home", "rehabilitation_center", "long_term_care"],
    DECEASED: ["morgue"],
  };

  return {
    status: status as OutcomeData["status"],
    discharge_destination: pick(destinations[status]),
    complications,
    readmission_risk: status === "HEALED" ? round2(0.02 + rng() * 0.08) : status === "DECEASED" ? 0 : round2(0.1 + rng() * 0.25),
  };
}

