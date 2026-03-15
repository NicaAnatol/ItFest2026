export interface Department {
  id: string;
  name: string;
  type: string;
  capacity?: number;
  processingTimeMinutes?: number;
  floor: number;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  color?: string;
}

export interface Floor {
  id: number;
  name: string;
  departments: Department[];
  paths: Path[];
}

export interface Path {
  from: string;
  to: string;
  waypoints: Point[];
}

export interface Point {
  x: number;
  y: number;
}

export interface Building {
  id: string;
  name: string;
  floors: Floor[];
}

export interface Visit {
  day: string;
  departmentId: string;
  startTime: string;
  endTime: string;
  waitingTimeMinutes?: number;  // Track actual waiting time for mortality calculation
  actualArrivalTime?: number;  // When patient actually started treatment (minutes)
}

// Extended Patient interface with medical context
export interface Patient {
  id: string;
  name: string;
  age: number;
  visits: Visit[];

  // Medical & statistical parameters
  patientType: 'emergency' | 'common' | 'hospitalized' | 'scheduled_checkup';
  condition: string;  // Medical condition/disease
  severity: 'critical' | 'high' | 'medium' | 'low';  // Severity level
  mortalityRisk: number;  // 0-100% base risk of death
  adjustedMortalityRisk?: number;  // Adjusted based on actual waiting time
  timeToTreatment: number;  // Minutes - how critical is wait time
  arrivalMethod: 'ambulance' | 'walk-in' | 'hospitalized' | 'scheduled';
  requiresAdmission: boolean;  // Needs to be hospitalized?
  randomFactor: number;  // 0-1 random variability in treatment flow
  mortalityIncreasePerHour: number;  // How much risk increases per hour of delay

  // NEW: Death tracking
  isDead?: boolean;  // Did patient die?
  timeOfDeath?: string;  // When did they die (HH:MM)
  causeOfDeath?: 'delayed_treatment' | 'natural_progression' | 'critical_condition';
  totalWaitingTime?: number;  // Total minutes spent waiting

  // NEW: Multi-hospital transfer tracking
  currentHospitalId?: string;  // Which hospital is patient currently in
  transferredFrom?: string;  // Previous hospital ID if transferred
  transferReason?: string;  // Why was patient transferred
  isTransferring?: boolean;  // Currently in transit between hospitals
  transferProgress?: number;  // 0-1 animation progress
  transferTo?: string;  // Target hospital ID
  transferDistance?: number;  // Distance in km
  transferDurationMinutes?: number;  // Estimated duration in minutes
  transferStartTime?: string;  // HH:MM when transfer started
}
