// Real-world medical statistics for realistic patient simulation
// Based on WHO, CDC, and European hospital data

export interface MedicalCondition {
  name: string;
  prevalence: number;  // Percentage of all cases (0-100)
  mortalityRate: number;  // Percentage mortality risk (0-100)
  timeToTreatment: number;  // Critical minutes before outcomes worsen
  typicalDuration: number;  // Average treatment duration in minutes
  requiresAdmission: number;  // Probability of hospitalization (0-1)
  departments: string[];  // Typical route through departments
  mortalityIncreasePerHour: number;  // NEW: How much mortality increases per hour of delay (%)
}

// 1. EMERGENCY/AMBULANCE CONDITIONS (15% of all patients)
// High mortality, time-critical - DELAY KILLS
export const emergencyConditions: MedicalCondition[] = [
  {
    name: 'Cardiac Arrest / MI',
    prevalence: 20,  // 20% of emergency cases
    mortalityRate: 35,  // 35% mortality if not treated quickly
    timeToTreatment: 15,  // Golden 15 minutes
    typicalDuration: 180,
    requiresAdmission: 0.95,
    departments: ['emergency', 'triage', 'cardiology', 'icu', 'treatment-1'],  // Added ICU
    mortalityIncreasePerHour: 25  // +25% mortality per hour delay (CRITICAL!)
  },
  {
    name: 'Stroke (CVA)',
    prevalence: 15,
    mortalityRate: 25,
    timeToTreatment: 60,  // Golden hour
    typicalDuration: 150,
    requiresAdmission: 0.90,
    departments: ['emergency', 'triage', 'neurology', 'icu', 'treatment-1'],  // Added ICU
    mortalityIncreasePerHour: 18  // +18% per hour - "Time is Brain"
  },
  {
    name: 'Severe Trauma',
    prevalence: 25,
    mortalityRate: 30,
    timeToTreatment: 30,
    typicalDuration: 200,
    requiresAdmission: 0.85,
    departments: ['emergency', 'triage', 'xray', 'orthopedics', 'preop', 'surgery-1', 'postop', 'treatment-1'],  // Added surgery path
    mortalityIncreasePerHour: 20  // +20% per hour - bleeding/shock
  },
  {
    name: 'Respiratory Failure',
    prevalence: 10,
    mortalityRate: 20,
    timeToTreatment: 20,
    typicalDuration: 120,
    requiresAdmission: 0.80,
    departments: ['emergency', 'triage', 'icu', 'treatment-1'],  // Added ICU for critical respiratory
    mortalityIncreasePerHour: 22  // +22% per hour - oxygen deprivation
  },
  {
    name: 'Severe Bleeding',
    prevalence: 15,
    mortalityRate: 28,
    timeToTreatment: 25,
    typicalDuration: 160,
    requiresAdmission: 0.70,
    departments: ['emergency', 'triage', 'treatment-1'],
    mortalityIncreasePerHour: 24  // +24% per hour - blood loss
  },
  {
    name: 'Anaphylaxis',
    prevalence: 8,
    mortalityRate: 15,
    timeToTreatment: 10,
    typicalDuration: 90,
    requiresAdmission: 0.50,
    departments: ['emergency', 'triage', 'treatment-1'],
    mortalityIncreasePerHour: 30  // +30% per hour - EXTREMELY time-sensitive
  },
  {
    name: 'Severe Burns',
    prevalence: 7,
    mortalityRate: 22,
    timeToTreatment: 45,
    typicalDuration: 220,
    requiresAdmission: 0.88,
    departments: ['emergency', 'triage', 'preop', 'surgery-2', 'postop', 'icu', 'treatment-1'],  // Added surgery & ICU path
    mortalityIncreasePerHour: 12  // +12% per hour - infection/fluid loss
  }
];

