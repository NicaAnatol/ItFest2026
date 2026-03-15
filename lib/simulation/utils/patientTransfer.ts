import { Patient } from '@/lib/simulation/types/building';
import { Department } from '@/lib/simulation/types/building';

interface Hospital {
  id: string;
  name: string;
  departments: Department[];
  position?: { x: number; y: number };
}

interface TransferDecision {
  shouldTransfer: boolean;
  targetHospitalId?: string;
  reason?: string;
  missingDepartment?: string;
  distance?: number; // km
  estimatedDurationMinutes?: number;
}

/**
 * Calculate distance between two hospitals (Euclidean distance on canvas, converted to km)
 */
export function calculateHospitalDistance(
  hospital1: { position?: { x: number; y: number } },
  hospital2: { position?: { x: number; y: number } }
): number {
  if (!hospital1.position || !hospital2.position) {
    return 5; // Default 5km if position not available
  }

  const dx = hospital2.position.x - hospital1.position.x;
  const dy = hospital2.position.y - hospital1.position.y;
  const canvasDistance = Math.sqrt(dx * dx + dy * dy);

  // Convert canvas units to km (assuming 100 canvas units = ~5km based on city config)
  const kmDistance = (canvasDistance / 100) * 5;
  return Math.max(0.5, Math.round(kmDistance * 10) / 10); // Minimum 0.5km, round to 1 decimal
}

/**
 * Calculate transfer duration based on distance and urgency
 */
export function calculateTransferDuration(
  distanceKm: number,
  patientSeverity: 'critical' | 'high' | 'medium' | 'low'
): number {
  // Ambulance speeds based on urgency (km/h)
  const speeds = {
    critical: 80,  // Fast with sirens
    high: 60,      // Moderate speed
    medium: 50,    // Normal speed
    low: 40        // Slow speed
  };

  const speed = speeds[patientSeverity];
  const hours = distanceKm / speed;
  const minutes = Math.ceil(hours * 60);

  return Math.max(2, minutes); // Minimum 2 minutes
}

/**
 * Check if a patient needs transfer for their NEXT upcoming visit
 * This allows patients to do some visits locally, then transfer for missing departments
 */
export function checkNextVisitTransferNeed(
  patient: Patient,
  currentHospital: Hospital,
  allHospitals: Hospital[],
  currentTime: string
): TransferDecision {
  // Find the next visit that hasn't happened yet
  const todayVisits = patient.visits;
  if (todayVisits.length === 0) {
    return { shouldTransfer: false };
  }

  // Sort visits by start time
  const sortedVisits = todayVisits.sort((a, b) => {
    const [aH, aM] = a.startTime.split(':').map(Number);
    const [bH, bM] = b.startTime.split(':').map(Number);
    return (aH * 60 + aM) - (bH * 60 + bM);
  });

  // Find next visit after current time
  const [currH, currM] = currentTime.split(':').map(Number);
  const currMinutes = currH * 60 + currM;

  let nextVisit = null;
  for (const visit of sortedVisits) {
    const [vH, vM] = visit.startTime.split(':').map(Number);
    const vMinutes = vH * 60 + vM;
    if (vMinutes > currMinutes) {
      nextVisit = visit;
      break;
    }
  }

  if (!nextVisit) {
    return { shouldTransfer: false };
  }

  // Check if next visit's department exists in current hospital
  const availableDepartmentTypes = new Set(
    currentHospital.departments.map(dept => dept.type)
  );

  const availableDepartmentIds = new Set(
    currentHospital.departments.map(dept => dept.id)
  );

  // Extract department type from next visit
  let deptType = nextVisit.departmentId;
  const match = nextVisit.departmentId.match(/^dept-(.+)-\d+$/);
  if (match) {
    deptType = match[1];
  }

  // Check if department exists
  const departmentExists = availableDepartmentIds.has(nextVisit.departmentId) ||
                          availableDepartmentTypes.has(deptType);

  if (departmentExists) {
    return { shouldTransfer: false };
  }

  // Department missing - find closest hospital that has it
  let bestHospital: Hospital | null = null;
  let bestDistance = Infinity;

  for (const hospital of allHospitals) {
    if (hospital.id === currentHospital.id) continue;

    const hospitalDeptTypes = new Set(hospital.departments.map(d => d.type));
    const hospitalDeptIds = new Set(hospital.departments.map(d => d.id));

    const hasNeededDept = hospitalDeptIds.has(nextVisit.departmentId) ||
                          hospitalDeptTypes.has(deptType);

    if (hasNeededDept) {
      const distance = calculateHospitalDistance(currentHospital, hospital);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestHospital = hospital;
      }
    }
  }

  if (bestHospital) {
    const distance = calculateHospitalDistance(currentHospital, bestHospital);
    const duration = calculateTransferDuration(distance, patient.severity);

    return {
      shouldTransfer: true,
      targetHospitalId: bestHospital.id,
      reason: `Missing ${deptType}`,
      missingDepartment: deptType,
      distance,
      estimatedDurationMinutes: duration
    };
  }

  // No hospital has this department - patient leaves the system
  return {
    shouldTransfer: true,
    targetHospitalId: 'OUTSIDE_SYSTEM', // Special marker
    reason: `Leaving abroad - ${deptType} unavailable`,
    missingDepartment: deptType,
    distance: 0, // They just leave
    estimatedDurationMinutes: 5 // Quick exit
  };
}

