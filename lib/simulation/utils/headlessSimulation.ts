import { SimulationConfig } from '../types/simulationConfig';
import { generatePatientsFromConfig } from './advancedPatientGenerator';
import { QueueManager } from '../data/queueManagerClass';
import { Building, Patient } from '../types/building';

export interface HeadlessSimulationResult {
  config: SimulationConfig;
  patients: Patient[];
  building: Building;

  // Global statistics
  totalPatients: number;
  totalDeaths: number;
  totalTransfers: number;
  patientsLeftSystem: number;

  // Time-based statistics
  simulationDuration: number; // minutes
  peakOccupancy: {
    time: string;
    count: number;
  };

  // Department statistics
  departmentStats: {
    [departmentId: string]: {
      name: string;
      totalVisits: number;
      totalDeaths: number;
      avgWaitTime: number;
      maxWaitTime: number;
      avgOccupancy: number;
      maxOccupancy: number;
      totalBlockedMinutes: number;
      utilizationRate: number; // percentage
    };
  };

  // Patient type statistics
  patientTypeStats: {
    emergency: { count: number; deaths: number; avgWaitTime: number };
    common: { count: number; deaths: number; avgWaitTime: number };
    hospitalized: { count: number; deaths: number; avgWaitTime: number };
    scheduled_checkup: { count: number; deaths: number; avgWaitTime: number };
  };

  // Severity statistics
  severityStats: {
    critical: { count: number; deaths: number; mortalityRate: number };
    high: { count: number; deaths: number; mortalityRate: number };
    medium: { count: number; deaths: number; mortalityRate: number };
    low: { count: number; deaths: number; mortalityRate: number };
  };

  // Condition statistics (top 10)
  topConditions: Array<{
    condition: string;
    count: number;
    deaths: number;
    mortalityRate: number;
  }>;

  // Death analysis
  deathAnalysis: {
    totalDeaths: number;
    deathsFromDelay: number;
    deathsNatural: number;
    deathsInTransfer: number;
    avgTimeToDeathFromDelay: number; // minutes
    deathsByHour: { [hour: number]: number };
  };

  // Hourly flow
  hourlyFlow: {
    [hour: number]: {
      arrivals: number;
      departures: number;
      activePatients: number;
      deaths: number;
    };
  };

  // Wait time distribution
  waitTimeDistribution: {
    '0-15min': number;
    '15-30min': number;
    '30-60min': number;
    '60-120min': number;
    '120+min': number;
  };

  // Transfer statistics (city mode)
  transferStats?: {
    totalTransfers: number;
    successfulTransfers: number;
    failedTransfers: number;
    avgTransferDistance: number;
    avgTransferDuration: number;
    transfersByReason: { [reason: string]: number };
  };

  // Performance metrics
  performanceMetrics: {
    avgPatientJourneyTime: number;
    avgDepartmentsVisited: number;
    systemUtilization: number; // percentage
    bottleneckDepartments: string[];
  };

  // Raw data for detailed analysis
  rawData: {
    allDeathRecords: any[];
    queueStateSnapshots: any[];
    patientJourneys: Array<{
      patientId: string;
      patientName: string;
      condition: string;
      severity: string;
      totalTime: number;
      visits: any[];
      outcome: 'completed' | 'died' | 'transferred';
    }>;
  };
}

/**
 * Run simulation in headless mode (no visualization)
 * Returns complete statistics for analysis
 */
