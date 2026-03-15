// Configuration types for simulation setup

// City-wide configuration with multiple hospitals
export interface CityConfig {
  enabled: boolean;
  cityName: string;
  population: number;
  hospitalCount: number;
  averageDistanceBetweenHospitals: number; // in km
  distributionMode: 'auto' | 'manual' | 'custom'; // auto = based on population, manual = all same, custom = per hospital
  hospitals: HospitalConfig[];
}

export interface HospitalConfig {
  id: string;
  name: string;
  position: { x: number; y: number }; // Position on city map

  // Can override city-wide settings
  simulationConfig: SimulationConfig;

  // Building structure (complete customization per hospital)
  customBuilding?: {
    enabled: boolean;
    floors: CustomFloorConfig[];
    floorCount: number;
  };
}

export interface CustomDepartmentConfig {
  id: string;
  name: string;
  type: string;
  capacity: number;
  processingTimeMinutes: number;
  position: { x: number; y: number };  // Position on floor
  color?: string;
}

export interface CustomFloorConfig {
  id: number;
  name: string;
  departments: CustomDepartmentConfig[];
}

export interface DepartmentCapacityConfig {
  departmentId: string;
  capacity: number;
  processingTimeMinutes: number;
}

export interface PatientTypeDistribution {
  emergency: number;      // 0-100%
  common: number;         // 0-100%
  hospitalized: number;   // 0-100%
  scheduled_checkup: number; // 0-100%
}

export interface SeverityDistribution {
  critical: number;  // 0-100%
  high: number;      // 0-100%
  medium: number;    // 0-100%
  low: number;       // 0-100%
}

export interface ConditionConfig {
  conditionName: string;
  patientCount: number;
  customMortalityRate?: number;
  customMortalityIncreasePerHour?: number;
  customTimeToTreatment?: number;
}

export interface DepartmentRouteFilter {
  departmentId: string;
  mustInclude: boolean;  // If true, only generate patients with routes through this department
}

export interface SimulationConfig {
  // Basic settings
  totalPatients: number;
  simulationDay: string;
  startTime: string;  // "HH:MM"
  endTime: string;    // "HH:MM"

  // Department capacities
  departmentCapacities: DepartmentCapacityConfig[];

  // NEW: Custom building structure (can be per-hospital or global)
  customBuilding?: {
    enabled: boolean;
    floors: CustomFloorConfig[];
    floorCount: number;
  };

  // NEW: City configuration (multiple hospitals)
  cityConfig?: CityConfig;

  // Patient distribution
  patientTypeDistribution?: PatientTypeDistribution;
  severityDistribution?: SeverityDistribution;

  // Custom conditions
  specificConditions?: ConditionConfig[];

  // Department routing
  departmentFilters?: DepartmentRouteFilter[];

  // Random deviations
  randomDeviation?: {
    enabled: boolean;
    severityShift?: number;  // -30 to +30 (percentage shift toward more/less severe)
    mortalityMultiplier?: number;  // 0.5 to 2.0 (multiply all mortality rates)
    timeMultiplier?: number;  // 0.5 to 2.0 (multiply all critical time windows)
    patientCountVariance?: number;  // 0-50 (random ± variance in patient count)
  };

  // Advanced settings
  advancedSettings?: {
    peakHourMultiplier?: number;  // 1.0-3.0 (more patients during peak hours)
    ageDistributionShift?: 'younger' | 'older' | 'balanced';
    emergencyFrequency?: 'low' | 'normal' | 'high' | 'crisis';
    useAllDepartments?: boolean;  // Force usage of all departments
    minimumQueueLength?: number;  // Ensure departments have minimum queue
  };
}

export interface SimulationPreset {
  name: string;
  description: string;
  icon: string;
  config: Partial<SimulationConfig>;
}

// Common presets
export const SIMULATION_PRESETS: SimulationPreset[] = [
  {
    name: 'Normal Day',
    description: 'Typical hospital day with balanced patient mix',
    icon: '🏥',
    config: {
      totalPatients: 300,
      patientTypeDistribution: {
        emergency: 15,
        common: 50,
        hospitalized: 20,
        scheduled_checkup: 15
      },
      severityDistribution: {
        critical: 10,
        high: 20,
        medium: 40,
        low: 30
      },
      randomDeviation: {
        enabled: true,
        severityShift: 0,
        mortalityMultiplier: 1.0,
        patientCountVariance: 10
      }
    }
  },
  {
    name: 'Crisis Mode',
    description: 'High emergency volume with severe cases',
    icon: '🚨',
    config: {
      totalPatients: 500,
      patientTypeDistribution: {
        emergency: 40,
        common: 20,
        hospitalized: 30,
        scheduled_checkup: 10
      },
      severityDistribution: {
        critical: 40,  // 40% critical cases!
        high: 35,
        medium: 20,
        low: 5
      },
      randomDeviation: {
        enabled: true,
        severityShift: 30,  // +30% toward more severe
        mortalityMultiplier: 1.5,
        patientCountVariance: 20
      },
      advancedSettings: {
        emergencyFrequency: 'crisis',
        peakHourMultiplier: 2.0
      }
    }
  },
  {
    name: 'Outpatient Day',
    description: 'Mostly routine checkups and consultations',
    icon: '📋',
    config: {
      totalPatients: 400,
      patientTypeDistribution: {
        emergency: 5,
        common: 60,
        hospitalized: 10,
        scheduled_checkup: 25
      },
      severityDistribution: {
        critical: 2,
        high: 8,
        medium: 30,
        low: 60  // 60% low severity
      },
      randomDeviation: {
        enabled: true,
        severityShift: -20,  // -20% toward less severe
        mortalityMultiplier: 0.7
      }
    }
  },
  {
    name: 'Surgery Focus',
    description: 'High surgical load with ICU cases',
    icon: '🔪',
    config: {
      totalPatients: 350,
      patientTypeDistribution: {
        emergency: 20,
        common: 15,
        hospitalized: 50,
        scheduled_checkup: 15
      },
      departmentFilters: [
        { departmentId: 'surgery-1', mustInclude: false },
        { departmentId: 'surgery-2', mustInclude: false },
        { departmentId: 'icu', mustInclude: false }
      ],
      advancedSettings: {
        useAllDepartments: true
      }
    }
  },
  {
    name: 'Stress Test',
    description: 'Maximum load to test system limits',
    icon: '⚡',
    config: {
      totalPatients: 800,
      patientTypeDistribution: {
        emergency: 25,
        common: 35,
        hospitalized: 25,
        scheduled_checkup: 15
      },
      randomDeviation: {
        enabled: true,
        severityShift: 15,
        patientCountVariance: 50
      },
      advancedSettings: {
        emergencyFrequency: 'high',
        peakHourMultiplier: 2.5,
        useAllDepartments: true,
        minimumQueueLength: 3
      }
    }
  },
  {
    name: 'Custom',
    description: 'Configure all parameters manually',
    icon: '⚙️',
    config: {
      totalPatients: 500
    }
  }
];