// 2. COMMON CONDITIONS (50% of all patients)
// Low mortality, walk-in, family doctor first - delay less critical but still matters
export const commonConditions: MedicalCondition[] = [
  {
    name: 'Common Cold / Flu',
    prevalence: 30,
    mortalityRate: 0.1,
    timeToTreatment: 240,  // Not time-critical
    typicalDuration: 25,
    requiresAdmission: 0.01,
    departments: ['reception', 'waiting-1', 'consultation-1'],
    mortalityIncreasePerHour: 0.02  // +0.02% per hour - minimal impact
  },
  {
    name: 'Headache / Migraine',
    prevalence: 15,
    mortalityRate: 0.05,
    timeToTreatment: 180,
    typicalDuration: 30,
    requiresAdmission: 0.02,
    departments: ['reception', 'waiting-1', 'consultation-2'],
    mortalityIncreasePerHour: 0.01  // +0.01% per hour - very low
  },
  {
    name: 'Stomach Pain / Gastritis',
    prevalence: 12,
    mortalityRate: 0.2,
    timeToTreatment: 120,
    typicalDuration: 35,
    requiresAdmission: 0.05,
    departments: ['reception', 'waiting-1', 'consultation-1'],
    mortalityIncreasePerHour: 0.15  // +0.15% per hour - could be appendicitis
  },
  {
    name: 'Back Pain',
    prevalence: 10,
    mortalityRate: 0.01,
    timeToTreatment: 300,
    typicalDuration: 40,
    requiresAdmission: 0.03,
    departments: ['reception', 'waiting-1', 'consultation-3'],
    mortalityIncreasePerHour: 0.005  // +0.005% per hour - minimal
  },
  {
    name: 'Minor Injury',
    prevalence: 8,
    mortalityRate: 0.05,
    timeToTreatment: 90,
    typicalDuration: 45,
    requiresAdmission: 0.08,
    departments: ['reception', 'waiting-1', 'triage', 'consultation-2'],
    mortalityIncreasePerHour: 0.08  // +0.08% per hour - infection risk
  },
  {
    name: 'Skin Rash / Allergy',
    prevalence: 7,
    mortalityRate: 0.02,
    timeToTreatment: 240,
    typicalDuration: 20,
    requiresAdmission: 0.01,
    departments: ['reception', 'waiting-1', 'consultation-1'],
    mortalityIncreasePerHour: 0.03  // +0.03% per hour - could worsen
  },
  {
    name: 'Fever (Unknown)',
    prevalence: 8,
    mortalityRate: 0.3,
    timeToTreatment: 120,
    typicalDuration: 30,
    requiresAdmission: 0.10,
    departments: ['reception', 'waiting-1', 'triage', 'consultation-2', 'lab'],
    mortalityIncreasePerHour: 0.25  // +0.25% per hour - could be serious
  },
  {
    name: 'Cough / Bronchitis',
    prevalence: 10,
    mortalityRate: 0.15,
    timeToTreatment: 200,
    typicalDuration: 28,
    requiresAdmission: 0.04,
    departments: ['reception', 'waiting-1', 'consultation-3'],
    mortalityIncreasePerHour: 0.10  // +0.10% per hour - could become pneumonia
  }
];