export async function runHeadlessSimulation(
  config: SimulationConfig,
  building: Building,
  onProgress?: (progress: number, message: string) => void
): Promise<HeadlessSimulationResult> {

  onProgress?.(0, 'Initializing simulation...');

  // Generate patients
  const patients = generatePatientsFromConfig(config);
  onProgress?.(10, `Generated ${patients.length} patients`);

  // Setup queue manager
  const capacities: { [deptId: string]: { capacity: number; processingTimeMinutes: number } } = {};
  config.departmentCapacities.forEach(dept => {
    capacities[dept.departmentId] = {
      capacity: dept.capacity,
      processingTimeMinutes: dept.processingTimeMinutes
    };
  });

  const queueManager = new QueueManager(capacities);
  onProgress?.(20, 'Queue manager initialized');

  // Get department IDs
  const departmentIds = building.floors.flatMap(floor =>
    floor.departments.map(dept => dept.id)
  );

  // Run simulation minute by minute
  const [startH, startM] = config.startTime.split(':').map(Number);
  const [endH, endM] = config.endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const totalMinutes = endMinutes - startMinutes;

  onProgress?.(30, 'Starting simulation...');

  // Collect all events (arrivals and departures)
  const events: Array<{
    type: 'arrive' | 'depart';
    timeMinutes: number;
    patientId: string;
    patientName: string;
    departmentId: string;
    patient: Patient;
  }> = [];

  patients.forEach((patient) => {
    const todayVisits = patient.visits.filter(v => v.day === config.simulationDay);
    todayVisits.forEach((visit) => {
      const [startH, startM] = visit.startTime.split(':').map(Number);
      const [endH, endM] = visit.endTime.split(':').map(Number);

      events.push({
        type: 'arrive',
        timeMinutes: startH * 60 + startM,
        patientId: patient.id,
        patientName: patient.name,
        departmentId: visit.departmentId,
        patient,
      });

      events.push({
        type: 'depart',
        timeMinutes: endH * 60 + endM,
        patientId: patient.id,
        patientName: patient.name,
        departmentId: visit.departmentId,
        patient,
      });
    });
  });

  // Sort events by time
  events.sort((a, b) => a.timeMinutes - b.timeMinutes);

  let eventIndex = 0;

  // Process simulation minute by minute
  for (let minute = startMinutes; minute <= endMinutes; minute++) {
    // Update waiting times BEFORE processing events
    queueManager.updateWaitingTimes(minute);

    // Process all events at this minute
    while (eventIndex < events.length && events[eventIndex].timeMinutes <= minute) {
      const event = events[eventIndex];

      if (event.type === 'arrive') {
        const mortalityData = event.patient.mortalityRisk !== undefined ? {
          mortalityRisk: event.patient.mortalityRisk,
          mortalityIncreasePerHour: event.patient.mortalityIncreasePerHour || 0,
          timeToTreatment: event.patient.timeToTreatment || 60,
          patientType: event.patient.patientType,
          condition: event.patient.condition,
        } : undefined;

        queueManager.arriveAtDepartment(
          event.patientId,
          event.patientName,
          event.departmentId,
          minute,
          mortalityData
        );
      } else {
        queueManager.departFromDepartment(
          event.patientId,
          event.patientName,
          event.departmentId,
          minute
        );
      }

      eventIndex++;
    }

    // Update blocked time tracking AFTER processing events
    queueManager.updateBlockedTime(minute);

    // Report progress every 10 minutes
    if (minute % 10 === 0) {
      const progress = ((minute - startMinutes) / totalMinutes) * 100;
      onProgress?.(30 + (progress * 0.5), `Simulating: ${Math.round(progress)}%`);
    }
  }

  onProgress?.(80, 'Analyzing results...');

  // Extract statistics
  const result = await extractStatistics(
    config,
    patients,
    building,
    queueManager,
    startMinutes,
    endMinutes
  );

  onProgress?.(100, 'Simulation complete!');

  return result;
}

