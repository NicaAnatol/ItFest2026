import { Patient, Visit } from '../types/building';
import {
  emergencyConditions,
  commonConditions,
  hospitalizedConditions,
  scheduledCheckupConditions,
  patientTypeDistribution,
  arrivalDistribution,
  ageDistribution,
  MedicalCondition
} from '../data/medicalStatistics';

// Weighted random selection
function weightedRandom<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }

  return items[items.length - 1];
}

// Select patient type based on distribution
function selectPatientType(): 'emergency' | 'common' | 'hospitalized' | 'scheduled_checkup' {
  const rand = Math.random();
  let cumulative = 0;

  for (const [type, prob] of Object.entries(patientTypeDistribution)) {
    cumulative += prob;
    if (rand <= cumulative) {
      return type as 'emergency' | 'common' | 'hospitalized' | 'scheduled_checkup';
    }
  }

  return 'common';
}

// Select medical condition based on patient type
function selectCondition(patientType: string): MedicalCondition {
  let conditions: MedicalCondition[];

  switch (patientType) {
    case 'emergency':
      conditions = emergencyConditions;
      break;
    case 'common':
      conditions = commonConditions;
      break;
    case 'hospitalized':
      conditions = hospitalizedConditions;
      break;
    case 'scheduled_checkup':
      conditions = scheduledCheckupConditions;
      break;
    default:
      conditions = commonConditions;
  }

  // Weight by prevalence
  const weights = conditions.map(c => c.prevalence);
  return weightedRandom(conditions, weights);
}

// Generate arrival time based on distribution
function generateArrivalTime(): number {
  const timeSlots = Object.values(arrivalDistribution);
  const weights = timeSlots.map(slot => slot.weight);
  const selectedSlot = weightedRandom(timeSlots, weights);

  // Random time within the slot
  const hour = selectedSlot.start + Math.random() * (selectedSlot.end - selectedSlot.start);
  const minutes = Math.floor((hour % 1) * 60);
  const hours = Math.floor(hour);

  return hours * 60 + minutes; // Return in minutes
}

// Generate age based on distribution
function generateAge(): number {
  const ageGroups = Object.values(ageDistribution);
  const weights = ageGroups.map(g => g.weight);
  const selectedGroup = weightedRandom(ageGroups, weights);

  return Math.floor(selectedGroup.min + Math.random() * (selectedGroup.max - selectedGroup.min));
}

// Format minutes to HH:MM
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Generate route through departments
function generateVisits(
  condition: MedicalCondition,
  arrivalTimeMinutes: number,
  patientType: string,
  randomFactor: number
): Visit[] {
  const visits: Visit[] = [];
  let currentTime = arrivalTimeMinutes;

  // Get base departments from condition
  const departments = [...condition.departments];

  // Add randomness - sometimes skip departments or add extra ones
  if (randomFactor > 0.7) {
    // 30% chance to modify route
    if (Math.random() > 0.5 && departments.length > 2) {
      // Skip a non-critical department
      const skipIndex = 1 + Math.floor(Math.random() * (departments.length - 2));
      departments.splice(skipIndex, 1);
    }
  }

  // Add waiting room for common patients (50% chance)
  if (patientType === 'common' && Math.random() > 0.5) {
    if (!departments.includes('waiting-1') && !departments.includes('waiting-2')) {
      // Insert waiting room after reception
      const receptionIndex = departments.indexOf('reception');
      if (receptionIndex !== -1) {
        departments.splice(receptionIndex + 1, 0, Math.random() > 0.5 ? 'waiting-1' : 'waiting-2');
      }
    }
  }

  // Generate visits for each department
  departments.forEach((deptId, index) => {
    // Calculate duration with random variation (±20%)
    const baseDuration = condition.typicalDuration / departments.length;
    const variation = 1 + (Math.random() - 0.5) * 0.4;
    let duration = Math.floor(baseDuration * variation);

    // Special durations for specific departments
    if (deptId.includes('waiting')) {
      duration = Math.floor(10 + Math.random() * 30); // 10-40 minutes waiting
    } else if (deptId === 'reception') {
      duration = Math.floor(5 + Math.random() * 10); // 5-15 minutes
    } else if (deptId === 'triage') {
      duration = Math.floor(8 + Math.random() * 12); // 8-20 minutes
    } else if (deptId === 'lab') {
      duration = Math.floor(15 + Math.random() * 25); // 15-40 minutes
    } else if (deptId === 'xray' || deptId === 'ultrasound') {
      duration = Math.floor(20 + Math.random() * 20); // 20-40 minutes
    } else if (deptId.includes('treatment')) {
      duration = Math.floor(60 + Math.random() * 120); // 60-180 minutes for treatment
    }

    // Emergency patients get priority - shorter waits
    if (patientType === 'emergency' && deptId.includes('waiting')) {
      duration = Math.floor(2 + Math.random() * 8); // 2-10 minutes only
    }

    // Add transition time between departments (3-8 minutes)
    if (index > 0) {
      currentTime += Math.floor(3 + Math.random() * 5);
    }

    const startTime = currentTime;
    const endTime = currentTime + duration;

    visits.push({
      day: 'Test Day',
      departmentId: deptId,
      startTime: minutesToTime(startTime),
      endTime: minutesToTime(endTime)
    });

    currentTime = endTime;
  });

  return visits;
}

