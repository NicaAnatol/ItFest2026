// Queue Management System for Hospital Departments

export interface DeathRecord {
  patientId: string;
  patientName: string;
  departmentId: string;
  timeOfDeath: number;  // minutes since 00:00
  causeOfDeath: 'delay' | 'natural';
  mortalityRisk: number;
  adjustedMortalityRisk?: number;
  waitingTime?: number;
  patientType?: 'emergency' | 'common' | 'hospitalized' | 'scheduled_checkup';
  condition?: string;
}

export interface PatientQueueInfo {
  patientId: string;
  patientName: string;
  arrivalTime: number; // minutes since 00:00
  waitingMinutes: number;
  // Mortality tracking
  mortalityRisk?: number;  // Base mortality %
  mortalityIncreasePerHour?: number;  // Increase per hour
  timeToTreatment?: number;  // Critical time in minutes
  adjustedMortalityRisk?: number;  // Current mortality based on wait
  isDead?: boolean;  // Did they die while waiting?
  // NEW: Patient context
  patientType?: 'emergency' | 'common' | 'hospitalized' | 'scheduled_checkup';
  condition?: string;
}

export interface QueueState {
  currentOccupancy: number;
  capacity: number;
  processingTimeMinutes: number;
  queue: PatientQueueInfo[]; // Patients in queue with details
  isBlocked: boolean;
  occupiedPatients: string[]; // Patient IDs currently being treated
  totalBlockedMinutes: number; // Total time spent blocked
  lastBlockedTime: number | null; // When it became blocked (null if not blocked)
  // Death statistics
  totalDeaths: number;  // Total deaths in this department
  deathsFromDelay: number;  // Deaths caused by waiting too long
  deathsNatural: number;  // NEW: Deaths from condition itself (treatment failed)
  deathsDuringTreatment: number;  // NEW: Deaths while being treated
}

export class QueueManager {
  private queues: Map<string, QueueState> = new Map();
  private globalDeaths: number = 0;
  private deathsByType: Map<string, number> = new Map();
  private deathRecords: DeathRecord[] = [];  // NEW: Complete death log
  private occupiedPatientsData: Map<string, {
    patientId: string;
    patientName: string;
    departmentId: string;
    startTreatmentTime: number;
    mortalityRisk?: number;
    patientType?: 'emergency' | 'common' | 'hospitalized' | 'scheduled_checkup';
    condition?: string;
  }> = new Map();

  constructor(capacities: { [deptId: string]: { capacity: number; processingTimeMinutes: number } }) {
    // Initialize all departments
    Object.entries(capacities).forEach(([deptId, config]) => {
      this.queues.set(deptId, {
        currentOccupancy: 0,
        capacity: config.capacity,
        processingTimeMinutes: config.processingTimeMinutes,
        queue: [],
        isBlocked: false,
        occupiedPatients: [],
        totalBlockedMinutes: 0,
        lastBlockedTime: null,
        totalDeaths: 0,
        deathsFromDelay: 0,
        deathsNatural: 0,  // NEW
        deathsDuringTreatment: 0,  // NEW
      });
    });
  }

  // Update blocked time tracking (call this AFTER processing events)
  updateBlockedTime(currentTimeMinutes: number): void {
    this.queues.forEach((state) => {
      if (state.isBlocked) {
        // If we just became blocked, lastBlockedTime will be set to currentTimeMinutes
        // If we were already blocked, calculate elapsed time since last update
        if (state.lastBlockedTime !== null && state.lastBlockedTime < currentTimeMinutes) {
          const elapsedMinutes = currentTimeMinutes - state.lastBlockedTime;
          state.totalBlockedMinutes += elapsedMinutes;
        }
        // Update lastBlockedTime to current minute (tracking continues)
        state.lastBlockedTime = currentTimeMinutes;
      } else {
        // Not blocked - reset lastBlockedTime
        state.lastBlockedTime = null;
      }
    });
  }

