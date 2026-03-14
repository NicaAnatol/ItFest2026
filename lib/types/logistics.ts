// Logistics types

export interface Logistics {
  location: Location;
  personnel_assigned: PersonnelAssigned;
  equipment_in_use: EquipmentInUse[];
  consumables_used?: ConsumableUsed[];
  department_state?: DepartmentState;
}

export interface Location {
  department: Department;
  room?: Room;
  bed?: Bed;
  vehicle?: { id: string; type: string };
}

export interface Department {
  id: string;
  name: string;
  type: string;
  floor?: number;
  beds?: number;
}

export interface Room {
  id: string;
  name?: string;
  type: string;
}

export interface Bed {
  id: string;
  type: string;
  occupied: boolean;
  occupied_since?: string;
}

export interface PersonnelAssigned {
  attending_physician: PersonnelMember;
  primary_nurse: PersonnelMember;
  paramedics?: PersonnelMember[];
  [key: string]: PersonnelMember | PersonnelMember[] | undefined;
}

export interface PersonnelMember {
  id: string;
  name: string;
  specialty?: string;
  experience_years: number;
  shift_start?: string;
  hours_on_shift?: number;
  current_patient_load?: number;
  assigned_since?: string;
  role?: string;
}

export interface EquipmentInUse {
  equipment_id: string;
  type: string;
  in_use_since?: string;
  duration_hours?: number;
}

export interface ConsumableUsed {
  item: string;
  quantity: number;
  cost: number;
  used_at?: string;
}

export interface DepartmentState {
  timestamp?: string | null;
  capacity: {
    total_beds: number;
    occupied_beds: number;
    available_beds: number;
    utilization: number;
  };
  personnel_on_duty: {
    attending_physicians: StaffCount;
    residents?: StaffCount;
    nurses: StaffCount;
  };
  equipment_availability?: Record<string, {
    total: number;
    in_use: number;
    available: number;
  }>;
  queue?: {
    waiting_triage?: number;
    waiting_physician?: number;
    waiting_bed?: number;
    waiting_admission?: number;
  };
  avg_wait_time?: Record<string, string>;
  status: string;
  projected_bed_available_time?: string;
}

export interface StaffCount {
  total: number;
  available: number;
  busy: number;
}

