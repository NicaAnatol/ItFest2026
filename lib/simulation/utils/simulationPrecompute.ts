import { Patient } from '../types/building';
import { QueueManager, type ExportedQueueState } from '../data/queueManagerClass';

export interface PrecomputedMinuteState {
  timeMinutes: number;
  time: string;
  queueState: ExportedQueueState;
  departmentOccupancies: Map<string, {
    occupied: number;
    capacity: number;
    isBlocked: boolean;
    queueLength: number;
  }>;
  stats: {
    totalEntered: number;
    totalExited: number;
  };
}

export class SimulationPrecomputer {
  private states: Map<number, PrecomputedMinuteState> = new Map();
  private patients: Patient[];
  private day: string;
  private capacities: { [deptId: string]: { capacity: number; processingTimeMinutes: number } };
  private departments: string[];

  constructor(
    patients: Patient[],
    day: string,
    capacities: { [deptId: string]: { capacity: number; processingTimeMinutes: number } },
    departments: string[]
  ) {
    this.patients = patients;
    this.day = day;
    this.capacities = capacities;
    this.departments = departments;
  }

  async precomputeAllStates(
    startMinute: number,
    endMinute: number,
    onProgress?: (percent: number, current: number, total: number) => void
  ): Promise<void> {
    const queueManager = new QueueManager(this.capacities);
    const totalMinutes = endMinute - startMinute + 1;

    // Collect all events (arrivals and departures)
    const events: Array<{
      type: 'arrive' | 'depart';
      timeMinutes: number;
      patientId: string;
      patientName: string;
      departmentId: string;
      mortalityData?: {
        mortalityRisk: number;
        mortalityIncreasePerHour: number;
        timeToTreatment: number;
      };
    }> = [];

    this.patients.forEach((patient) => {
      const todayVisits = patient.visits.filter(v => v.day === this.day);
      todayVisits.forEach((visit) => {
        const [startH, startM] = visit.startTime.split(':').map(Number);
        const [endH, endM] = visit.endTime.split(':').map(Number);

        // Extract mortality data if available
        const mortalityData = patient.mortalityRisk !== undefined ? {
          mortalityRisk: patient.mortalityRisk,
          mortalityIncreasePerHour: patient.mortalityIncreasePerHour || 0,
          timeToTreatment: patient.timeToTreatment || 60,
          patientType: patient.patientType,
          condition: patient.condition,
        } : undefined;

        events.push({
          type: 'arrive',
          timeMinutes: startH * 60 + startM,
          patientId: patient.id,
          patientName: patient.name,
          departmentId: visit.departmentId,
          mortalityData,
        });

        events.push({
          type: 'depart',
          timeMinutes: endH * 60 + endM,
          patientId: patient.id,
          patientName: patient.name,
          departmentId: visit.departmentId,
        });
      });
    });

    // Sort events by time
    events.sort((a, b) => a.timeMinutes - b.timeMinutes);

    // Track entered/exited
    const enteredPatients = new Set<string>();
    const exitedPatients = new Set<string>();

    let eventIndex = 0;

    // Pre-compute state for EVERY minute
    for (let minute = startMinute; minute <= endMinute; minute++) {
      // Update waiting times BEFORE processing events (based on arrival time)
      queueManager.updateWaitingTimes(minute);

      // Process all events at this minute
      while (eventIndex < events.length && events[eventIndex].timeMinutes <= minute) {
        const event = events[eventIndex];

        if (event.type === 'arrive') {
          queueManager.arriveAtDepartment(
            event.patientId,
            event.patientName,
            event.departmentId,
            minute,
            event.mortalityData  // Pass mortality data
          );
          enteredPatients.add(event.patientId);
        } else {
          queueManager.departFromDepartment(event.patientId, event.patientName, event.departmentId, minute);

          // Check if this was patient's last visit
          const patient = this.patients.find(p => p.id === event.patientId);
          if (patient) {
            const todayVisits = patient.visits.filter(v => v.day === this.day);
            const lastVisit = todayVisits[todayVisits.length - 1];
            if (lastVisit.departmentId === event.departmentId) {
              exitedPatients.add(event.patientId);
            }
          }
        }

        eventIndex++;
      }

      // Update blocked time tracking AFTER processing events (so isBlocked state is current)
      queueManager.updateBlockedTime(minute);

      // Build department occupancies
      const occupancies = new Map<string, {
        occupied: number;
        capacity: number;
        isBlocked: boolean;
        queueLength: number;
      }>();

      this.departments.forEach((deptId) => {
        const queueState = queueManager.getQueueState(deptId);
        if (queueState) {
          occupancies.set(deptId, {
            occupied: queueState.currentOccupancy,
            capacity: queueState.capacity,
            isBlocked: queueState.isBlocked,
            queueLength: queueState.queue.length,
          });
        }
      });

      // Save state for this minute
      this.states.set(minute, {
        timeMinutes: minute,
        time: this.minutesToTime(minute),
        queueState: queueManager.exportState(),
        departmentOccupancies: occupancies,
        stats: {
          totalEntered: enteredPatients.size,
          totalExited: exitedPatients.size,
        },
      });

      // Report progress
      if (onProgress && minute % 10 === 0) {
        const progress = ((minute - startMinute + 1) / totalMinutes) * 100;
        onProgress(progress, minute - startMinute + 1, totalMinutes);
      }
    }

    // Final progress
    if (onProgress) {
      onProgress(100, totalMinutes, totalMinutes);
    }
  }

  getStateAtTime(time: string): PrecomputedMinuteState | null {
    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    return this.states.get(totalMinutes) || null;
  }

  clear(): void {
    this.states.clear();
  }

  getMemoryEstimate(): string {
    const stateCount = this.states.size;
    const bytesPerState = 500; // Rough estimate
    const totalBytes = stateCount * bytesPerState;
    const mb = (totalBytes / (1024 * 1024)).toFixed(2);
    return `${stateCount} states, ~${mb} MB`;
  }

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}