  // Update waiting times for patients in queue and check for deaths
  updateWaitingTimes(currentTimeMinutes: number): void {
    this.queues.forEach((state, deptId) => {
      // 1. Check patients in QUEUE (waiting for treatment)
      state.queue.forEach((patientInfo) => {
        patientInfo.waitingMinutes = currentTimeMinutes - patientInfo.arrivalTime;

        // Calculate adjusted mortality if we have the data
        if (patientInfo.mortalityRisk !== undefined &&
            patientInfo.mortalityIncreasePerHour !== undefined &&
            patientInfo.timeToTreatment !== undefined) {

          // Calculate delay beyond critical time
          const delay = patientInfo.waitingMinutes - patientInfo.timeToTreatment;

          if (delay > 0) {
            const delayHours = delay / 60;
            const additionalMortality = patientInfo.mortalityIncreasePerHour * delayHours;
            patientInfo.adjustedMortalityRisk = Math.min(100, patientInfo.mortalityRisk + additionalMortality);

            // Check if patient dies FROM DELAY (random check based on mortality rate)
            // Adjusted formula: higher mortality = exponentially higher death chance
            const mortalityPerMinute = patientInfo.adjustedMortalityRisk / 100 / 60; // Per hour basis

            // Scaling factor: the higher the mortality, the more aggressive the check
            // At 20% mortality: factor = 1.0
            // At 50% mortality: factor = 2.5
            // At 80% mortality: factor = 4.0
            const severityFactor = Math.max(1, patientInfo.adjustedMortalityRisk / 20);

            // EXTRA MULTIPLIER for capacity=1 scenarios (extreme bottleneck)
            // If patient has been waiting more than 2x the critical time, death becomes very likely
            const extremeDelayMultiplier = delay > (patientInfo.timeToTreatment * 2) ? 2.0 : 1.0;

            const finalDeathChance = mortalityPerMinute * severityFactor * extremeDelayMultiplier;

            if (!patientInfo.isDead && Math.random() < finalDeathChance) {
              patientInfo.isDead = true;
              state.totalDeaths++;
              state.deathsFromDelay++;
              this.globalDeaths++;

              // Record death details
              this.deathRecords.push({
                patientId: patientInfo.patientId,
                patientName: patientInfo.patientName,
                departmentId: deptId,
                timeOfDeath: currentTimeMinutes,
                causeOfDeath: 'delay',
                mortalityRisk: patientInfo.mortalityRisk,
                adjustedMortalityRisk: patientInfo.adjustedMortalityRisk,
                waitingTime: patientInfo.waitingMinutes,
                patientType: patientInfo.patientType,
                condition: patientInfo.condition,
              });

              // Track by patient type
              if (patientInfo.patientType) {
                const currentCount = this.deathsByType.get(patientInfo.patientType) || 0;
                this.deathsByType.set(patientInfo.patientType, currentCount + 1);
              }

              console.log(`💀 ${patientInfo.patientName} DECEDAT din cauza întârzierii în ${deptId} (${patientInfo.waitingMinutes}m așteptare, ${patientInfo.adjustedMortalityRisk.toFixed(1)}% risc)`);
            }
          } else {
            patientInfo.adjustedMortalityRisk = patientInfo.mortalityRisk;
          }
        }
      });

      // 2. Check patients BEING TREATED (natural death during treatment)
      state.occupiedPatients.forEach(patientId => {
        const patientData = this.occupiedPatientsData.get(patientId);
        if (patientData && patientData.mortalityRisk !== undefined) {
          // Even with treatment, patient can die from their base condition
          // Check every minute based on base mortality risk
          const baseMortalityPerMinute = patientData.mortalityRisk / 100 / 60; // Per hour basis

          // Scaling factor for natural deaths
          const severityFactor = Math.max(1, patientData.mortalityRisk / 20);

          // BALANCED RATE: Natural deaths during treatment should reflect real medical risk
          // Multiply by 0.15 (15% of delay death rate) - realistic for treatment complications
          // Higher = patients die more during treatment, Lower = patients survive treatment but die in queues
          const finalDeathChance = baseMortalityPerMinute * severityFactor * 0.15;

          if (Math.random() < finalDeathChance) {
            state.totalDeaths++;
            state.deathsNatural++;
            state.deathsDuringTreatment++;
            this.globalDeaths++;

            // Record death details
            this.deathRecords.push({
              patientId: patientData.patientId,
              patientName: patientData.patientName,
              departmentId: deptId,
              timeOfDeath: currentTimeMinutes,
              causeOfDeath: 'natural',
              mortalityRisk: patientData.mortalityRisk,
              patientType: patientData.patientType,
              condition: patientData.condition,
            });

            // Track by patient type
            if (patientData.patientType) {
              const currentCount = this.deathsByType.get(patientData.patientType) || 0;
              this.deathsByType.set(patientData.patientType, currentCount + 1);
            }

            console.log(`💀 ${patientData.patientName} DECEDAT în timpul tratamentului în ${deptId} (condiție gravă, ${patientData.mortalityRisk.toFixed(1)}% risc de bază)`);

            // Remove from occupied
            const index = state.occupiedPatients.indexOf(patientId);
            if (index !== -1) {
              state.occupiedPatients.splice(index, 1);
              state.currentOccupancy--;
            }
            this.occupiedPatientsData.delete(patientId);

            // Process next in queue if available
            if (state.queue.length > 0 && state.currentOccupancy < state.capacity) {
              const nextPatient = state.queue.shift()!;
              if (!nextPatient.isDead) {
                state.occupiedPatients.push(nextPatient.patientId);
                state.currentOccupancy++;

                // Track the new patient being treated
                this.occupiedPatientsData.set(nextPatient.patientId, {
                  patientId: nextPatient.patientId,
                  patientName: nextPatient.patientName,
                  departmentId: deptId,
                  startTreatmentTime: currentTimeMinutes,
                  mortalityRisk: nextPatient.mortalityRisk,
                  patientType: nextPatient.patientType,
                  condition: nextPatient.condition,
                });
              }
            }

            // Update blocked status
            state.isBlocked = state.currentOccupancy >= state.capacity;
          }
        }
      });
    });
  }

