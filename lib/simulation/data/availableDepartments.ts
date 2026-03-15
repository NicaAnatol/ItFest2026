// Template library of all available hospital departments

export interface DepartmentTemplate {
  id: string;
  name: string;
  type: string;
  defaultCapacity: number;
  defaultProcessingTime: number;
  color: string;
  floor: number; // Default floor assignment
  description: string;
}

export const AVAILABLE_DEPARTMENTS: DepartmentTemplate[] = [
  // Ground Floor - Reception & Emergency
  { id: 'reception', name: 'Reception', type: 'Administrative', defaultCapacity: 5, defaultProcessingTime: 10, color: '#3b82f6', floor: 1, description: 'Reception main' },
  { id: 'waiting-1', name: 'Waiting Room', type: 'Waiting', defaultCapacity: 15, defaultProcessingTime: 15, color: '#8b5cf6', floor: 1, description: 'Waiting area' },
  { id: 'triage', name: 'Emergency Triage', type: 'Emergency', defaultCapacity: 3, defaultProcessingTime: 20, color: '#ef4444', floor: 1, description: 'Emergency evaluation' },
  { id: 'emergency', name: 'Emergency', type: 'Emergency', defaultCapacity: 4, defaultProcessingTime: 45, color: '#dc2626', floor: 1, description: 'Emergency treatment' },
  { id: 'pharmacy', name: 'Farmacie', type: 'Pharmacy', defaultCapacity: 6, defaultProcessingTime: 15, color: '#10b981', floor: 1, description: 'Distribuire medicamente' },
  { id: 'info', name: 'Information', type: 'Administrative', defaultCapacity: 2, defaultProcessingTime: 10, color: '#6366f1', floor: 1, description: 'Information desk' },

  // Floor 1 - Consultations & Diagnostics
  { id: 'consultation-1', name: 'Office 101', type: 'Medical', defaultCapacity: 2, defaultProcessingTime: 30, color: '#3b82f6', floor: 2, description: 'Office consultations' },
  { id: 'consultation-2', name: 'Office 102', type: 'Medical', defaultCapacity: 2, defaultProcessingTime: 30, color: '#3b82f6', floor: 2, description: 'Office consultations' },
  { id: 'consultation-3', name: 'Office 103', type: 'Medical', defaultCapacity: 2, defaultProcessingTime: 30, color: '#3b82f6', floor: 2, description: 'Office consultations' },
  { id: 'lab', name: 'Laborator', type: 'Diagnostic', defaultCapacity: 4, defaultProcessingTime: 25, color: '#06b6d4', floor: 2, description: 'Analize medicale' },
  { id: 'xray', name: 'Radiologie', type: 'Imaging', defaultCapacity: 3, defaultProcessingTime: 20, color: '#8b5cf6', floor: 2, description: 'Radiografii' },
  { id: 'ultrasound', name: 'Ecografie', type: 'Imaging', defaultCapacity: 3, defaultProcessingTime: 25, color: '#8b5cf6', floor: 2, description: 'Ecografie' },
  { id: 'waiting-2', name: 'Waiting Floor 1', type: 'Waiting', defaultCapacity: 12, defaultProcessingTime: 10, color: '#a855f7', floor: 2, description: 'Waiting room' },

  // Floor 2 - Specializations
  { id: 'cardiology', name: 'Cardiology', type: 'Specialized', defaultCapacity: 3, defaultProcessingTime: 40, color: '#f59e0b', floor: 3, description: 'Cardiology consultations' },
  { id: 'neurology', name: 'Neurology', type: 'Specialized', defaultCapacity: 3, defaultProcessingTime: 40, color: '#f59e0b', floor: 3, description: 'Consultations neurological' },
  { id: 'orthopedics', name: 'Orthopedics', type: 'Specialized', defaultCapacity: 3, defaultProcessingTime: 35, color: '#f59e0b', floor: 3, description: 'Consultations orthopedic' },
  { id: 'treatment-1', name: 'Treatment 1', type: 'Treatment', defaultCapacity: 4, defaultProcessingTime: 30, color: '#10b981', floor: 3, description: 'Treatment room' },
  { id: 'treatment-2', name: 'Treatment 2', type: 'Treatment', defaultCapacity: 4, defaultProcessingTime: 30, color: '#10b981', floor: 3, description: 'Treatment room' },
  { id: 'recovery', name: 'Recuperare', type: 'Treatment', defaultCapacity: 6, defaultProcessingTime: 60, color: '#14b8a6', floor: 3, description: 'Recuperare post-tratament' },

  // Floor 3 - Surgery & ICU
  { id: 'surgery-1', name: 'Operating Room 1', type: 'Surgery', defaultCapacity: 1, defaultProcessingTime: 120, color: '#dc2626', floor: 4, description: 'Operating room' },
  { id: 'surgery-2', name: 'Operating Room 2', type: 'Surgery', defaultCapacity: 1, defaultProcessingTime: 120, color: '#dc2626', floor: 4, description: 'Operating room' },
  { id: 'preop', name: 'Pre-Operator', type: 'PreOp', defaultCapacity: 5, defaultProcessingTime: 30, color: '#f59e0b', floor: 4, description: 'Surgery preparation' },
  { id: 'postop', name: 'Post-Operator', type: 'PostOp', defaultCapacity: 6, defaultProcessingTime: 90, color: '#10b981', floor: 4, description: 'Recuperare post-operatorie' },
  { id: 'icu', name: 'Intensive Care', type: 'ICU', defaultCapacity: 8, defaultProcessingTime: 240, color: '#991b1b', floor: 4, description: 'Intensive care' },
  { id: 'sterilization', name: 'Sterilizare', type: 'Support', defaultCapacity: 2, defaultProcessingTime: 20, color: '#6366f1', floor: 4, description: 'Sterilizare echipament' },
];