// Generate single realistic patient
export function generateRealisticPatient(patientIndex: number): Patient {
  const patientType = selectPatientType();
  const condition = selectCondition(patientType);
  const arrivalTime = generateArrivalTime();
  const age = generateAge();
  const randomFactor = Math.random(); // 0-1 variability

  // Generate visits based on condition and patient type
  const visits = generateVisits(condition, arrivalTime, patientType, randomFactor);

  // Determine arrival method
  let arrivalMethod: 'ambulance' | 'walk-in' | 'hospitalized' | 'scheduled';
  if (patientType === 'emergency') {
    arrivalMethod = 'ambulance';
  } else if (patientType === 'hospitalized') {
    arrivalMethod = 'hospitalized';
  } else if (patientType === 'scheduled_checkup') {
    arrivalMethod = 'scheduled';
  } else {
    arrivalMethod = 'walk-in';
  }

  // Determine severity
  let severity: 'critical' | 'high' | 'medium' | 'low';
  if (condition.mortalityRate >= 20) {
    severity = 'critical';
  } else if (condition.mortalityRate >= 10) {
    severity = 'high';
  } else if (condition.mortalityRate >= 3) {
    severity = 'medium';
  } else {
    severity = 'low';
  }

  return {
    id: `Patient ${patientIndex + 1}`,
    name: `Patient ${patientIndex + 1}`,
    age,
    visits,

    // Extended medical parameters
    patientType,
    condition: condition.name,
    severity,
    mortalityRisk: condition.mortalityRate,
    timeToTreatment: condition.timeToTreatment,
    arrivalMethod,
    requiresAdmission: Math.random() < condition.requiresAdmission,
    randomFactor,
    mortalityIncreasePerHour: condition.mortalityIncreasePerHour  // NEW: How delay affects mortality
  };
}

// Generate batch of realistic patients
export function generateRealisticPatients(count: number): Patient[] {
  const patients: Patient[] = [];

  for (let i = 0; i < count; i++) {
    patients.push(generateRealisticPatient(i));
  }

  // Sort by arrival time for realistic flow
  patients.sort((a, b) => {
    const timeA = a.visits[0]?.startTime || '08:00';
    const timeB = b.visits[0]?.startTime || '08:00';
    return timeA.localeCompare(timeB);
  });

  // Re-assign IDs after sorting
  patients.forEach((patient, index) => {
    patient.id = `Patient ${index + 1}`;
    patient.name = `Patient ${index + 1}`;
  });

  return patients;
}

// Statistics about generated patients
export function getPatientStatistics(patients: Patient[]) {
  const stats = {
    total: patients.length,
    byType: {
      emergency: 0,
      common: 0,
      hospitalized: 0,
      scheduled_checkup: 0
    },
    bySeverity: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    },
    avgMortalityRisk: 0,
    requiresAdmission: 0,
    byArrivalMethod: {
      ambulance: 0,
      walk_in: 0,
      hospitalized: 0,
      scheduled: 0
    },
    departmentUsage: {} as { [key: string]: number }
  };

  let totalMortality = 0;

  patients.forEach(patient => {
    stats.byType[patient.patientType]++;
    stats.bySeverity[patient.severity]++;
    totalMortality += patient.mortalityRisk;
    if (patient.requiresAdmission) stats.requiresAdmission++;

    const method = patient.arrivalMethod.replace('-', '_');
    stats.byArrivalMethod[method as keyof typeof stats.byArrivalMethod]++;

    // Count department usage
    patient.visits.forEach(visit => {
      if (!stats.departmentUsage[visit.departmentId]) {
        stats.departmentUsage[visit.departmentId] = 0;
      }
      stats.departmentUsage[visit.departmentId]++;
    });
  });

  stats.avgMortalityRisk = totalMortality / patients.length;

  return stats;
}