/**
 * Check if a patient needs to be transferred to another hospital
 * because required departments are not available in current hospital
 */
export function checkPatientTransferNeed(
  patient: Patient,
  currentHospital: Hospital,
  allHospitals: Hospital[]
): TransferDecision {
  // Get all department types needed for this patient's visits
  const requiredDepartments = new Set<string>();

  patient.visits.forEach(visit => {
    // Extract department type from departmentId
    // Format can be: "dept-{type}-{floor}", "{type}", or direct ID
    const match = visit.departmentId.match(/^dept-(.+)-\d+$/);
    if (match) {
      requiredDepartments.add(match[1]);
    } else {
      // Try to match against department IDs directly
      const dept = currentHospital.departments.find(d => d.id === visit.departmentId);
      if (dept) {
        requiredDepartments.add(dept.type);
      } else {
        // If not found, use the ID as type
        requiredDepartments.add(visit.departmentId);
      }
    }
  });

  // Check which departments are missing in current hospital
  const availableDepartmentTypes = new Set(
    currentHospital.departments.map(dept => dept.type)
  );

  const availableDepartmentIds = new Set(
    currentHospital.departments.map(dept => dept.id)
  );

  const missingDepartments = Array.from(requiredDepartments).filter(
    deptType => !availableDepartmentTypes.has(deptType) && !availableDepartmentIds.has(deptType)
  );

  if (missingDepartments.length === 0) {
    return { shouldTransfer: false };
  }

  // Find the closest hospital that has all required departments
  let bestHospital: Hospital | null = null;
  let bestDistance = Infinity;

  for (const hospital of allHospitals) {
    if (hospital.id === currentHospital.id) continue;

    const hospitalDeptTypes = new Set(hospital.departments.map(d => d.type));
    const hasAllRequired = Array.from(requiredDepartments).every(
      reqType => hospitalDeptTypes.has(reqType)
    );

    if (hasAllRequired) {
      const distance = calculateHospitalDistance(currentHospital, hospital);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestHospital = hospital;
      }
    }
  }

  if (bestHospital && bestHospital.position) {
    const distance = calculateHospitalDistance(currentHospital, bestHospital);
    const duration = calculateTransferDuration(distance, patient.severity);

    return {
      shouldTransfer: true,
      targetHospitalId: bestHospital.id,
      reason: `Missing ${missingDepartments.join(', ')}`,
      missingDepartment: missingDepartments[0],
      distance,
      estimatedDurationMinutes: duration
    };
  }

  // Find closest hospital with at least some missing departments
  bestHospital = null;
  bestDistance = Infinity;

  for (const hospital of allHospitals) {
    if (hospital.id === currentHospital.id) continue;

    const hospitalDeptTypes = new Set(hospital.departments.map(d => d.type));
    const hasSomeMissing = missingDepartments.some(
      deptType => hospitalDeptTypes.has(deptType)
    );

    if (hasSomeMissing) {
      const distance = calculateHospitalDistance(currentHospital, hospital);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestHospital = hospital;
      }
    }
  }

  if (bestHospital && bestHospital.position) {
    const distance = calculateHospitalDistance(currentHospital, bestHospital);
    const duration = calculateTransferDuration(distance, patient.severity);

    return {
      shouldTransfer: true,
      targetHospitalId: bestHospital.id,
      reason: `Transfer for ${missingDepartments[0]}`,
      missingDepartment: missingDepartments[0],
      distance,
      estimatedDurationMinutes: duration
    };
  }

  // No suitable hospital found
  return {
    shouldTransfer: false,
    reason: `No hospital has ${missingDepartments.join(', ')}`
  };
}