// 3. HOSPITALIZED CONDITIONS (20% of all patients)
// Medium-high mortality, complex routes, longer stays - delay increases complications
export const hospitalizedConditions: MedicalCondition[] = [
  {
    name: 'Pneumonia',
    prevalence: 18,
    mortalityRate: 8,
    timeToTreatment: 90,
    typicalDuration: 240,
    requiresAdmission: 0.85,
    departments: ['reception', 'triage', 'xray', 'lab', 'treatment-1', 'treatment-2'],
    mortalityIncreasePerHour: 3.5  // +3.5% per hour - respiratory deterioration
  },
  {
    name: 'Diabetes Complication',
    prevalence: 15,
    mortalityRate: 5,
    timeToTreatment: 120,
    typicalDuration: 200,
    requiresAdmission: 0.70,
    departments: ['reception', 'lab', 'consultation-1', 'treatment-1'],
    mortalityIncreasePerHour: 2.5  // +2.5% per hour - blood sugar issues
  },
  {
    name: 'Cardiac Monitoring',
    prevalence: 12,
    mortalityRate: 10,
    timeToTreatment: 60,
    typicalDuration: 280,
    requiresAdmission: 0.90,
    departments: ['reception', 'cardiology', 'lab', 'icu', 'treatment-2'],  // Added ICU for cardiac monitoring
    mortalityIncreasePerHour: 5.0  // +5% per hour - heart complications
  },
  {
    name: 'Post-Surgery Care',
    prevalence: 10,
    mortalityRate: 3,
    timeToTreatment: 180,
    typicalDuration: 320,
    requiresAdmission: 1.0,
    departments: ['postop', 'treatment-1', 'treatment-2', 'lab', 'xray'],  // Added postop - they're already post-surgery
    mortalityIncreasePerHour: 1.5  // +1.5% per hour - infection/complications
  },
  {
    name: 'Kidney/Liver Issues',
    prevalence: 8,
    mortalityRate: 12,
    timeToTreatment: 100,
    typicalDuration: 260,
    requiresAdmission: 0.82,
    departments: ['reception', 'lab', 'ultrasound', 'consultation-2', 'treatment-2'],
    mortalityIncreasePerHour: 4.5  // +4.5% per hour - organ failure risk
  },
  {
    name: 'Severe Infection',
    prevalence: 9,
    mortalityRate: 9,
    timeToTreatment: 75,
    typicalDuration: 220,
    requiresAdmission: 0.88,
    departments: ['reception', 'triage', 'lab', 'icu', 'treatment-1'],  // Added ICU for severe infections (sepsis)
    mortalityIncreasePerHour: 6.0  // +6% per hour - sepsis risk
  },
  {
    name: 'Chronic Disease Management',
    prevalence: 12,
    mortalityRate: 4,
    timeToTreatment: 240,
    typicalDuration: 180,
    requiresAdmission: 0.60,
    departments: ['reception', 'consultation-1', 'lab', 'treatment-2'],
    mortalityIncreasePerHour: 1.0  // +1% per hour - stable but needs monitoring
  },
  {
    name: 'Neurological Monitoring',
    prevalence: 8,
    mortalityRate: 11,
    timeToTreatment: 90,
    typicalDuration: 300,
    requiresAdmission: 0.85,
    departments: ['reception', 'neurology', 'xray', 'treatment-1'],
    mortalityIncreasePerHour: 4.0  // +4% per hour - brain issues
  },
  {
    name: 'Cancer Treatment',
    prevalence: 8,
    mortalityRate: 15,
    timeToTreatment: 200,
    typicalDuration: 360,
    requiresAdmission: 0.75,
    departments: ['reception', 'lab', 'treatment-2', 'consultation-2'],
    mortalityIncreasePerHour: 2.0  // +2% per hour - treatment delays matter
  },
  {
    name: 'Appendicitis (Surgical)',
    prevalence: 8,
    mortalityRate: 6,
    timeToTreatment: 120,
    typicalDuration: 280,
    requiresAdmission: 1.0,
    departments: ['emergency', 'triage', 'ultrasound', 'lab', 'preop', 'surgery-1', 'postop', 'treatment-1'],  // Full surgery path
    mortalityIncreasePerHour: 8.0  // +8% per hour - appendix can rupture
  }
];

// 4. SCHEDULED CHECKUPS (15% of all patients)
// Medium mortality, specific diagnostic routes - delay less critical but still important
export const scheduledCheckupConditions: MedicalCondition[] = [
  {
    name: 'Routine Blood Work',
    prevalence: 25,
    mortalityRate: 0.5,
    timeToTreatment: 300,
    typicalDuration: 45,
    requiresAdmission: 0.02,
    departments: ['reception', 'lab', 'consultation-1'],
    mortalityIncreasePerHour: 0.10  // +0.10% per hour - could miss early warning signs
  },
  {
    name: 'X-Ray Screening',
    prevalence: 15,
    mortalityRate: 1.0,
    timeToTreatment: 240,
    typicalDuration: 60,
    requiresAdmission: 0.05,
    departments: ['reception', 'xray', 'consultation-2'],
    mortalityIncreasePerHour: 0.25  // +0.25% per hour - could miss critical findings
  },
  {
    name: 'Cardiac Checkup',
    prevalence: 12,
    mortalityRate: 2.5,
    timeToTreatment: 180,
    typicalDuration: 90,
    requiresAdmission: 0.08,
    departments: ['reception', 'cardiology', 'lab', 'consultation-1'],
    mortalityIncreasePerHour: 0.80  // +0.80% per hour - heart issues can escalate
  },
  {
    name: 'Ultrasound Scan',
    prevalence: 10,
    mortalityRate: 1.2,
    timeToTreatment: 200,
    typicalDuration: 70,
    requiresAdmission: 0.04,
    departments: ['reception', 'ultrasound', 'consultation-2'],
    mortalityIncreasePerHour: 0.30  // +0.30% per hour - could miss complications
  },
  {
    name: 'Pre-Surgery Assessment',
    prevalence: 8,
    mortalityRate: 3.0,
    timeToTreatment: 120,
    typicalDuration: 120,
    requiresAdmission: 0.15,
    departments: ['reception', 'lab', 'xray', 'consultation-1', 'preop', 'consultation-2'],  // Added preop
    mortalityIncreasePerHour: 1.2  // +1.2% per hour - surgery prep is important
  },
  {
    name: 'Follow-up Consultation',
    prevalence: 15,
    mortalityRate: 0.8,
    timeToTreatment: 280,
    typicalDuration: 40,
    requiresAdmission: 0.03,
    departments: ['reception', 'consultation-1'],
    mortalityIncreasePerHour: 0.20  // +0.20% per hour - monitoring post-treatment
  },
  {
    name: 'Orthopedic Assessment',
    prevalence: 8,
    mortalityRate: 0.3,
    timeToTreatment: 220,
    typicalDuration: 80,
    requiresAdmission: 0.10,
    departments: ['reception', 'xray', 'orthopedics', 'consultation-3'],
    mortalityIncreasePerHour: 0.08  // +0.08% per hour - mostly quality of life
  },
  {
    name: 'Neurology Screening',
    prevalence: 7,
    mortalityRate: 2.0,
    timeToTreatment: 160,
    typicalDuration: 100,
    requiresAdmission: 0.12,
    departments: ['reception', 'neurology', 'lab', 'consultation-2'],
    mortalityIncreasePerHour: 0.70  // +0.70% per hour - neurological issues can worsen
  },
  {
    name: 'Post-ICU Follow-up',
    prevalence: 5,
    mortalityRate: 4.5,
    timeToTreatment: 90,
    typicalDuration: 140,
    requiresAdmission: 0.30,
    departments: ['reception', 'lab', 'cardiology', 'consultation-1'],  // Follow-up after ICU stay
    mortalityIncreasePerHour: 2.0  // +2% per hour - recovery monitoring important
  }
];