  // Arrive at department (with mortality data)
  arriveAtDepartment(
    patientId: string,
    patientName: string,
    departmentId: string,
    currentTimeMinutes: number,
    mortalityData?: {
      mortalityRisk: number;
      mortalityIncreasePerHour: number;
      timeToTreatment: number;
      patientType?: 'emergency' | 'common' | 'hospitalized' | 'scheduled_checkup';
      condition?: string;
    }
  ): void {
    const state = this.queues.get(departmentId);
    if (!state) return;

    // If there's space, occupy immediately
    if (state.currentOccupancy < state.capacity) {
      state.currentOccupancy++;
      state.occupiedPatients.push(patientId);

      // Track patient being treated
      this.occupiedPatientsData.set(patientId, {
        patientId,
        patientName,
        departmentId,
        startTreatmentTime: currentTimeMinutes,
        mortalityRisk: mortalityData?.mortalityRisk,
        patientType: mortalityData?.patientType,
        condition: mortalityData?.condition,
      });

      // Update blocked status
      state.isBlocked = state.currentOccupancy >= state.capacity;
    } else {
      // Otherwise, add to queue with mortality data
      const existingIndex = state.queue.findIndex(p => p.patientId === patientId);
      if (existingIndex === -1) {
        state.queue.push({
          patientId,
          patientName,
          arrivalTime: currentTimeMinutes,
          waitingMinutes: 0,
          mortalityRisk: mortalityData?.mortalityRisk,
          mortalityIncreasePerHour: mortalityData?.mortalityIncreasePerHour,
          timeToTreatment: mortalityData?.timeToTreatment,
          adjustedMortalityRisk: mortalityData?.mortalityRisk,
          isDead: false,
          patientType: mortalityData?.patientType,
          condition: mortalityData?.condition,
        });
      }
      state.isBlocked = true;
    }
  }

  // Depart from department
  departFromDepartment(patientId: string, patientName: string, departmentId: string, currentTimeMinutes: number): void {
    const state = this.queues.get(departmentId);
    if (!state) return;

    // Remove from occupied if present
    const occupiedIndex = state.occupiedPatients.indexOf(patientId);
    if (occupiedIndex !== -1) {
      state.occupiedPatients.splice(occupiedIndex, 1);
      state.currentOccupancy--;

      // Remove from tracking
      this.occupiedPatientsData.delete(patientId);

      // Process next in queue if available
      if (state.queue.length > 0 && state.currentOccupancy < state.capacity) {
        const nextPatient = state.queue.shift()!;

        // Only admit if not dead
        if (!nextPatient.isDead) {
          state.occupiedPatients.push(nextPatient.patientId);
          state.currentOccupancy++;

          // Track the new patient being treated
          this.occupiedPatientsData.set(nextPatient.patientId, {
            patientId: nextPatient.patientId,
            patientName: nextPatient.patientName,
            departmentId,
            startTreatmentTime: currentTimeMinutes,
            mortalityRisk: nextPatient.mortalityRisk,
            patientType: nextPatient.patientType,
            condition: nextPatient.condition,
          });
        }
      }

      // Update blocked status
      state.isBlocked = state.currentOccupancy >= state.capacity;
    }

    // Also remove from queue if somehow there
    const queueIndex = state.queue.findIndex(p => p.patientId === patientId);
    if (queueIndex !== -1) {
      state.queue.splice(queueIndex, 1);
    }
  }

