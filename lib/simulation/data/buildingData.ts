import { Building, Patient, Department, Floor } from '../types/building';

// Multi-floor hospital building with realistic corridor layout and MORE SPACE
export const building: Building = {
  id: 'hospital-1',
  name: 'Hospital Municipal',
  floors: [
    {
      id: 1,
      name: 'Ground Floor - Reception & Emergency',
      departments: [
        // LEFT WING - Varied room sizes like real architecture (MORE SPACE)
        { id: 'reception', name: 'Reception', type: 'Administrative', capacity: 5, floor: 1, position: { x: 25, y: 20 }, size: { width: 120, height: 70 } },
        { id: 'waiting-1', name: 'Waiting Room', type: 'Waiting', capacity: 15, floor: 1, position: { x: 20, y: 150 }, size: { width: 130, height: 95 } },

        // CENTER WING - Emergency rooms (irregular shapes, SPACED)
        { id: 'triage', name: 'Emergency Triage', type: 'Emergency', capacity: 3, floor: 1, position: { x: 220, y: 25 }, size: { width: 75, height: 85 } },
        { id: 'emergency', name: 'Emergency', type: 'Emergency', capacity: 4, floor: 1, position: { x: 215, y: 165 }, size: { width: 95, height: 110 } },

        // RIGHT WING - Service rooms (different proportions, FURTHER)
        { id: 'pharmacy', name: 'Pharmacy', type: 'Pharmacy', capacity: 6, floor: 1, position: { x: 390, y: 20 }, size: { width: 105, height: 75 } },
        { id: 'info', name: 'Information', type: 'Administrative', capacity: 2, floor: 1, position: { x: 400, y: 155 }, size: { width: 80, height: 90 } },
      ],
      paths: [],
    },
    {
      id: 2,
      name: 'Floor 1 - Consultations & Diagnostics',
      departments: [
        // LEFT WING - Small consultation rooms (MORE VERTICAL SPACE)
        { id: 'consultation-1', name: 'Office 101', type: 'Medical', capacity: 2, floor: 2, position: { x: 30, y: 25 }, size: { width: 70, height: 65 } },
        { id: 'consultation-2', name: 'Office 102', type: 'Medical', capacity: 2, floor: 2, position: { x: 25, y: 135 }, size: { width: 85, height: 75 } },
        { id: 'consultation-3', name: 'Office 103', type: 'Medical', capacity: 2, floor: 2, position: { x: 30, y: 255 }, size: { width: 75, height: 80 } },

        // CENTER WING - Larger diagnostic rooms (MORE HORIZONTAL SPACE)
        { id: 'lab', name: 'Laboratory', type: 'Diagnostic', capacity: 4, floor: 2, position: { x: 205, y: 20 }, size: { width: 115, height: 85 } },
        { id: 'xray', name: 'Radiology', type: 'Imaging', capacity: 3, floor: 2, position: { x: 200, y: 160 }, size: { width: 110, height: 95 } },

        // RIGHT WING - Mixed sizes (FURTHER RIGHT)
        { id: 'ultrasound', name: 'Ultrasound', type: 'Imaging', capacity: 3, floor: 2, position: { x: 390, y: 25 }, size: { width: 95, height: 70 } },
        { id: 'waiting-2', name: 'Waiting', type: 'Waiting', capacity: 12, floor: 2, position: { x: 385, y: 155 }, size: { width: 100, height: 100 } },
      ],
      paths: [],
    },
    {
      id: 3,
      name: 'Floor 2 - Specializations',
      departments: [
        // LEFT WING - Specialized departments (MORE SPACE BETWEEN)
        { id: 'cardiology', name: 'Cardiology', type: 'Specialized', capacity: 3, floor: 3, position: { x: 25, y: 30 }, size: { width: 100, height: 75 } },
        { id: 'neurology', name: 'Neurology', type: 'Specialized', capacity: 3, floor: 3, position: { x: 30, y: 160 }, size: { width: 85, height: 90 } },

        // CENTER WING - Treatment rooms (SPACED OUT)
        { id: 'treatment-1', name: 'Treatment 1', type: 'Treatment', capacity: 4, floor: 3, position: { x: 215, y: 25 }, size: { width: 95, height: 70 } },
        { id: 'treatment-2', name: 'Treatment 2', type: 'Treatment', capacity: 4, floor: 3, position: { x: 210, y: 150 }, size: { width: 105, height: 95 } },

        // RIGHT WING - Different shapes (FURTHER)
        { id: 'orthopedics', name: 'Orthopedics', type: 'Specialized', capacity: 3, floor: 3, position: { x: 390, y: 20 }, size: { width: 90, height: 85 } },
        { id: 'recovery', name: 'Recovery', type: 'Treatment', capacity: 6, floor: 3, position: { x: 385, y: 160 }, size: { width: 110, height: 105 } },
      ],
      paths: [],
    },
    {
      id: 4,
      name: 'Floor 3 - Surgery & ICU',
      departments: [
        // LEFT WING - Operating rooms (LARGE SPACING)
        { id: 'surgery-1', name: 'Operating Room 1', type: 'Surgery', capacity: 1, floor: 4, position: { x: 20, y: 25 }, size: { width: 115, height: 95 } },
        { id: 'surgery-2', name: 'Operating Room 2', type: 'Surgery', capacity: 1, floor: 4, position: { x: 25, y: 175 }, size: { width: 110, height: 100 } },

        // CENTER WING - Pre/Post-op (SPACED OUT)
        { id: 'preop', name: 'Pre-Op', type: 'PreOp', capacity: 5, floor: 4, position: { x: 220, y: 20 }, size: { width: 100, height: 80 } },
        { id: 'postop', name: 'Post-Op', type: 'PostOp', capacity: 6, floor: 4, position: { x: 215, y: 160 }, size: { width: 105, height: 90 } },

        // RIGHT WING - Critical care (WELL SEPARATED)
        { id: 'icu', name: 'Intensive Care', type: 'ICU', capacity: 8, floor: 4, position: { x: 390, y: 20 }, size: { width: 120, height: 105 } },
        { id: 'sterilization', name: 'Sterilization', type: 'Support', capacity: 2, floor: 4, position: { x: 400, y: 185 }, size: { width: 95, height: 75 } },
      ],
      paths: [],
    },
  ],
};