// Patient type distribution (real-world hospital statistics)
export const patientTypeDistribution = {
  emergency: 0.15,        // 15% emergency/ambulance
  common: 0.50,           // 50% common walk-in
  hospitalized: 0.20,     // 20% hospitalized
  scheduled_checkup: 0.15 // 15% scheduled checkups
};

// Time distribution (when patients arrive) - real hospital patterns
export const arrivalDistribution = {
  // Morning peak (8:00-12:00): 40% of patients
  morning: { start: 8, end: 12, weight: 0.40 },
  // Afternoon (12:00-16:00): 30% of patients
  afternoon: { start: 12, end: 16, weight: 0.30 },
  // Evening (16:00-20:00): 20% of patients
  evening: { start: 16, end: 20, weight: 0.20 },
  // Early morning (7:00-8:00): 10% of patients
  earlyMorning: { start: 7, end: 8, weight: 0.10 }
};

// Age distribution (realistic population)
export const ageDistribution = {
  young: { min: 18, max: 30, weight: 0.20 },
  adult: { min: 31, max: 50, weight: 0.35 },
  middleAge: { min: 51, max: 65, weight: 0.25 },
  senior: { min: 66, max: 85, weight: 0.20 }
};

/**
 * Calculate adjusted mortality rate based on waiting time
 * @param baseRate - Base mortality rate (%)
 * @param increasePerHour - Mortality increase per hour of delay (%)
 * @param waitingMinutes - Actual waiting time in minutes
 * @param criticalTime - Critical time to treatment in minutes
 * @returns Adjusted mortality rate (%)
 */
export function calculateAdjustedMortality(
  baseRate: number,
  increasePerHour: number,
  waitingMinutes: number,
  criticalTime: number
): number {
  // If treated within critical time, use base rate
  if (waitingMinutes <= criticalTime) {
    return baseRate;
  }

  // Calculate delay beyond critical time
  const delayMinutes = waitingMinutes - criticalTime;
  const delayHours = delayMinutes / 60;

  // Calculate additional mortality from delay
  const additionalMortality = increasePerHour * delayHours;

  // Return adjusted rate (capped at 100%)
  return Math.min(100, baseRate + additionalMortality);
}

/**
 * Get mortality risk category based on rate
 */
export function getMortalityRiskCategory(mortalityRate: number): {
  level: 'minimal' | 'low' | 'moderate' | 'high' | 'critical';
  color: string;
  description: string;
} {
  if (mortalityRate >= 50) {
    return { level: 'critical', color: '#dc2626', description: 'Extremely High Risk' };
  } else if (mortalityRate >= 20) {
    return { level: 'high', color: '#ea580c', description: 'High Risk' };
  } else if (mortalityRate >= 5) {
    return { level: 'moderate', color: '#f59e0b', description: 'Moderate Risk' };
  } else if (mortalityRate >= 0.5) {
    return { level: 'low', color: '#84cc16', description: 'Low Risk' };
  } else {
    return { level: 'minimal', color: '#22c55e', description: 'Minimal Risk' };
  }
}