  // Get queue state for a department
  getQueueState(departmentId: string): QueueState | null {
    return this.queues.get(departmentId) || null;
  }

  // Get global statistics
  getGlobalStats() {
    let totalOccupied = 0;
    let totalCapacity = 0;
    let totalQueued = 0;
    let totalBlocked = 0;
    let totalBlockedTime = 0;
    let totalDeaths = 0;
    let totalDeathsFromDelay = 0;
    let totalDeathsNatural = 0;
    let totalDeathsDuringTreatment = 0;

    this.queues.forEach((state) => {
      totalOccupied += state.currentOccupancy;
      totalCapacity += state.capacity;
      totalQueued += state.queue.length;
      if (state.isBlocked) totalBlocked++;
      totalBlockedTime += state.totalBlockedMinutes;
      totalDeaths += state.totalDeaths;
      totalDeathsFromDelay += state.deathsFromDelay;
      totalDeathsNatural += state.deathsNatural;
      totalDeathsDuringTreatment += state.deathsDuringTreatment;
    });

    return {
      totalOccupied,
      totalCapacity,
      totalQueued,
      totalBlocked,
      totalBlockedTime,
      overallUtilization: totalCapacity > 0 ? (totalOccupied / totalCapacity) * 100 : 0,
      totalDeaths,
      totalDeathsFromDelay,
      totalDeathsNatural,
      totalDeathsDuringTreatment,
      globalDeaths: this.globalDeaths,
    };
  }

  // NEW: Get all death records
  getDeathRecords(): DeathRecord[] {
    return [...this.deathRecords];
  }

  // NEW: Get deaths by patient type
  getDeathsByType(): Map<string, number> {
    return new Map(this.deathsByType);
  }

  // Export state for saving
  exportState(): any {
    const exported: any = {
      departments: {},
      deathRecords: [...this.deathRecords],  // NEW: Export death records
      deathsByType: Array.from(this.deathsByType.entries()),  // NEW: Export deaths by type
      globalDeaths: this.globalDeaths,  // NEW: Export global count
    };

    this.queues.forEach((state, deptId) => {
      exported.departments[deptId] = {
        currentOccupancy: state.currentOccupancy,
        queue: [...state.queue],
        isBlocked: state.isBlocked,
        occupiedPatients: [...state.occupiedPatients],
        totalBlockedMinutes: state.totalBlockedMinutes,
        lastBlockedTime: state.lastBlockedTime,
        totalDeaths: state.totalDeaths,
        deathsFromDelay: state.deathsFromDelay,
        deathsNatural: state.deathsNatural,
        deathsDuringTreatment: state.deathsDuringTreatment,
      };
    });
    return exported;
  }

  // Import state for loading
  importState(exported: any): void {
    // Import death records if available
    if (exported.deathRecords) {
      this.deathRecords = [...exported.deathRecords];
    }

    // Import deaths by type if available
    if (exported.deathsByType) {
      this.deathsByType = new Map(exported.deathsByType);
    }

    // Import global deaths count
    if (exported.globalDeaths !== undefined) {
      this.globalDeaths = exported.globalDeaths;
    }

    // Import department states
    const departments = exported.departments || exported;  // Support old format
    Object.entries(departments).forEach(([deptId, data]: [string, any]) => {
      if (deptId === 'deathRecords' || deptId === 'deathsByType' || deptId === 'globalDeaths') {
        return;  // Skip meta fields
      }

      const state = this.queues.get(deptId);
      if (state) {
        state.currentOccupancy = data.currentOccupancy;
        state.queue = [...data.queue];
        state.isBlocked = data.isBlocked;
        state.occupiedPatients = [...data.occupiedPatients];
        state.totalBlockedMinutes = data.totalBlockedMinutes ?? 0;
        state.lastBlockedTime = data.lastBlockedTime ?? null;
        state.totalDeaths = data.totalDeaths ?? 0;
        state.deathsFromDelay = data.deathsFromDelay ?? 0;
        state.deathsNatural = data.deathsNatural ?? 0;
        state.deathsDuringTreatment = data.deathsDuringTreatment ?? 0;
      }
    });

    // Recalculate global deaths if not imported
    if (exported.globalDeaths === undefined) {
      this.globalDeaths = 0;
      this.queues.forEach((state) => {
        this.globalDeaths += state.totalDeaths;
      });
    }
  }
}
