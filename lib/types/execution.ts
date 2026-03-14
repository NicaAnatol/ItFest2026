// Execution types

export interface Execution {
  status: string;
  started_at: string;
  completed_at: string;
  duration: { total: string; total_seconds: number };
  events?: ExecutionEvent[];
  delays?: ExecutionDelay[];
  blockers?: ExecutionBlocker[];
  resources_consumed: ResourcesConsumed;
  total_cost: CostBreakdown;
}

export interface ExecutionEvent {
  timestamp: string;
  event: string;
  details?: string;
  result?: string;
  by?: string;
  bed?: string;
  dose?: string;
  eta?: string;
  line?: string;
  [key: string]: unknown;
}

export interface ExecutionDelay {
  delay_type: string;
  resource?: string;
  duration: string;
  reason: string;
  impact: string;
  historical_comparison?: {
    typical_delay: string;
    this_delay: string;
    assessment: string;
  };
}

export interface ExecutionBlocker {
  blocker_type: string;
  description: string;
  resolution: string;
  duration: string;
}

export interface ResourcesConsumed {
  personnel: Array<{
    person_id: string;
    time_spent: string;
    activities?: string[];
    cost: number;
  }>;
  medications: Array<{
    medication: string;
    amount?: string;
    dose?: string;
    total?: string;
    cost: number;
  }>;
  equipment: Array<{
    equipment: string;
    duration?: string;
    cost: number;
  }>;
  consumables: Array<{
    item: string;
    quantity: number;
    cost: number;
  }>;
}

export interface CostBreakdown {
  personnel: number;
  medications: number;
  equipment: number;
  consumables: number;
  investigations?: number;
  procedures?: number;
  total: number;
}