// Default patients (minimal set for demo)
export const patients: Patient[] = [
  {
    id: 'p1',
    name: 'Patient 1',
    age: 45,
    visits: [
      { day: 'Monday', departmentId: 'reception', startTime: '08:00', endTime: '08:15' },
      { day: 'Monday', departmentId: 'triage', startTime: '08:20', endTime: '08:35' },
      { day: 'Monday', departmentId: 'consultation-1', startTime: '08:40', endTime: '09:10' },
    ],
    patientType: 'common',
    condition: 'Check-up',
    severity: 'low',
    mortalityRisk: 0.5,
    timeToTreatment: 60,
    arrivalMethod: 'walk-in',
    requiresAdmission: false,
    randomFactor: 0.5,
    mortalityIncreasePerHour: 0.1
  },
  {
    id: 'p2',
    name: 'Patient 2',
    age: 32,
    visits: [
      { day: 'Monday', departmentId: 'reception', startTime: '08:15', endTime: '08:30' },
      { day: 'Monday', departmentId: 'lab', startTime: '08:35', endTime: '09:00' },
    ],
    patientType: 'common',
    condition: 'Lab Test',
    severity: 'low',
    mortalityRisk: 0.1,
    timeToTreatment: 120,
    arrivalMethod: 'walk-in',
    requiresAdmission: false,
    randomFactor: 0.3,
    mortalityIncreasePerHour: 0.05
  },
];

// Helper functions
export function getDepartmentById(id: string): Department | undefined {
  for (const floor of building.floors) {
    const dept = floor.departments.find(d => d.id === id);
    if (dept) return dept;
  }
  return undefined;
}

export function getPatientsInDepartmentAtTime(
  departmentId: string,
  time: string,
  day: string
): Patient[] {
  const [hours, minutes] = time.split(':').map(Number);
  const currentMinutes = hours * 60 + minutes;

  return patients.filter((patient) => {
    return patient.visits.some((visit) => {
      if (visit.day !== day || visit.departmentId !== departmentId) return false;

      const [startH, startM] = visit.startTime.split(':').map(Number);
      const [endH, endM] = visit.endTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    });
  });
}

export function getPatientLocationAtTime(
  patientId: string,
  time: string,
  day: string
): string | null {
  const patient = patients.find(p => p.id === patientId);
  if (!patient) return null;

  const [hours, minutes] = time.split(':').map(Number);
  const currentMinutes = hours * 60 + minutes;

  const todayVisits = patient.visits.filter(v => v.day === day);

  for (const visit of todayVisits) {
    const [startH, startM] = visit.startTime.split(':').map(Number);
    const [endH, endM] = visit.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
      return visit.departmentId;
    }
  }

  return null;
}