/**
 * Initiate a transfer for a patient
 */
export function initiatePatientTransfer(
  patient: Patient,
  targetHospitalId: string,
  reason: string,
  distanceKm?: number,
  estimatedDurationMinutes?: number,
  currentTime?: string
): Patient {
  return {
    ...patient,
    isTransferring: true,
    transferTo: targetHospitalId,
    transferReason: reason,
    transferProgress: 0,
    transferredFrom: patient.currentHospitalId,
    transferDistance: distanceKm,
    transferDurationMinutes: estimatedDurationMinutes,
    transferStartTime: currentTime
  };
}

/**
 * Complete a transfer and move patient to new hospital
 */
export function completePatientTransfer(patient: Patient): Patient {
  if (!patient.transferTo) return patient;

  return {
    ...patient,
    currentHospitalId: patient.transferTo,
    isTransferring: false,
    transferProgress: 0,
    transferTo: undefined,
    transferDistance: undefined,
    transferDurationMinutes: undefined
  };
}

/**
 * Update transfer animation progress based on actual transfer duration
 */
export function updateTransferProgress(
  patient: Patient,
  deltaTime: number // milliseconds
): Patient {
  if (!patient.isTransferring) return patient;

  // Use actual transfer duration if available, otherwise default to 5 seconds
  const transferDurationMs = patient.transferDurationMinutes
    ? patient.transferDurationMinutes * 1000 // 1 real minute = 1 second animation
    : 5000; // Default 5 seconds

  const transferSpeed = 1 / transferDurationMs; // Progress per millisecond
  const newProgress = Math.min(1, (patient.transferProgress || 0) + deltaTime * transferSpeed);

  if (newProgress >= 1) {
    return completePatientTransfer(patient);
  }

  return {
    ...patient,
    transferProgress: newProgress
  };
}

/**
 * Reassign patient visits to departments in new hospital
 */
export function reassignPatientVisits(
  patient: Patient,
  newHospitalBuilding: { floors: Array<{ departments: Department[] }> }
): Patient {
  // Flatten all departments from the building
  const allDepartments = newHospitalBuilding.floors.flatMap(f => f.departments);

  const updatedVisits = patient.visits.map(visit => {
    // Extract department type from old visit
    const match = visit.departmentId.match(/^dept-(.+)-\d+$/);
    const deptType = match ? match[1] : visit.departmentId;

    // Find matching department in new hospital
    const newDepartment = allDepartments.find(d => d.type === deptType);

    if (newDepartment) {
      return {
        ...visit,
        departmentId: newDepartment.id
      };
    }

    // Keep original if no match found
    return visit;
  });

  return {
    ...patient,
    visits: updatedVisits
  };
}

/**
 * Calculate mortality increase during transfer
 * Transfer time counts as waiting time and increases mortality risk
 */
export function calculateTransferMortality(
  patient: Patient,
  transferDurationMinutes: number
): { adjustedMortalityRisk: number; isDead: boolean; causeOfDeath?: string; timeOfDeath?: string } {
  const baseMortality = patient.mortalityRisk;
  const mortalityIncrease = patient.mortalityIncreasePerHour;
  const criticalTime = patient.timeToTreatment;

  // Calculate total waiting time including transfer
  const totalWaitingTime = (patient.totalWaitingTime || 0) + transferDurationMinutes;

  // If waiting time exceeds critical time, mortality increases
  const delay = totalWaitingTime - criticalTime;

  let adjustedRisk = baseMortality;
  let died = false;
  let cause: string | undefined;

  if (delay > 0) {
    const delayHours = delay / 60;
    const additionalMortality = mortalityIncrease * delayHours;
    adjustedRisk = Math.min(100, baseMortality + additionalMortality);

    // Check if patient dies during transfer (based on severity)
    // Critical patients have higher chance of dying during transfer
    const severityMultiplier = patient.severity === 'critical' ? 3.0 :
                               patient.severity === 'high' ? 1.5 : 1.0;

    const mortalityPerMinute = (adjustedRisk / 100 / 60) * severityMultiplier;
    const deathChance = mortalityPerMinute * transferDurationMinutes;

    if (Math.random() < deathChance) {
      died = true;
      cause = 'delayed_treatment';
    }
  }

  return {
    adjustedMortalityRisk: adjustedRisk,
    isDead: died,
    causeOfDeath: cause
  };
}

