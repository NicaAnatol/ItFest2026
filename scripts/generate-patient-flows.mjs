/**
 * Generator for 100 realistic patient flow JSON objects
 * Following the complete Hospital Graph System schema
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Seed helpers ───
let _seed = 42;
function seededRandom() {
  _seed = (_seed * 16807 + 0) % 2147483647;
  return (_seed - 1) / 2147483646;
}
function rng() { return seededRandom(); }
function randInt(min, max) { return Math.floor(rng() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }
function pickWeighted(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rng() * total;
  for (const item of items) { r -= item.weight; if (r <= 0) return item; }
  return items[items.length - 1];
}
function round2(n) { return Math.round(n * 100) / 100; }
function uuid4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (rng() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ─── Medical Reference Data ───

const DIAGNOSES = [
  { name: "bilateral_pulmonary_embolism", icd10: "I26.99", severity_options: ["moderate", "severe", "moderate_with_RV_strain"], acuity: "acute", category: "cardiovascular", avg_los_days: 6, mortality_base: 0.034, complication_rate: 0.12, weight: 8 },
  { name: "acute_myocardial_infarction_STEMI", icd10: "I21.0", severity_options: ["severe", "critical"], acuity: "acute", category: "cardiovascular", avg_los_days: 5, mortality_base: 0.07, complication_rate: 0.18, weight: 7 },
  { name: "acute_myocardial_infarction_NSTEMI", icd10: "I21.4", severity_options: ["moderate", "severe"], acuity: "acute", category: "cardiovascular", avg_los_days: 4, mortality_base: 0.04, complication_rate: 0.12, weight: 8 },
  { name: "community_acquired_pneumonia", icd10: "J18.9", severity_options: ["mild", "moderate", "severe"], acuity: "acute", category: "respiratory", avg_los_days: 5, mortality_base: 0.03, complication_rate: 0.10, weight: 15 },
  { name: "acute_ischemic_stroke", icd10: "I63.9", severity_options: ["moderate", "severe", "critical"], acuity: "acute", category: "neurological", avg_los_days: 7, mortality_base: 0.08, complication_rate: 0.20, weight: 6 },
  { name: "hemorrhagic_stroke", icd10: "I61.9", severity_options: ["severe", "critical"], acuity: "acute", category: "neurological", avg_los_days: 12, mortality_base: 0.25, complication_rate: 0.35, weight: 3 },
  { name: "acute_appendicitis", icd10: "K35.80", severity_options: ["mild", "moderate"], acuity: "acute", category: "surgical", avg_los_days: 3, mortality_base: 0.002, complication_rate: 0.05, weight: 10 },
  { name: "hip_fracture", icd10: "S72.009A", severity_options: ["moderate", "severe"], acuity: "acute", category: "orthopedic", avg_los_days: 6, mortality_base: 0.05, complication_rate: 0.15, weight: 7 },
  { name: "acute_pancreatitis", icd10: "K85.9", severity_options: ["mild", "moderate", "severe"], acuity: "acute", category: "gastrointestinal", avg_los_days: 5, mortality_base: 0.03, complication_rate: 0.12, weight: 6 },
  { name: "diabetic_ketoacidosis", icd10: "E11.10", severity_options: ["moderate", "severe"], acuity: "acute", category: "endocrine", avg_los_days: 3, mortality_base: 0.01, complication_rate: 0.08, weight: 5 },
  { name: "acute_heart_failure_exacerbation", icd10: "I50.9", severity_options: ["moderate", "severe"], acuity: "acute", category: "cardiovascular", avg_los_days: 5, mortality_base: 0.05, complication_rate: 0.15, weight: 8 },
  { name: "sepsis", icd10: "A41.9", severity_options: ["severe", "critical"], acuity: "acute", category: "infectious", avg_los_days: 8, mortality_base: 0.15, complication_rate: 0.30, weight: 6 },
  { name: "COPD_exacerbation", icd10: "J44.1", severity_options: ["moderate", "severe"], acuity: "acute", category: "respiratory", avg_los_days: 4, mortality_base: 0.025, complication_rate: 0.10, weight: 8 },
  { name: "gastrointestinal_hemorrhage", icd10: "K92.2", severity_options: ["moderate", "severe"], acuity: "acute", category: "gastrointestinal", avg_los_days: 4, mortality_base: 0.04, complication_rate: 0.12, weight: 5 },
  { name: "acute_kidney_injury", icd10: "N17.9", severity_options: ["moderate", "severe"], acuity: "acute", category: "renal", avg_los_days: 5, mortality_base: 0.06, complication_rate: 0.18, weight: 4 },
  { name: "multiple_trauma", icd10: "T07", severity_options: ["severe", "critical"], acuity: "acute", category: "trauma", avg_los_days: 10, mortality_base: 0.10, complication_rate: 0.25, weight: 5 },
  { name: "acute_cholecystitis", icd10: "K81.0", severity_options: ["mild", "moderate"], acuity: "acute", category: "surgical", avg_los_days: 3, mortality_base: 0.005, complication_rate: 0.06, weight: 6 },
  { name: "deep_vein_thrombosis", icd10: "I82.40", severity_options: ["mild", "moderate"], acuity: "acute", category: "cardiovascular", avg_los_days: 3, mortality_base: 0.01, complication_rate: 0.05, weight: 5 },
  { name: "acute_asthma_exacerbation", icd10: "J45.901", severity_options: ["moderate", "severe"], acuity: "acute", category: "respiratory", avg_los_days: 2, mortality_base: 0.005, complication_rate: 0.04, weight: 7 },
  { name: "urinary_tract_infection_complicated", icd10: "N39.0", severity_options: ["moderate", "severe"], acuity: "acute", category: "infectious", avg_los_days: 4, mortality_base: 0.02, complication_rate: 0.08, weight: 6 },
];

const FIRST_NAMES_M = ["Ion", "Andrei", "Mihai", "Alexandru", "Stefan", "George", "Cristian", "Daniel", "Adrian", "Florin", "Marius", "Bogdan", "Razvan", "Ciprian", "Vlad", "Catalin", "Radu", "Cosmin", "Dragos", "Liviu"];
const FIRST_NAMES_F = ["Maria", "Elena", "Ana", "Ioana", "Andreea", "Cristina", "Alina", "Mihaela", "Adriana", "Roxana", "Laura", "Simona", "Diana", "Gabriela", "Monica", "Raluca", "Denisa", "Carmen", "Nicoleta", "Daniela"];

const CHRONIC_CONDITIONS = [
  { condition: "hypertension", icd10: "I10", medications: ["lisinopril_10mg", "amlodipine_5mg", "losartan_50mg"] },
  { condition: "type_2_diabetes", icd10: "E11.9", medications: ["metformin_1000mg", "glipizide_5mg", "insulin_glargine"] },
  { condition: "atrial_fibrillation", icd10: "I48.91", medications: ["apixaban_5mg", "warfarin_5mg", "metoprolol_50mg"] },
  { condition: "coronary_artery_disease", icd10: "I25.10", medications: ["aspirin_81mg", "atorvastatin_40mg", "metoprolol_25mg"] },
  { condition: "COPD", icd10: "J44.9", medications: ["tiotropium_18mcg", "fluticasone_salmeterol_250_50"] },
  { condition: "chronic_kidney_disease_stage_3", icd10: "N18.3", medications: ["furosemide_40mg"] },
  { condition: "obesity", icd10: "E66.01", medications: [] },
  { condition: "hyperlipidemia", icd10: "E78.5", medications: ["atorvastatin_20mg", "rosuvastatin_10mg"] },
  { condition: "osteoarthritis", icd10: "M19.90", medications: ["ibuprofen_400mg_prn", "acetaminophen_500mg"] },
  { condition: "hypothyroidism", icd10: "E03.9", medications: ["levothyroxine_75mcg"] },
  { condition: "depression", icd10: "F32.9", medications: ["sertraline_50mg", "escitalopram_10mg"] },
  { condition: "gastroesophageal_reflux", icd10: "K21.0", medications: ["omeprazole_20mg"] },
];

const ALLERGIES = [
  { allergen: "penicillin", reaction: "rash", severity: "moderate" },
  { allergen: "sulfonamides", reaction: "hives", severity: "moderate" },
  { allergen: "iodine_contrast", reaction: "anaphylaxis", severity: "severe" },
  { allergen: "aspirin", reaction: "bronchospasm", severity: "severe" },
  { allergen: "latex", reaction: "contact_dermatitis", severity: "mild" },
  { allergen: "codeine", reaction: "nausea_vomiting", severity: "mild" },
  { allergen: "morphine", reaction: "pruritus", severity: "mild" },
  { allergen: "NSAIDs", reaction: "GI_bleeding", severity: "moderate" },
];

const RISK_FACTORS = ["smoking_history", "hypertension", "diabetes", "obesity", "family_hx_CAD", "sedentary_lifestyle", "alcohol_use", "previous_DVT", "recent_surgery", "immobility"];

const DOCTOR_NAMES = [
  { id: "DR_POPESCU_001", name: "Dr. Popescu", specialty: "emergency_medicine", experience: 12 },
  { id: "DR_IONESCU_002", name: "Dr. Ionescu", specialty: "cardiology", experience: 15 },
  { id: "DR_MARINESCU_003", name: "Dr. Marinescu", specialty: "pulmonology", experience: 10 },
  { id: "DR_STAN_004", name: "Dr. Stan", specialty: "surgery", experience: 18 },
  { id: "DR_POPA_005", name: "Dr. Popa", specialty: "internal_medicine", experience: 8 },
  { id: "DR_DUMITRU_006", name: "Dr. Dumitru", specialty: "neurology", experience: 14 },
  { id: "DR_BARBU_007", name: "Dr. Barbu", specialty: "orthopedics", experience: 11 },
  { id: "DR_LAZAR_008", name: "Dr. Lazar", specialty: "gastroenterology", experience: 9 },
  { id: "DR_STOICA_009", name: "Dr. Stoica", specialty: "nephrology", experience: 7 },
  { id: "DR_CRISTEA_010", name: "Dr. Cristea", specialty: "critical_care", experience: 16 },
  { id: "DR_RUSU_011", name: "Dr. Rusu", specialty: "emergency_medicine", experience: 6 },
  { id: "DR_MUNTEANU_012", name: "Dr. Munteanu", specialty: "endocrinology", experience: 13 },
];

const NURSE_NAMES = [
  { id: "NURSE_ANA_001", name: "Nurse Ana", experience: 6 },
  { id: "NURSE_MARIA_002", name: "Nurse Maria", experience: 10 },
  { id: "NURSE_ELENA_003", name: "Nurse Elena", experience: 8 },
  { id: "NURSE_IOANA_004", name: "Nurse Ioana", experience: 3 },
  { id: "NURSE_ANDREEA_005", name: "Nurse Andreea", experience: 12 },
  { id: "NURSE_CRISTINA_006", name: "Nurse Cristina", experience: 5 },
  { id: "NURSE_LAURA_007", name: "Nurse Laura", experience: 9 },
  { id: "NURSE_DIANA_008", name: "Nurse Diana", experience: 4 },
  { id: "NURSE_SARAH_009", name: "Nurse Sarah", experience: 15 },
  { id: "NURSE_MONICA_010", name: "Nurse Monica", experience: 7 },
];

const DEPARTMENTS = {
  ambulance: { id: "DEPT_AMBULANCE", name: "Ambulance", type: "pre_hospital", floor: 0, beds: 0 },
  emergency: { id: "DEPT_EMERGENCY", name: "Emergency_Department", type: "emergency", floor: 1, beds: 20 },
  icu: { id: "DEPT_ICU", name: "Intensive_Care_Unit", type: "critical_care", floor: 3, beds: 12 },
  cardiology: { id: "DEPT_CARDIOLOGY", name: "Cardiology_Ward", type: "inpatient", floor: 4, beds: 30 },
  pulmonology: { id: "DEPT_PULMONOLOGY", name: "Pulmonology_Ward", type: "inpatient", floor: 4, beds: 25 },
  surgery: { id: "DEPT_SURGERY", name: "Surgical_Ward", type: "inpatient", floor: 2, beds: 35 },
  neurology: { id: "DEPT_NEUROLOGY", name: "Neurology_Ward", type: "inpatient", floor: 5, beds: 20 },
  internal_medicine: { id: "DEPT_INTERNAL", name: "Internal_Medicine_Ward", type: "inpatient", floor: 3, beds: 40 },
  orthopedics: { id: "DEPT_ORTHOPEDICS", name: "Orthopedics_Ward", type: "inpatient", floor: 2, beds: 25 },
  step_down: { id: "DEPT_STEPDOWN", name: "Step_Down_Unit", type: "intermediate_care", floor: 3, beds: 15 },
  radiology: { id: "DEPT_RADIOLOGY", name: "Radiology", type: "diagnostic", floor: 1, beds: 0 },
  operating_room: { id: "DEPT_OR", name: "Operating_Room", type: "procedural", floor: 2, beds: 0 },
};

const COMPLICATION_TYPES = {
  cardiovascular: [
    { type: "major_bleeding", icd10: "D62", severity_options: ["mild", "moderate", "severe"], mortality_if_occurs: 0.15 },
    { type: "arrhythmia", icd10: "I49.9", severity_options: ["mild", "moderate", "severe"], mortality_if_occurs: 0.05 },
    { type: "cardiogenic_shock", icd10: "R57.0", severity_options: ["severe", "critical"], mortality_if_occurs: 0.40 },
    { type: "recurrent_thromboembolism", icd10: "I26.99", severity_options: ["moderate", "severe"], mortality_if_occurs: 0.30 },
    { type: "heart_failure", icd10: "I50.9", severity_options: ["moderate", "severe"], mortality_if_occurs: 0.10 },
  ],
  respiratory: [
    { type: "respiratory_failure", icd10: "J96.01", severity_options: ["moderate", "severe"], mortality_if_occurs: 0.20 },
    { type: "pleural_effusion", icd10: "J91.8", severity_options: ["mild", "moderate"], mortality_if_occurs: 0.02 },
    { type: "pneumothorax", icd10: "J93.9", severity_options: ["moderate", "severe"], mortality_if_occurs: 0.05 },
    { type: "ARDS", icd10: "J80", severity_options: ["severe", "critical"], mortality_if_occurs: 0.35 },
  ],
  neurological: [
    { type: "cerebral_edema", icd10: "G93.6", severity_options: ["severe", "critical"], mortality_if_occurs: 0.30 },
    { type: "seizure", icd10: "R56.9", severity_options: ["moderate", "severe"], mortality_if_occurs: 0.05 },
    { type: "hemorrhagic_transformation", icd10: "I61.9", severity_options: ["severe", "critical"], mortality_if_occurs: 0.40 },
  ],
  surgical: [
    { type: "surgical_site_infection", icd10: "T81.4", severity_options: ["mild", "moderate"], mortality_if_occurs: 0.02 },
    { type: "wound_dehiscence", icd10: "T81.3", severity_options: ["moderate", "severe"], mortality_if_occurs: 0.05 },
    { type: "post_operative_bleeding", icd10: "T81.0", severity_options: ["moderate", "severe"], mortality_if_occurs: 0.10 },
  ],
  general: [
    { type: "hospital_acquired_pneumonia", icd10: "J18.9", severity_options: ["moderate", "severe"], mortality_if_occurs: 0.15 },
    { type: "acute_kidney_injury", icd10: "N17.9", severity_options: ["moderate", "severe"], mortality_if_occurs: 0.10 },
    { type: "venous_thromboembolism", icd10: "I82.40", severity_options: ["moderate", "severe"], mortality_if_occurs: 0.05 },
    { type: "delirium", icd10: "F05", severity_options: ["mild", "moderate"], mortality_if_occurs: 0.02 },
    { type: "pressure_ulcer", icd10: "L89.90", severity_options: ["mild", "moderate"], mortality_if_occurs: 0.01 },
    { type: "catheter_associated_UTI", icd10: "N39.0", severity_options: ["mild", "moderate"], mortality_if_occurs: 0.02 },
    { type: "clostridium_difficile_infection", icd10: "A04.72", severity_options: ["moderate", "severe"], mortality_if_occurs: 0.05 },
    { type: "hypoglycemia", icd10: "E16.2", severity_options: ["mild", "moderate"], mortality_if_occurs: 0.01 },
    { type: "electrolyte_imbalance", icd10: "E87.8", severity_options: ["mild", "moderate"], mortality_if_occurs: 0.02 },
    { type: "allergic_reaction", icd10: "T78.40", severity_options: ["mild", "moderate", "severe"], mortality_if_occurs: 0.01 },
  ]
};

const ADMISSION_METHODS = [
  { method: "ambulance", weight: 35 },
  { method: "self_presentation", weight: 30 },
  { method: "referral_from_GP", weight: 15 },
  { method: "inter_hospital_transfer", weight: 10 },
  { method: "helicopter", weight: 5 },
  { method: "police_escort", weight: 5 },
];

const TRIAGE_CODES = ["RED", "ORANGE", "YELLOW", "GREEN"];
const SHIFTS = ["day_shift", "evening_shift", "night_shift"];
const TIMES_OF_DAY = ["morning", "afternoon", "evening", "night"];
const DISCHARGE_DESTINATIONS = ["home", "rehabilitation_facility", "nursing_home", "home_with_home_care", "transferred_to_other_hospital"];

// ─── Helper functions to build nodes ───

function generateTimestamp(baseDate, offsetMinutes) {
  const d = new Date(baseDate.getTime() + offsetMinutes * 60000);
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const hour = d.getUTCHours();
  let timeOfDay = "morning";
  if (hour >= 12 && hour < 17) timeOfDay = "afternoon";
  else if (hour >= 17 && hour < 21) timeOfDay = "evening";
  else if (hour >= 21 || hour < 6) timeOfDay = "night";

  let shift = "day_shift";
  if (hour >= 15 && hour < 23) shift = "evening_shift";
  else if (hour >= 23 || hour < 7) shift = "night_shift";

  return {
    exact: d.toISOString(),
    day_of_week: dayNames[d.getUTCDay()],
    day_of_month: d.getUTCDate(),
    month: d.getUTCMonth() + 1,
    year: d.getUTCFullYear(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    time_of_day: timeOfDay,
    shift,
    is_weekend: d.getUTCDay() === 0 || d.getUTCDay() === 6,
    is_holiday: false
  };
}

function generateVitals(diagnosis, severity, timeInFlow) {
  const base = {
    blood_pressure: { systolic: randInt(110, 180), diastolic: randInt(60, 110), unit: "mmHg" },
    heart_rate: { value: randInt(60, 150), unit: "bpm", rhythm: rng() > 0.2 ? "regular" : "irregular" },
    respiratory_rate: { value: randInt(12, 32), unit: "breaths/min" },
    oxygen_saturation: { value: randInt(85, 99), unit: "%", on_oxygen: rng() > 0.5 },
    temperature: { value: round2(36.0 + rng() * 3.0), unit: "C" },
    consciousness: { level: "alert", gcs: 15 },
    pain_score: randInt(0, 10)
  };

  if (severity === "critical" || severity === "severe") {
    base.blood_pressure.systolic = randInt(70, 140);
    base.heart_rate.value = randInt(90, 160);
    base.oxygen_saturation.value = randInt(78, 93);
    base.oxygen_saturation.on_oxygen = true;
    base.respiratory_rate.value = randInt(22, 38);
    if (rng() > 0.7) { base.consciousness.level = "drowsy"; base.consciousness.gcs = randInt(10, 14); }
  }

  // Improve vitals over time
  if (timeInFlow > 0.5) {
    base.blood_pressure.systolic = Math.min(160, base.blood_pressure.systolic + randInt(0, 20));
    base.heart_rate.value = Math.max(60, base.heart_rate.value - randInt(0, 20));
    base.oxygen_saturation.value = Math.min(99, base.oxygen_saturation.value + randInt(0, 5));
  }

  if (base.oxygen_saturation.on_oxygen) {
    base.oxygen_saturation.oxygen_flow = pick(["2L/min", "4L/min", "6L/min", "10L/min", "15L/min"]);
  }

  return base;
}

function generateLabResults(diagnosis, nodeIndex) {
  if (nodeIndex < 2) return {};
  const labs = {
    hematology: {
      hemoglobin: { value: round2(10 + rng() * 6), unit: "g/dL", status: "normal" },
      white_blood_cells: { value: round2(4 + rng() * 16), unit: "10^9/L", status: "normal" },
      platelets: { value: randInt(100, 400), unit: "10^9/L", status: "normal" }
    },
    chemistry: {
      creatinine: { value: round2(0.6 + rng() * 2.0), unit: "mg/dL", status: "normal" },
      glucose: { value: randInt(70, 250), unit: "mg/dL", status: "normal" },
      potassium: { value: round2(3.2 + rng() * 2.5), unit: "mEq/L", status: "normal" },
      sodium: { value: randInt(130, 150), unit: "mEq/L", status: "normal" },
      BUN: { value: randInt(7, 40), unit: "mg/dL", status: "normal" }
    },
    coagulation: {
      pt: { value: round2(10 + rng() * 6), status: "normal" },
      inr: { value: round2(0.9 + rng() * 1.5), status: "normal" },
      aptt: { value: round2(22 + rng() * 20), status: "normal" }
    }
  };

  // Mark abnormal values
  if (labs.hematology.hemoglobin.value < 12) labs.hematology.hemoglobin.status = "LOW";
  if (labs.hematology.white_blood_cells.value > 11) labs.hematology.white_blood_cells.status = "HIGH";
  if (labs.chemistry.creatinine.value > 1.3) labs.chemistry.creatinine.status = "HIGH";
  if (labs.chemistry.glucose.value > 140) labs.chemistry.glucose.status = "HIGH";
  if (labs.coagulation.inr.value > 1.5) labs.coagulation.inr.status = "HIGH";

  // Add diagnosis-specific labs
  if (diagnosis.category === "cardiovascular") {
    labs.cardiac = {
      troponin: { value: round2(rng() * 5), unit: "ng/mL", status: rng() > 0.3 ? "elevated" : "normal" },
      bnp: { value: randInt(50, 1500), unit: "pg/mL", status: "normal" }
    };
    if (labs.cardiac.troponin.value > 0.04) labs.cardiac.troponin.status = "elevated";
    if (labs.cardiac.bnp.value > 100) labs.cardiac.bnp.status = "elevated";

    if (diagnosis.name.includes("pulmonary_embolism") || diagnosis.name.includes("deep_vein")) {
      labs.coagulation.d_dimer = { value: randInt(500, 5000), unit: "ng/mL", status: "HIGH", critical: true };
    }
  }

  if (diagnosis.category === "infectious" || diagnosis.name.includes("pneumonia")) {
    labs.inflammatory = {
      crp: { value: round2(5 + rng() * 200), unit: "mg/L", status: "HIGH" },
      procalcitonin: { value: round2(rng() * 20), unit: "ng/mL", status: rng() > 0.4 ? "HIGH" : "normal" }
    };
  }

  if (diagnosis.name.includes("pancreatitis")) {
    labs.chemistry.lipase = { value: randInt(200, 3000), unit: "U/L", status: "HIGH" };
    labs.chemistry.amylase = { value: randInt(150, 2000), unit: "U/L", status: "HIGH" };
  }

  if (diagnosis.name.includes("diabetic_ketoacidosis")) {
    labs.chemistry.glucose.value = randInt(300, 700);
    labs.chemistry.glucose.status = "CRITICAL_HIGH";
    labs.blood_gas = {
      ph: { value: round2(6.9 + rng() * 0.4), status: "LOW" },
      bicarbonate: { value: round2(5 + rng() * 10), status: "LOW" },
      lactate: { value: round2(2 + rng() * 6), status: "HIGH" }
    };
  }

  return labs;
}

function generateDepartmentState(dept) {
  const utilization = round2(0.5 + rng() * 0.5);
  const occupiedBeds = Math.floor(dept.beds * utilization);
  let status = "NORMAL";
  if (utilization > 0.9) status = "NEAR_CAPACITY";
  if (utilization > 0.95) status = "CRITICAL";
  if (utilization < 0.7) status = "NORMAL";

  return {
    timestamp: null, // will be set
    capacity: {
      total_beds: dept.beds,
      occupied_beds: occupiedBeds,
      available_beds: dept.beds - occupiedBeds,
      utilization
    },
    personnel_on_duty: {
      attending_physicians: { total: randInt(2, 6), available: randInt(0, 3), busy: randInt(1, 4) },
      nurses: { total: randInt(6, 15), available: randInt(1, 5), busy: randInt(4, 12) }
    },
    status
  };
}

// ─── Main Patient Flow Generator ───

function generatePatientFlow(patientIndex) {
  const patientId = `PAT_2024_${String(10000 + patientIndex).padStart(5, '0')}`;
  const gender = rng() > 0.5 ? "M" : "F";
  const age = randInt(18, 92);
  const firstName = gender === "M" ? pick(FIRST_NAMES_M) : pick(FIRST_NAMES_F);

  // Pick diagnosis
  const diagnosisTemplate = pickWeighted(DIAGNOSES);
  const severity = pick(diagnosisTemplate.severity_options);

  // Determine outcome based on mortality and complication rates
  const mortalityRoll = rng();
  const compRoll = rng();
  let adjustedMortality = diagnosisTemplate.mortality_base;
  if (age > 75) adjustedMortality *= 1.8;
  if (age > 65) adjustedMortality *= 1.3;
  if (severity === "critical") adjustedMortality *= 2.0;
  if (severity === "severe") adjustedMortality *= 1.5;
  adjustedMortality = Math.min(adjustedMortality, 0.50);

  let finalStatus;
  if (mortalityRoll < adjustedMortality) {
    finalStatus = "DECEASED";
  } else if (compRoll < diagnosisTemplate.complication_rate * 1.5) {
    finalStatus = "HEALED_WITH_COMPLICATIONS";
  } else {
    finalStatus = "HEALED";
  }

  // Demographics
  const weight = randInt(50, 120);
  const height = randInt(155, 195);
  const bmi = round2(weight / ((height / 100) ** 2));

  const numChronicConditions = randInt(0, 4);
  const chronicConditions = [];
  const usedConditions = new Set();
  for (let i = 0; i < numChronicConditions; i++) {
    const cond = pick(CHRONIC_CONDITIONS);
    if (!usedConditions.has(cond.condition)) {
      usedConditions.add(cond.condition);
      chronicConditions.push({
        condition: cond.condition,
        icd10: cond.icd10,
        diagnosed_date: `${randInt(2005, 2023)}-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
        severity: pick(["mild", "moderate"]),
        controlled: rng() > 0.3,
        medications: [pick(cond.medications)].filter(Boolean)
      });
    }
  }

  const numAllergies = randInt(0, 2);
  const allergies = [];
  for (let i = 0; i < numAllergies; i++) {
    const allergy = pick(ALLERGIES);
    if (!allergies.find(a => a.allergen === allergy.allergen)) {
      allergies.push({ ...allergy });
    }
  }

  const numRiskFactors = randInt(1, 4);
  const riskFactors = [];
  for (let i = 0; i < numRiskFactors; i++) {
    const rf = pick(RISK_FACTORS);
    if (!riskFactors.includes(rf)) riskFactors.push(rf);
  }

  // Generate admission time - spread across 2024
  const startMonth = randInt(0, 11);
  const startDay = randInt(1, 28);
  const startHour = randInt(0, 23);
  const startMinute = randInt(0, 59);
  const baseDate = new Date(Date.UTC(2024, startMonth, startDay, startHour, startMinute, 0));

  const admissionMethod = pickWeighted(ADMISSION_METHODS);

  // Determine number of nodes and duration
  const baseLos = diagnosisTemplate.avg_los_days;
  const losVariation = baseLos * (0.5 + rng() * 1.0);
  const totalDurationHours = round2(losVariation * 24);
  const totalDurationDays = round2(totalDurationHours / 24);

  let numNodes;
  if (finalStatus === "DECEASED") {
    numNodes = randInt(8, 25);
  } else if (totalDurationDays < 3) {
    numNodes = randInt(8, 20);
  } else if (totalDurationDays < 7) {
    numNodes = randInt(15, 35);
  } else {
    numNodes = randInt(25, 55);
  }

  // Generate the department flow (which departments patient visits)
  const departmentFlow = generateDepartmentFlow(diagnosisTemplate, severity, finalStatus);

  // Generate nodes
  const nodes = [];
  const edges = [];
  const complications = [];
  let currentMinuteOffset = 0;

  for (let nodeIdx = 0; nodeIdx < numNodes; nodeIdx++) {
    const timeProgress = nodeIdx / numNodes; // 0..1
    const minuteIncrement = (totalDurationHours * 60) / numNodes;
    const jitter = minuteIncrement * (0.3 + rng() * 0.7);
    currentMinuteOffset += Math.max(1, Math.floor(jitter));

    const deptIndex = Math.min(Math.floor(timeProgress * departmentFlow.length), departmentFlow.length - 1);
    const currentDept = departmentFlow[deptIndex];

    const nodeId = `NODE_${nodeIdx}`;
    const timestamp = generateTimestamp(baseDate, currentMinuteOffset);

    const sinceAdmissionSec = currentMinuteOffset * 60;
    const sinceAdmissionStr = formatDuration(sinceAdmissionSec);

    const timeSinceLast = nodeIdx === 0 ? null : Math.floor(jitter * 60);

    // Determine node action category
    let actionCategory;
    if (nodeIdx === 0) actionCategory = "admission";
    else if (nodeIdx === 1) actionCategory = "triage";
    else if (nodeIdx < 4) actionCategory = "diagnostic";
    else if (nodeIdx === numNodes - 1) actionCategory = "discharge";
    else actionCategory = pick(["diagnostic", "treatment", "monitoring", "consultation", "transfer", "procedure", "treatment"]);

    // Assign doctor and nurse
    const doctor = pick(DOCTOR_NAMES);
    const nurse = pick(NURSE_NAMES);

    // Generate vitals
    const vitals = generateVitals(diagnosisTemplate, severity, timeProgress);
    if (finalStatus === "DECEASED" && timeProgress > 0.8) {
      vitals.blood_pressure.systolic = randInt(50, 80);
      vitals.heart_rate.value = randInt(30, 50);
      vitals.oxygen_saturation.value = randInt(60, 80);
      vitals.consciousness.level = pick(["drowsy", "unresponsive"]);
      vitals.consciousness.gcs = randInt(3, 8);
    }

    // Labs (only some nodes have labs)
    const labs = (nodeIdx >= 2 && rng() > 0.5) ? generateLabResults(diagnosisTemplate, nodeIdx) : {};

    // Decide if a complication occurs at this node
    let nodeComplication = null;
    if (nodeIdx >= 3 && nodeIdx < numNodes - 1 && rng() < 0.08 && finalStatus !== "HEALED") {
      const compPool = [
        ...(COMPLICATION_TYPES[diagnosisTemplate.category] || []),
        ...COMPLICATION_TYPES.general
      ];
      const compTemplate = pick(compPool);
      const compSeverity = pick(compTemplate.severity_options);
      const compId = `COMP_${patientId}_${String(complications.length + 1).padStart(3, '0')}`;
      nodeComplication = {
        complication_id: compId,
        type: compTemplate.type,
        icd10: compTemplate.icd10,
        severity: compSeverity,
        permanent: finalStatus === "HEALED_WITH_COMPLICATIONS" && complications.length === 0 && rng() > 0.5,
        caused_by_node: nodeId,
        onset_timestamp: timestamp.exact,
        mortality_if_occurs: compTemplate.mortality_if_occurs,
        current_status: "active",
        was_predicted: rng() > 0.4,
        predicted_probability: round2(0.02 + rng() * 0.15)
      };
      complications.push(nodeComplication);
    }

    // Generate decision
    const decision = generateDecision(actionCategory, diagnosisTemplate, doctor, nodeIdx, numNodes, severity);

    // Generate risk assessment
    const mortalityRisk = {
      baseline: round2(adjustedMortality * (1 - timeProgress * 0.5)),
      from_this_decision: round2(rng() * 0.02),
      total: 0
    };
    mortalityRisk.total = round2(mortalityRisk.baseline + mortalityRisk.from_this_decision);

    // Similar cases
    const totalSimilar = randInt(80, 2000);
    const healedPct = round2((0.70 + rng() * 0.25) * 100);
    const diedPct = round2(adjustedMortality * 100);
    const compPct = round2(100 - healedPct - diedPct);

    // Generate flags
    const flags = generateFlags(nodeIdx, diagnosisTemplate, severity, age, complications);

    // Cost for this node
    const personnelCost = randInt(20, 200);
    const medicationCost = randInt(0, 100);
    const equipmentCost = randInt(0, 50);
    const consumablesCost = randInt(5, 80);
    const investigationsCost = actionCategory === "diagnostic" ? randInt(50, 500) : 0;
    const totalNodeCost = personnelCost + medicationCost + equipmentCost + consumablesCost + investigationsCost;

    // Determine trajectory
    let trajectory = "STABLE";
    if (timeProgress < 0.3) trajectory = pick(["UNSTABLE", "STABILIZING", "STABLE"]);
    else if (timeProgress < 0.7) trajectory = pick(["STABLE", "IMPROVING", "STABILIZING"]);
    else trajectory = finalStatus === "DECEASED" ? "DETERIORATING" : pick(["IMPROVING", "STABLE"]);

    const node = {
      node_id: nodeId,
      patient_id: patientId,
      sequence: nodeIdx,

      timestamp,

      duration: {
        time_since_admission: sinceAdmissionStr,
        time_since_admission_seconds: sinceAdmissionSec,
        time_since_last_transition: timeSinceLast ? formatDuration(timeSinceLast) : null,
        time_since_last_transition_seconds: timeSinceLast,
        time_in_this_node: formatDuration(Math.floor(jitter * 60)),
        time_in_this_node_seconds: Math.floor(jitter * 60)
      },

      patient_state: {
        demographics: {
          age, gender, weight_kg: weight, height_cm: height, bmi,
          ethnicity: pick(["caucasian", "romanian", "roma", "hungarian", "other"]),
          insurance_type: pick(["public", "private", "both"])
        },
        medical_history: {
          chronic_conditions: chronicConditions,
          allergies,
          risk_factors: riskFactors
        },
        diagnosis: {
          primary: {
            name: diagnosisTemplate.name,
            icd10: diagnosisTemplate.icd10,
            confidence: round2(Math.min(0.99, 0.3 + timeProgress * 0.7)),
            diagnosed_at_node: nodeIdx <= 3 ? `NODE_${Math.min(nodeIdx, 3)}` : `NODE_3`,
            severity,
            acuity: diagnosisTemplate.acuity
          },
          differential_diagnosis: nodeIdx < 4 ? generateDifferentialDiagnosis(diagnosisTemplate) : []
        },
        vitals,
        lab_results: labs,
        medications_active: generateActiveMedications(diagnosisTemplate, nodeIdx, actionCategory),
        complications_active: complications.filter(c => c.current_status === "active").map(c => ({
          complication_id: c.complication_id,
          type: c.type,
          icd10: c.icd10,
          severity: c.severity,
          onset: { timestamp: c.onset_timestamp, node_id: c.caused_by_node },
          current_status: c.current_status,
          was_predicted: c.was_predicted
        }))
      },

      logistics: {
        location: {
          department: { ...DEPARTMENTS[currentDept] },
          room: currentDept !== "ambulance" ? { id: `ROOM_${currentDept.toUpperCase()}_${randInt(1, 10)}`, type: `${currentDept}_room` } : undefined,
          bed: (DEPARTMENTS[currentDept].beds > 0) ? { id: `BED_${currentDept.toUpperCase()}_${randInt(1, DEPARTMENTS[currentDept].beds)}`, type: `${currentDept}_bed`, occupied: true } : undefined
        },
        personnel_assigned: {
          attending_physician: {
            id: doctor.id,
            name: doctor.name,
            specialty: doctor.specialty,
            experience_years: doctor.experience,
            hours_on_shift: round2(1 + rng() * 10),
            current_patient_load: randInt(2, 8)
          },
          primary_nurse: {
            id: nurse.id,
            name: nurse.name,
            experience_years: nurse.experience,
            hours_on_shift: round2(1 + rng() * 10),
            current_patient_load: randInt(2, 5)
          }
        },
        equipment_in_use: generateEquipmentList(currentDept, diagnosisTemplate),
        department_state: DEPARTMENTS[currentDept].beds > 0 ? generateDepartmentState(DEPARTMENTS[currentDept]) : undefined
      },

      decision,

      risk_assessment: {
        mortality_risk: mortalityRisk,
        complication_risk: { overall: round2(diagnosisTemplate.complication_rate * (1 - timeProgress * 0.5)) },
        potential_complications: generatePotentialComplications(diagnosisTemplate, age, severity),
        interaction_risks: nodeIdx > 3 ? generateInteractionRisks(diagnosisTemplate) : [],
        overlapping_decisions: nodeIdx > 3 && rng() > 0.7 ? generateOverlappingDecisions() : []
      },

      historical_analysis: {
        similar_cases: {
          total: totalSimilar,
          outcomes: {
            healed: { count: Math.floor(totalSimilar * healedPct / 100), percentage: healedPct },
            healed_with_complications: { count: Math.floor(totalSimilar * compPct / 100), percentage: Math.max(0, compPct) },
            died: { count: Math.floor(totalSimilar * diedPct / 100), percentage: diedPct }
          }
        },
        flags,
        pattern_matching: {
          matched_standard_patterns: [{
            pattern_id: `PATTERN_${diagnosisTemplate.category.toUpperCase()}_${String(randInt(1, 50)).padStart(3, '0')}`,
            pattern_name: `Standard_${diagnosisTemplate.name}_pathway`,
            similarity: round2(0.80 + rng() * 0.19),
            pattern_outcomes: {
              mortality: round2(adjustedMortality),
              complication_rate: round2(diagnosisTemplate.complication_rate),
              success_rate: round2(1 - adjustedMortality - diagnosisTemplate.complication_rate * 0.3)
            }
          }],
          deadly_pattern_matches: rng() > 0.85 ? [{
            pattern_id: `DEADLY_${diagnosisTemplate.category.toUpperCase()}_${String(randInt(1, 20)).padStart(3, '0')}`,
            pattern_name: `${diagnosisTemplate.name}_critical_failure_pattern`,
            similarity: round2(0.2 + rng() * 0.3),
            pattern_mortality: round2(0.2 + rng() * 0.4),
            risk_assessment: "LOW_risk_of_following_deadly_pattern"
          }] : []
        }
      },

      execution: {
        status: "completed",
        started_at: `${String(timestamp.hour).padStart(2, '0')}:${String(timestamp.minute).padStart(2, '0')}:00`,
        completed_at: `${String((timestamp.hour + Math.floor(jitter / 60)) % 24).padStart(2, '0')}:${String(Math.floor(timestamp.minute + jitter) % 60).padStart(2, '0')}:00`,
        duration: { total: formatDuration(Math.floor(jitter * 60)), total_seconds: Math.floor(jitter * 60) },
        resources_consumed: {
          personnel: [
            { person_id: doctor.id, time_spent: `${randInt(5, 30)}min`, cost: personnelCost * 0.6 },
            { person_id: nurse.id, time_spent: `${randInt(10, 60)}min`, cost: personnelCost * 0.4 }
          ],
          medications: medicationCost > 0 ? [{ medication: pick(["heparin", "aspirin", "morphine", "amoxicillin", "insulin", "furosemide", "metoprolol", "enoxaparin", "norepinephrine", "alteplase"]), cost: medicationCost }] : [],
          equipment: [{ equipment: pick(["cardiac_monitor", "IV_pump", "oxygen_delivery", "ventilator", "syringe_pump"]), cost: equipmentCost }],
          consumables: [{ item: pick(["IV_catheter", "blood_tubes", "gauze", "syringes", "ECG_electrodes", "oxygen_mask"]), quantity: randInt(1, 10), cost: consumablesCost }]
        },
        total_cost: { personnel: personnelCost, medications: medicationCost, equipment: equipmentCost, consumables: consumablesCost, investigations: investigationsCost, total: totalNodeCost }
      },

      state_after: {
        location: { department: { ...DEPARTMENTS[currentDept] } },
        vitals: {
          blood_pressure: { systolic: vitals.blood_pressure.systolic + randInt(-5, 5), diastolic: vitals.blood_pressure.diastolic + randInt(-3, 3) },
          heart_rate: { value: Math.max(40, vitals.heart_rate.value + randInt(-5, 5)) },
          oxygen_saturation: { value: Math.min(100, vitals.oxygen_saturation.value + randInt(-1, 3)), on_oxygen: vitals.oxygen_saturation.on_oxygen }
        },
        complications_active: complications.filter(c => c.current_status === "active").map(c => ({
          complication_id: c.complication_id, type: c.type, severity: c.severity, current_status: c.current_status
        })),
        overall_status: {
          condition: trajectory === "DETERIORATING" ? "critical" : trajectory === "IMPROVING" ? "stable_improving" : "stable",
          trajectory
        }
      },

      transition_outcome: {
        success: !(finalStatus === "DECEASED" && nodeIdx === numNodes - 1),
        as_expected: rng() > 0.15,
        net_impact: {
          patient_state_change: trajectory === "IMPROVING" ? "IMPROVED" : trajectory === "DETERIORATING" ? "WORSENED" : "UNCHANGED",
          cost: totalNodeCost,
          overall_assessment: trajectory === "DETERIORATING" ? "HARMFUL" : "BENEFICIAL",
          decision_quality: rng() > 0.08 ? "APPROPRIATE" : "SUBOPTIMAL"
        }
      },

      metadata: {
        node_created_at: new Date(baseDate.getTime() + currentMinuteOffset * 60000).toISOString(),
        data_quality: { completeness: round2(0.85 + rng() * 0.15), accuracy_confidence: round2(0.88 + rng() * 0.12) }
      }
    };

    // If dept state exists, set timestamp
    if (node.logistics.department_state) {
      node.logistics.department_state.timestamp = `${String(timestamp.hour).padStart(2, '0')}:${String(timestamp.minute).padStart(2, '0')}`;
    }

    nodes.push(node);

    if (nodeIdx > 0) {
      edges.push({
        from: `NODE_${nodeIdx - 1}`,
        to: nodeId,
        type: actionCategory === "transfer" ? "transfer" : "sequential",
        time_elapsed_seconds: timeSinceLast
      });
    }

    // Resolve some complications over time
    if (timeProgress > 0.6 && complications.length > 0) {
      complications.forEach(c => {
        if (c.current_status === "active" && !c.permanent && rng() > 0.5) {
          c.current_status = "resolved";
          c.resolved_at_node = nodeId;
        }
      });
    }
  }

  // Build final complications for outcome
  const finalComplications = complications
    .filter(c => c.permanent || (finalStatus === "DECEASED" && c.current_status === "active"))
    .map(c => ({
      complication_id: c.complication_id,
      type: c.type,
      icd10: c.icd10,
      severity: c.severity,
      permanent: c.permanent || false,
      caused_by_node: c.caused_by_node,
      quality_of_life_impact: c.permanent ? round2(0.02 + rng() * 0.15) : 0,
      requires_ongoing_treatment: c.permanent && rng() > 0.3,
      estimated_lifetime_cost_eur: c.permanent ? randInt(5000, 50000) : 0
    }));

  const dischargeDate = new Date(baseDate.getTime() + totalDurationHours * 3600000);

  // Compute total cost
  const totalCost = nodes.reduce((s, n) => s + n.execution.total_cost.total, 0);

  // Build department utilization from the flow
  const deptUtilization = buildDeptUtilization(nodes, departmentFlow);

  // Build the patient graph
  const patientGraph = {
    patient_id: patientId,
    patient_name: firstName,

    admission: {
      timestamp: baseDate.toISOString(),
      method: admissionMethod.method,
      chief_complaint: generateChiefComplaint(diagnosisTemplate),
      triage_code: severity === "critical" ? "RED" : severity === "severe" ? "RED" : severity === "moderate" ? "ORANGE" : "YELLOW"
    },

    discharge: {
      timestamp: dischargeDate.toISOString(),
      duration_days: totalDurationDays,
      duration_hours: totalDurationHours
    },

    final_outcome: {
      status: finalStatus,
      final_complications: finalComplications,
      discharge_destination: finalStatus === "DECEASED" ? "morgue" : pick(DISCHARGE_DESTINATIONS),
      readmission_risk_30day: finalStatus === "DECEASED" ? 0 : round2(0.05 + rng() * 0.20),
      summary: {
        total_nodes: numNodes,
        total_departments: [...new Set(departmentFlow)].length,
        total_cost_eur: Math.round(totalCost),
        complications_total: complications.length,
        complications_resolved: complications.filter(c => c.current_status === "resolved").length,
        complications_permanent: complications.filter(c => c.permanent).length
      }
    },

    nodes,
    edges,

    flow_analytics: {
      patient_id: patientId,
      total_nodes: numNodes,
      total_duration_hours: totalDurationHours,
      department_utilization: deptUtilization,
      investigation_summary: {
        total_investigations: nodes.filter(n => n.decision.action_category === "diagnostic").length * randInt(1, 4),
        by_type: {
          laboratory: randInt(5, 20),
          imaging: randInt(2, 8),
          consultation: randInt(1, 5),
          procedure: randInt(0, 3)
        },
        total_cost: Math.round(totalCost * 0.2)
      },
      complication_tracking: {
        total_complications: complications.length,
        timeline: complications.map(c => ({
          complication_id: c.complication_id,
          type: c.type,
          introduced_at: c.caused_by_node,
          resolved_at: c.resolved_at_node || null,
          permanent: c.permanent || false,
          was_predicted: c.was_predicted,
          contributed_to_final_outcome: c.permanent || (finalStatus === "DECEASED" && c.current_status === "active")
        }))
      },
      decision_quality_analysis: {
        total_decisions: numNodes,
        appropriate: numNodes - randInt(0, 3),
        suboptimal: randInt(0, 3)
      },
      cost_analysis: {
        total_cost_eur: Math.round(totalCost),
        breakdown: {
          personnel: Math.round(totalCost * 0.35),
          investigations: Math.round(totalCost * 0.18),
          procedures: Math.round(totalCost * 0.12),
          medications: Math.round(totalCost * 0.08),
          hospitalization: Math.round(totalCost * 0.22),
          equipment: Math.round(totalCost * 0.05)
        },
        cost_per_day: Math.round(totalCost / Math.max(1, totalDurationDays))
      },
      outcome_quality: {
        final_status: finalStatus,
        preventable_complications: randInt(0, Math.min(2, complications.length)),
        quality_score: finalStatus === "HEALED" ? round2(0.85 + rng() * 0.15) : finalStatus === "HEALED_WITH_COMPLICATIONS" ? round2(0.60 + rng() * 0.25) : round2(0.10 + rng() * 0.30)
      }
    }
  };

  return patientGraph;
}

// ─── Sub-generators ───

function generateDepartmentFlow(diagnosis, severity, finalStatus) {
  const flow = ["ambulance", "emergency"];

  const needsICU = severity === "critical" || severity === "severe" || (severity === "moderate_with_RV_strain") || rng() > 0.6;

  if (diagnosis.category === "surgical") {
    flow.push("emergency", "operating_room", "surgery");
    if (needsICU) flow.push("icu", "surgery");
    flow.push("surgery");
  } else if (diagnosis.category === "cardiovascular") {
    flow.push("emergency");
    if (needsICU) flow.push("icu", "icu");
    flow.push("cardiology", "cardiology");
    if (needsICU) flow.push("step_down");
  } else if (diagnosis.category === "respiratory") {
    flow.push("emergency");
    if (needsICU) flow.push("icu");
    flow.push("pulmonology", "pulmonology");
  } else if (diagnosis.category === "neurological") {
    flow.push("emergency");
    if (needsICU) flow.push("icu", "icu");
    flow.push("neurology", "neurology");
    if (needsICU) flow.push("step_down");
  } else if (diagnosis.category === "orthopedic") {
    flow.push("emergency", "radiology", "operating_room", "orthopedics", "orthopedics");
  } else if (diagnosis.category === "trauma") {
    flow.push("emergency", "emergency", "radiology", "operating_room", "icu", "icu", "surgery", "step_down");
  } else {
    flow.push("emergency");
    if (needsICU) flow.push("icu");
    flow.push("internal_medicine", "internal_medicine");
  }

  if (finalStatus === "DECEASED") {
    flow.push("icu");
  }

  return flow;
}

function generateDecision(actionCategory, diagnosis, doctor, nodeIdx, totalNodes, severity) {
  const actions = {
    admission: ["emergency_admission", "emergency_transport_to_hospital"],
    triage: [`triage_assessment_code_${severity === "critical" ? "RED" : severity === "severe" ? "RED" : "ORANGE"}`],
    diagnostic: ["order_laboratory_workup", "order_imaging_study", "order_CT_scan", "order_MRI", "order_echocardiogram", "order_EKG", "order_chest_xray", "order_blood_cultures", "order_coagulation_panel"],
    treatment: ["start_anticoagulation", "start_antibiotics", "start_IV_fluids", "start_vasopressors", "administer_thrombolytic", "start_insulin_protocol", "pain_management", "start_oxygen_therapy", "blood_transfusion", "start_steroid_therapy"],
    monitoring: ["increase_monitoring_frequency", "ICU_level_monitoring", "telemetry_monitoring", "q15min_vitals", "continuous_pulse_oximetry"],
    consultation: ["request_cardiology_consult", "request_pulmonology_consult", "request_surgery_consult", "request_neurology_consult", "request_nephrology_consult", "request_infectious_disease_consult"],
    transfer: ["transfer_to_ICU", "transfer_to_ward", "transfer_to_step_down", "transfer_to_OR", "transfer_to_radiology"],
    procedure: ["central_line_insertion", "chest_tube_insertion", "intubation", "surgical_procedure", "cardiac_catheterization", "endoscopy", "bronchoscopy"],
    discharge: ["discharge_home", "discharge_to_rehabilitation", "discharge_with_follow_up"]
  };

  const action = pick(actions[actionCategory] || actions.treatment);

  return {
    action,
    action_category: actionCategory,
    made_by: {
      person_id: doctor.id,
      name: doctor.name,
      role: "attending_physician",
      specialty: doctor.specialty,
      experience_years: doctor.experience,
      hours_on_shift: round2(1 + rng() * 10),
      current_patient_load: randInt(2, 8),
      decision_confidence: round2(0.70 + rng() * 0.29)
    },
    reasoning: {
      primary_reason: `Clinical indication for ${action.replace(/_/g, ' ')} based on ${diagnosis.name.replace(/_/g, ' ')} presentation`,
      supporting_evidence: generateSupportingEvidence(diagnosis, severity),
      guidelines_followed: generateGuidelines(diagnosis)
    },
    alternatives_considered: rng() > 0.4 ? generateAlternatives(diagnosis, action) : [],
    orders: generateOrders(actionCategory, diagnosis, action),
    expected_outcome: {
      primary: `${actionCategory}_completion_and_stabilization`,
      expected_timeline: {
        immediate: "Clinical_response_monitoring",
        short_term: `${randInt(1, 48)}h_assessment`,
        goal: action.includes("discharge") ? "Safe_discharge" : "Clinical_improvement"
      }
    }
  };
}

function generateSupportingEvidence(diagnosis, severity) {
  const evidences = [
    `${diagnosis.name.replace(/_/g, ' ')} confirmed`,
    `Severity: ${severity}`,
    `Risk stratification completed`,
    `Vital signs assessment`,
    `Laboratory results reviewed`,
  ];
  if (severity === "critical" || severity === "severe") {
    evidences.push("High-risk presentation requiring immediate intervention");
    evidences.push("Hemodynamic instability present");
  }
  return evidences.slice(0, randInt(2, 5));
}

function generateGuidelines(diagnosis) {
  const guidelines = {
    cardiovascular: ["ESC 2023 guidelines", "AHA/ACC recommendations", "ACCP guidelines"],
    respiratory: ["GOLD 2023 guidelines", "ATS/IDSA guidelines", "BTS recommendations"],
    neurological: ["AHA/ASA stroke guidelines", "EAN recommendations"],
    surgical: ["NICE surgical guidelines", "ERAS protocols"],
    orthopedic: ["AAOS guidelines", "NICE hip fracture pathway"],
    infectious: ["IDSA guidelines", "Surviving Sepsis Campaign 2021"],
    gastrointestinal: ["ACG guidelines", "BSG recommendations"],
    endocrine: ["ADA Standards of Care 2024", "Endocrine Society guidelines"],
    renal: ["KDIGO guidelines", "ERA-EDTA recommendations"],
    trauma: ["ATLS protocols", "Eastern Association guidelines"],
  };
  return (guidelines[diagnosis.category] || ["Standard institutional protocols"]).slice(0, randInt(1, 2));
}

function generateAlternatives(diagnosis, currentAction) {
  return [{
    option: `alternative_${pick(["conservative_management", "surgical_approach", "different_medication", "watchful_waiting", "less_invasive_option"])}`,
    why_not_chosen: "Current approach has better evidence and risk-benefit profile for this patient",
    pros: ["Lower cost", "Less invasive"],
    cons: ["Lower efficacy", "Higher risk of treatment failure"],
    historical_outcome_if_chosen: {
      cases: randInt(30, 200),
      mortality_rate: round2(rng() * 0.15),
      success_rate: round2(0.60 + rng() * 0.30)
    }
  }];
}

function generateOrders(actionCategory, diagnosis, action) {
  const orders = [];
  const orderId = () => `ORD_${uuid4().slice(0, 8)}`;

  if (actionCategory === "diagnostic") {
    orders.push({
      order_id: orderId(),
      type: "laboratory",
      tests: pick([
        ["CBC", "BMP", "coagulation_panel"],
        ["troponin", "d_dimer", "BNP"],
        ["blood_cultures", "CBC", "CRP", "procalcitonin"],
        ["liver_function", "lipase", "amylase"],
        ["ABG", "lactate", "CBC"],
      ]),
      urgency: pick(["stat", "urgent"])
    });
    if (rng() > 0.4) {
      orders.push({
        order_id: orderId(),
        type: "imaging",
        study: pick(["CT_scan", "chest_xray", "MRI", "echocardiogram", "CT_angiography", "ultrasound"]),
        urgency: pick(["stat", "urgent", "routine"])
      });
    }
  } else if (actionCategory === "treatment") {
    orders.push({
      order_id: orderId(),
      type: "medication",
      medication: {
        name: pick(["heparin", "enoxaparin", "aspirin", "ceftriaxone", "vancomycin", "insulin", "norepinephrine", "morphine", "furosemide", "metoprolol", "alteplase", "amoxicillin", "piperacillin_tazobactam"]),
        dose: pick(["standard_dose", "weight_based", "renal_adjusted"]),
        route: pick(["IV", "PO", "SC", "IM"]),
        timing: pick(["immediate", "q6h", "q8h", "q12h", "once_daily", "continuous_infusion"]),
        indication: diagnosis.name
      },
      urgency: pick(["immediate", "urgent"])
    });
  } else if (actionCategory === "monitoring") {
    orders.push({
      order_id: orderId(),
      type: "monitoring",
      parameters: pick([
        ["vital_signs_q15min", "continuous_telemetry", "pulse_oximetry"],
        ["vital_signs_q1h", "neuro_checks_q2h"],
        ["vital_signs_q4h", "I_and_O_monitoring"],
        ["continuous_cardiac_monitoring", "arterial_line_monitoring"],
      ])
    });
  } else if (actionCategory === "transfer") {
    orders.push({
      order_id: orderId(),
      type: "transfer",
      details: { destination: action.replace("transfer_to_", ""), urgency: pick(["immediate", "urgent", "routine"]) }
    });
  }

  return orders;
}

function generateDifferentialDiagnosis(diagnosis) {
  const allDiag = DIAGNOSES.filter(d => d.name !== diagnosis.name);
  const numDiff = randInt(2, 5);
  const diffs = [];
  let remainingProb = 1.0 - (0.3 + rng() * 0.4);

  for (let i = 0; i < numDiff && allDiag.length > 0; i++) {
    const idx = Math.floor(rng() * allDiag.length);
    const d = allDiag.splice(idx, 1)[0];
    const prob = round2(remainingProb * (0.2 + rng() * 0.5));
    remainingProb -= prob;
    diffs.push({
      name: d.name,
      probability: Math.max(0.01, prob),
      ruled_out: rng() > 0.6
    });
  }
  return diffs;
}

function generateActiveMedications(diagnosis, nodeIdx, actionCategory) {
  if (nodeIdx < 2) return [];
  const meds = [];
  if (rng() > 0.3) meds.push({ medication: "oxygen", dose: pick(["2L/min", "4L/min", "6L/min"]), route: "nasal_cannula", status: "active" });
  if (rng() > 0.5) meds.push({ medication: "normal_saline", dose: "125mL/hr", route: "IV", status: "active" });

  if (diagnosis.category === "cardiovascular") {
    if (rng() > 0.4) meds.push({ medication: pick(["heparin_infusion", "enoxaparin", "aspirin"]), dose: "therapeutic", route: pick(["IV", "SC", "PO"]), status: "active" });
  }
  if (diagnosis.category === "infectious" || diagnosis.name.includes("pneumonia")) {
    if (rng() > 0.3) meds.push({ medication: pick(["ceftriaxone", "azithromycin", "piperacillin_tazobactam", "vancomycin"]), dose: "standard", route: "IV", status: "active" });
  }
  if (nodeIdx > 3 && rng() > 0.5) {
    meds.push({ medication: pick(["morphine_PRN", "acetaminophen", "ketorolac"]), dose: "PRN", route: pick(["IV", "PO"]), status: "active" });
  }
  return meds;
}

function generateEquipmentList(dept, diagnosis) {
  const equipment = [];
  if (dept !== "ambulance") {
    equipment.push({ equipment_id: `MONITOR_${dept.toUpperCase()}_${randInt(1, 50)}`, type: "cardiac_monitor" });
  }
  if (dept === "icu") {
    equipment.push({ equipment_id: `VENT_ICU_${randInt(1, 10)}`, type: "ventilator_standby" });
    equipment.push({ equipment_id: `ART_LINE_${randInt(1, 10)}`, type: "arterial_line_monitor" });
  }
  if (dept === "emergency") {
    equipment.push({ equipment_id: `O2_ER_${randInt(1, 20)}`, type: "oxygen_delivery" });
  }
  if (dept === "operating_room") {
    equipment.push({ equipment_id: `ANES_OR_${randInt(1, 5)}`, type: "anesthesia_machine" });
    equipment.push({ equipment_id: `SURG_TABLE_${randInt(1, 5)}`, type: "operating_table" });
  }
  return equipment;
}

function generatePotentialComplications(diagnosis, age, severity) {
  const pool = [
    ...(COMPLICATION_TYPES[diagnosis.category] || []),
    ...COMPLICATION_TYPES.general.slice(0, 4)
  ];
  const numComps = randInt(2, 5);
  const result = [];
  for (let i = 0; i < numComps && i < pool.length; i++) {
    const comp = pool[i];
    let prob = round2(0.01 + rng() * 0.12);
    if (age > 70) prob = round2(prob * 1.5);
    if (severity === "critical") prob = round2(prob * 1.8);
    result.push({
      complication_type: comp.type,
      icd10: comp.icd10,
      probability: Math.min(0.5, prob),
      severity_distribution: {
        mild: round2(prob * 0.4),
        moderate: round2(prob * 0.35),
        severe: round2(prob * 0.25)
      },
      mortality_if_occurs: comp.mortality_if_occurs,
      mitigation_strategies: [
        "Enhanced_monitoring",
        "Preventive_measures",
        "Early_intervention_protocol",
        "Specialist_consultation_if_occurs"
      ]
    });
  }
  return result;
}

function generateInteractionRisks(diagnosis) {
  if (rng() > 0.4) return [];
  return [{
    interaction_type: pick(["medication_interaction", "medication_disease_interaction", "complication_cascade"]),
    description: `Potential interaction identified for ${diagnosis.name.replace(/_/g, ' ')} treatment pathway`,
    probability: round2(0.01 + rng() * 0.08),
    mitigation: "Monitor_closely_and_adjust_as_needed"
  }];
}

function generateOverlappingDecisions() {
  return [{
    this_decision: pick(["anticoagulation", "vasopressors", "antibiotics", "sedation"]),
    overlapping_with: pick(["recent_aspirin", "concurrent_antibiotic", "recent_contrast", "recent_surgery"]),
    overlap_type: pick(["additive_risk", "drug_interaction", "timing_conflict"]),
    combined_risk: round2(0.03 + rng() * 0.10),
    mitigation: "Enhanced_monitoring_and_dose_adjustment"
  }];
}

function generateFlags(nodeIdx, diagnosis, severity, age, complications) {
  const flags = [];

  if (nodeIdx > 2 && rng() > 0.5) {
    flags.push({
      flag_id: `FLAG_${uuid4().slice(0, 8)}`,
      type: pick(["HIGH_RISK_COMPLICATION", "TIMING_CRITICAL", "CONSIDER_WORKUP", "DECISION_OVERLAP_RISK", "DOSAGE_CHECK", "INTERACTION_WARNING"]),
      severity: pick(["INFO", "WARNING", "CRITICAL"]),
      message: generateFlagMessage(diagnosis, severity, age),
      evidence: {
        similar_cases: randInt(50, 500),
        complication_rate: round2(0.02 + rng() * 0.15),
        supporting_data_points: randInt(3, 10)
      },
      recommendation: {
        action: pick(["PROCEED_WITH_ENHANCED_MONITORING", "CONSIDER_ALTERNATIVE", "ORDER_ADDITIONAL_WORKUP", "PRIORITIZE_IMMEDIATE_ACTION", "ADJUST_DOSAGE"]),
        message: `Based on ${randInt(50, 500)} similar historical cases`
      }
    });
  }

  if (severity === "critical" || severity === "severe") {
    flags.push({
      flag_id: `FLAG_${uuid4().slice(0, 8)}`,
      type: "HIGH_RISK_PRESENTATION",
      severity: "WARNING",
      message: `${severity.toUpperCase()} presentation of ${diagnosis.name.replace(/_/g, ' ')} - elevated mortality risk`,
      evidence: {
        baseline_mortality: round2(diagnosis.mortality_base),
        adjusted_mortality: round2(diagnosis.mortality_base * (severity === "critical" ? 2.0 : 1.5)),
        similar_cases: randInt(100, 1000)
      },
      recommendation: {
        action: "ESCALATE_CARE_LEVEL",
        message: "Consider ICU admission and specialist consultation"
      }
    });
  }

  if (age > 75 && rng() > 0.3) {
    flags.push({
      flag_id: `FLAG_${uuid4().slice(0, 8)}`,
      type: "AGE_RELATED_RISK",
      severity: "INFO",
      message: `Patient age ${age} increases complication risk by approximately 50-80%`,
      evidence: {
        age_adjusted_mortality: round2(diagnosis.mortality_base * 1.8),
        age_adjusted_complications: round2(diagnosis.complication_rate * 1.5)
      },
      recommendation: {
        action: "ENHANCED_MONITORING",
        message: "Age-appropriate dosing and increased monitoring frequency recommended"
      }
    });
  }

  return flags;
}

function generateFlagMessage(diagnosis, severity, age) {
  const messages = [
    `Elevated complication risk detected for ${diagnosis.name.replace(/_/g, ' ')} treatment pathway`,
    `Historical data shows ${randInt(5, 20)}% adverse event rate in similar presentations`,
    `Timing-sensitive intervention: delays >60min associated with worse outcomes`,
    `Medication interaction check: review concurrent medications for additive risks`,
    `Consider alternative treatment pathway: lower risk option available based on ${randInt(50, 300)} similar cases`,
    `Dosage adjustment may be needed: renal function borderline`,
    `Undiagnosed condition screening recommended based on atypical disease progression`,
    `Resource constraint alert: department nearing capacity may impact care quality`,
  ];
  return pick(messages);
}

function generateChiefComplaint(diagnosis) {
  const complaints = {
    cardiovascular: ["chest_pain", "chest_pain_and_dyspnea", "palpitations", "syncope", "acute_dyspnea", "leg_swelling"],
    respiratory: ["shortness_of_breath", "cough_and_fever", "wheezing", "hemoptysis", "acute_dyspnea"],
    neurological: ["sudden_weakness", "slurred_speech", "severe_headache", "seizure", "altered_consciousness"],
    surgical: ["abdominal_pain", "right_lower_quadrant_pain", "nausea_vomiting", "abdominal_distension"],
    orthopedic: ["fall_with_hip_pain", "inability_to_bear_weight", "traumatic_injury", "joint_pain_and_swelling"],
    infectious: ["fever_and_chills", "altered_mental_status", "high_fever", "urinary_symptoms"],
    gastrointestinal: ["abdominal_pain", "hematemesis", "melena", "severe_nausea", "right_upper_quadrant_pain"],
    endocrine: ["altered_consciousness", "polyuria_polydipsia", "confusion", "nausea_vomiting"],
    renal: ["decreased_urine_output", "edema", "nausea", "confusion"],
    trauma: ["multiple_injuries", "motor_vehicle_accident", "fall_from_height", "assault"],
  };
  return pick(complaints[diagnosis.category] || ["acute_complaint"]);
}

function buildDeptUtilization(nodes, departmentFlow) {
  const deptMap = {};
  nodes.forEach(node => {
    const deptId = node.logistics.location.department.id;
    if (!deptMap[deptId]) {
      deptMap[deptId] = {
        department: node.logistics.location.department.name,
        department_id: deptId,
        first_node: node.node_id,
        last_node: node.node_id,
        node_count: 0,
        total_cost: 0,
        personnel_involved: new Set()
      };
    }
    deptMap[deptId].last_node = node.node_id;
    deptMap[deptId].node_count++;
    deptMap[deptId].total_cost += node.execution.total_cost.total;
    if (node.logistics.personnel_assigned.attending_physician) {
      deptMap[deptId].personnel_involved.add(node.logistics.personnel_assigned.attending_physician.id);
    }
    if (node.logistics.personnel_assigned.primary_nurse) {
      deptMap[deptId].personnel_involved.add(node.logistics.personnel_assigned.primary_nurse.id);
    }
  });

  return Object.values(deptMap).map(d => ({
    department: d.department,
    department_id: d.department_id,
    entry_node: d.first_node,
    exit_node: d.last_node,
    nodes: d.node_count,
    personnel_ids: [...d.personnel_involved],
    cost_eur: Math.round(d.total_cost)
  }));
}

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}min ${s}s`;
}

// ─── Generate all 100 patients ───

console.log("Generating 100 patient flows...");

const allPatients = [];
for (let i = 0; i < 100; i++) {
  if (i % 10 === 0) console.log(`  Generating patient ${i + 1}/100...`);
  allPatients.push(generatePatientFlow(i));
}

// Summary statistics
const stats = {
  total_patients: 100,
  outcomes: {
    healed: allPatients.filter(p => p.final_outcome.status === "HEALED").length,
    healed_with_complications: allPatients.filter(p => p.final_outcome.status === "HEALED_WITH_COMPLICATIONS").length,
    deceased: allPatients.filter(p => p.final_outcome.status === "DECEASED").length
  },
  diagnoses: {},
  avg_los_days: round2(allPatients.reduce((s, p) => s + p.discharge.duration_days, 0) / 100),
  avg_nodes_per_patient: round2(allPatients.reduce((s, p) => s + p.final_outcome.summary.total_nodes, 0) / 100),
  total_cost_eur: allPatients.reduce((s, p) => s + p.final_outcome.summary.total_cost_eur, 0),
  avg_cost_per_patient_eur: 0,
  total_complications: allPatients.reduce((s, p) => s + p.final_outcome.summary.complications_total, 0),
  generated_at: new Date().toISOString()
};
stats.avg_cost_per_patient_eur = Math.round(stats.total_cost_eur / 100);

allPatients.forEach(p => {
  const diag = p.nodes[0]?.patient_state?.diagnosis?.primary?.name || "unknown";
  stats.diagnoses[diag] = (stats.diagnoses[diag] || 0) + 1;
});

const output = {
  metadata: {
    description: "Hospital AI Predictive Analysis - 100 Patient Flow Graphs",
    version: "2.0",
    schema: "patient_graph_v2",
    generated_at: stats.generated_at,
    total_patients: 100,
    statistics: stats
  },
  patients: allPatients
};

const outputPath = join(__dirname, '..', 'public', 'data', 'patient-flows.json');
// Ensure directory exists
import { mkdirSync } from 'fs';
try { mkdirSync(join(__dirname, '..', 'public', 'data'), { recursive: true }); } catch (e) {}

writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');

console.log(`\n✅ Generated ${allPatients.length} patient flows`);
console.log(`📁 Output: ${outputPath}`);
console.log(`📊 Statistics:`);
console.log(`   Healed: ${stats.outcomes.healed}`);
console.log(`   Healed with complications: ${stats.outcomes.healed_with_complications}`);
console.log(`   Deceased: ${stats.outcomes.deceased}`);
console.log(`   Avg LOS: ${stats.avg_los_days} days`);
console.log(`   Avg nodes/patient: ${stats.avg_nodes_per_patient}`);
console.log(`   Total cost: €${stats.total_cost_eur.toLocaleString()}`);
console.log(`   Avg cost/patient: €${stats.avg_cost_per_patient_eur.toLocaleString()}`);
console.log(`   Total complications: ${stats.total_complications}`);
console.log(`   Diagnoses distribution:`, stats.diagnoses);