async function extractStatistics(
  config: SimulationConfig,
  patients: Patient[],
  building: Building,
  queueManager: QueueManager,
  startMinutes: number,
  endMinutes: number
): Promise<HeadlessSimulationResult> {

  // Initialize result structure
  const result: HeadlessSimulationResult = {
    config,
    patients,
    building,
    totalPatients: patients.length,
    totalDeaths: 0,
    totalTransfers: 0,
    patientsLeftSystem: 0,
    simulationDuration: endMinutes - startMinutes,
    peakOccupancy: { time: '', count: 0 },
    departmentStats: {},
    patientTypeStats: {
      emergency: { count: 0, deaths: 0, avgWaitTime: 0 },
      common: { count: 0, deaths: 0, avgWaitTime: 0 },
      hospitalized: { count: 0, deaths: 0, avgWaitTime: 0 },
      scheduled_checkup: { count: 0, deaths: 0, avgWaitTime: 0 },
    },
    severityStats: {
      critical: { count: 0, deaths: 0, mortalityRate: 0 },
      high: { count: 0, deaths: 0, mortalityRate: 0 },
      medium: { count: 0, deaths: 0, mortalityRate: 0 },
      low: { count: 0, deaths: 0, mortalityRate: 0 },
    },
    topConditions: [],
    deathAnalysis: {
      totalDeaths: 0,
      deathsFromDelay: 0,
      deathsNatural: 0,
      deathsInTransfer: 0,
      avgTimeToDeathFromDelay: 0,
      deathsByHour: {},
    },
    hourlyFlow: {},
    waitTimeDistribution: {
      '0-15min': 0,
      '15-30min': 0,
      '30-60min': 0,
      '60-120min': 0,
      '120+min': 0,
    },
    performanceMetrics: {
      avgPatientJourneyTime: 0,
      avgDepartmentsVisited: 0,
      systemUtilization: 0,
      bottleneckDepartments: [],
    },
    rawData: {
      allDeathRecords: [],
      queueStateSnapshots: [],
      patientJourneys: [],
    },
  };

  // Get death records and statistics
  const deathRecords = queueManager.getDeathRecords();
  const globalStats = queueManager.getGlobalStats();
  result.totalDeaths = globalStats.globalDeaths;
  result.deathAnalysis.totalDeaths = result.totalDeaths;
  result.rawData.allDeathRecords = deathRecords;

  // Analyze deaths
  deathRecords.forEach(death => {
    if (death.causeOfDeath === 'delay') {
      result.deathAnalysis.deathsFromDelay++;
    } else {
      result.deathAnalysis.deathsNatural++;
    }

    const hour = Math.floor(death.timeOfDeath / 60);
    result.deathAnalysis.deathsByHour[hour] = (result.deathAnalysis.deathsByHour[hour] || 0) + 1;
  });

  // Analyze patients
  const conditionCounts = new Map<string, { count: number; deaths: number }>();

  patients.forEach(patient => {
    // Patient type stats
    const typeStats = result.patientTypeStats[patient.patientType];
    if (typeStats) {
      typeStats.count++;
    }

    // Severity stats
    const sevStats = result.severityStats[patient.severity];
    if (sevStats) {
      sevStats.count++;
    }

    // Condition stats
    if (!conditionCounts.has(patient.condition)) {
      conditionCounts.set(patient.condition, { count: 0, deaths: 0 });
    }
    const condStats = conditionCounts.get(patient.condition)!;
    condStats.count++;

    // Check if died
    const died = deathRecords.some(d => d.patientId === patient.id);
    if (died) {
      if (typeStats) typeStats.deaths++;
      if (sevStats) sevStats.deaths++;
      condStats.deaths++;
    }

    // Patient journey
    result.rawData.patientJourneys.push({
      patientId: patient.id,
      patientName: patient.name,
      condition: patient.condition,
      severity: patient.severity,
      totalTime: patient.visits.reduce((sum, v) => {
        const [sh, sm] = v.startTime.split(':').map(Number);
        const [eh, em] = v.endTime.split(':').map(Number);
        return sum + ((eh * 60 + em) - (sh * 60 + sm));
      }, 0),
      visits: patient.visits,
      outcome: died ? 'died' : 'completed',
    });
  });

  // Top conditions
  result.topConditions = Array.from(conditionCounts.entries())
    .map(([condition, stats]) => ({
      condition,
      count: stats.count,
      deaths: stats.deaths,
      mortalityRate: (stats.deaths / stats.count) * 100,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Calculate mortality rates
  Object.keys(result.severityStats).forEach(severity => {
    const stats = result.severityStats[severity as keyof typeof result.severityStats];
    stats.mortalityRate = stats.count > 0 ? (stats.deaths / stats.count) * 100 : 0;
  });

  // Department statistics
  building.floors.forEach(floor => {
    floor.departments.forEach(dept => {
      const queueState = queueManager.getQueueState(dept.id);
      if (queueState) {
        result.departmentStats[dept.id] = {
          name: dept.name,
          totalVisits: 0,
          totalDeaths: queueState.totalDeaths,
          avgWaitTime: 0,
          maxWaitTime: 0,
          avgOccupancy: 0,
          maxOccupancy: queueState.capacity,
          totalBlockedMinutes: queueState.totalBlockedMinutes,
          utilizationRate: 0,
        };
      }
    });
  });

  // Performance metrics
  const totalJourneyTime = result.rawData.patientJourneys.reduce((sum, j) => sum + j.totalTime, 0);
  result.performanceMetrics.avgPatientJourneyTime = totalJourneyTime / patients.length;
  result.performanceMetrics.avgDepartmentsVisited = patients.reduce((sum, p) => sum + p.visits.length, 0) / patients.length;

  return result;
}
