import { Patient, Visit } from '../types/building';
import { SimulationConfig } from '../types/simulationConfig';
import {
  emergencyConditions,
  commonConditions,
  hospitalizedConditions,
  scheduledCheckupConditions,
  MedicalCondition
} from '../data/medicalStatistics';

/**
 * Advanced patient generator that uses SimulationConfig to create realistic patients
 */
export function generatePatientsFromConfig(config: SimulationConfig): Patient[] {
  const patients: Patient[] = [];
  let patientIndex = 0;

  // Calculate actual patient count with variance
  let actualPatientCount = config.totalPatients;
  if (config.randomDeviation?.enabled && config.randomDeviation.patientCountVariance) {
    const variance = config.randomDeviation.patientCountVariance / 100;
    const randomFactor = (Math.random() * 2 - 1) * variance; // -variance to +variance
    actualPatientCount = Math.floor(config.totalPatients * (1 + randomFactor));
  }

  // Parse time range
  const [startHour, startMinute] = config.startTime.split(':').map(Number);
  const [endHour, endMinute] = config.endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  // Get all conditions grouped by type
  const conditionsByType = {
    emergency: emergencyConditions,
    common: commonConditions,
    hospitalized: hospitalizedConditions,
    scheduled_checkup: scheduledCheckupConditions
  };

  // Generate specific conditions first
  if (config.specificConditions && config.specificConditions.length > 0) {
    config.specificConditions.forEach(conditionConfig => {
      const condition = [...emergencyConditions, ...commonConditions, ...hospitalizedConditions, ...scheduledCheckupConditions]
        .find(c => c.name === conditionConfig.conditionName);

      if (condition) {
        for (let i = 0; i < conditionConfig.patientCount; i++) {
          const patient = generatePatientFromCondition(
            patientIndex++,
            condition,
            config,
            startMinutes,
            endMinutes,
            conditionConfig
          );

          // Check department filters
          if (passesRouteFilter(patient, config)) {
            patients.push(patient);
          }
        }
      }
    });
  }

  // Calculate remaining patients
  const remainingCount = actualPatientCount - patients.length;
  const patientTypeDistribution = config.patientTypeDistribution || {
    emergency: 15,
    common: 50,
    hospitalized: 20,
    scheduled_checkup: 15
  };

  // Apply severity shift if enabled - THIS DIRECTLY AFFECTS PATIENT TYPE DISTRIBUTION
  const adjustedDistribution = { ...patientTypeDistribution };
  if (config.randomDeviation?.enabled && config.randomDeviation.severityShift) {
    const shift = config.randomDeviation.severityShift / 100;
    // Positive shift = more severe (emergency/hospitalized), negative = less severe (common/scheduled)
    if (shift > 0) {
      // Increase emergency and hospitalized, decrease common and scheduled
      const increaseEmergency = shift * 30; // Max +30% to emergency
      const increaseHospitalized = shift * 20; // Max +20% to hospitalized
      adjustedDistribution.emergency = Math.min(80, adjustedDistribution.emergency + increaseEmergency);
      adjustedDistribution.hospitalized = Math.min(80, adjustedDistribution.hospitalized + increaseHospitalized);
      adjustedDistribution.common = Math.max(5, adjustedDistribution.common - increaseEmergency * 0.7);
      adjustedDistribution.scheduled_checkup = Math.max(5, adjustedDistribution.scheduled_checkup - increaseHospitalized * 0.7);
    } else {
      // Decrease emergency and hospitalized, increase common and scheduled
      const decreaseEmergency = Math.abs(shift) * 10;
      const decreaseHospitalized = Math.abs(shift) * 10;
      adjustedDistribution.emergency = Math.max(5, adjustedDistribution.emergency - decreaseEmergency);
      adjustedDistribution.hospitalized = Math.max(5, adjustedDistribution.hospitalized - decreaseHospitalized);
      adjustedDistribution.common = Math.min(70, adjustedDistribution.common + decreaseEmergency);
      adjustedDistribution.scheduled_checkup = Math.min(40, adjustedDistribution.scheduled_checkup + decreaseHospitalized);
    }

    // Normalize to 100%
    const total = adjustedDistribution.emergency + adjustedDistribution.common +
                  adjustedDistribution.hospitalized + adjustedDistribution.scheduled_checkup;
    adjustedDistribution.emergency = (adjustedDistribution.emergency / total) * 100;
    adjustedDistribution.common = (adjustedDistribution.common / total) * 100;
    adjustedDistribution.hospitalized = (adjustedDistribution.hospitalized / total) * 100;
    adjustedDistribution.scheduled_checkup = (adjustedDistribution.scheduled_checkup / total) * 100;

    console.log(`🔄 Severity shift applied: ${config.randomDeviation.severityShift}%`);
    console.log(`   Original distribution:`, patientTypeDistribution);
    console.log(`   Adjusted distribution:`, adjustedDistribution);
  }

  // Generate remaining patients by type
  const typeCounts = {
    emergency: Math.floor(remainingCount * (adjustedDistribution.emergency / 100)),
    common: Math.floor(remainingCount * (adjustedDistribution.common / 100)),
    hospitalized: Math.floor(remainingCount * (adjustedDistribution.hospitalized / 100)),
    scheduled_checkup: Math.floor(remainingCount * (adjustedDistribution.scheduled_checkup / 100))
  };

  // Fill up to remaining count
  const typesArray: Array<keyof typeof typeCounts> = ['emergency', 'common', 'hospitalized', 'scheduled_checkup'];
  let totalGenerated = Object.values(typeCounts).reduce((a, b) => a + b, 0);
  let typeIndex = 0;
  while (totalGenerated < remainingCount) {
    typeCounts[typesArray[typeIndex % typesArray.length]]++;
    totalGenerated++;
    typeIndex++;
  }

  // Generate patients for each type
  Object.entries(typeCounts).forEach(([type, count]) => {
    const conditions = conditionsByType[type as keyof typeof conditionsByType];

    for (let i = 0; i < count; i++) {
      // ALWAYS use severity distribution if specified (not optional!)
      let condition: MedicalCondition;

      if (config.severityDistribution) {
        // FORCE severity-based selection
        condition = selectConditionBySeverity(conditions, config.severityDistribution, config);
      } else {
        condition = selectWeightedCondition(conditions);
      }

      const patient = generatePatientFromCondition(
        patientIndex++,
        condition,
        config,
        startMinutes,
        endMinutes
      );

      // Check department filters and use all departments setting
      if (passesRouteFilter(patient, config)) {
        patients.push(patient);
      } else if (config.advancedSettings?.useAllDepartments) {
        // Retry with different condition
        i--;
      }
    }
  });

  console.log(`✅ Generated ${patients.length} patients from config`);
  console.log(`📊 Patient type distribution:`, {
    emergency: patients.filter(p => p.patientType === 'emergency').length,
    common: patients.filter(p => p.patientType === 'common').length,
    hospitalized: patients.filter(p => p.patientType === 'hospitalized').length,
    scheduled: patients.filter(p => p.patientType === 'scheduled_checkup').length
  });

  const avgMortality = patients.reduce((sum, p) => sum + p.mortalityRisk, 0) / patients.length;
  const maxMortality = Math.max(...patients.map(p => p.mortalityRisk));
  const minMortality = Math.min(...patients.map(p => p.mortalityRisk));

  console.log(`💀 Mortality statistics:`);
  console.log(`   Average: ${avgMortality.toFixed(2)}%`);
  console.log(`   Range: ${minMortality.toFixed(2)}% - ${maxMortality.toFixed(2)}%`);

  const criticalCount = patients.filter(p => p.severity === 'critical').length;
  const highCount = patients.filter(p => p.severity === 'high').length;
  const mediumCount = patients.filter(p => p.severity === 'medium').length;
  const lowCount = patients.filter(p => p.severity === 'low').length;

  console.log(`📈 Severity breakdown:`);
  console.log(`   Critical: ${criticalCount} (${(criticalCount/patients.length*100).toFixed(1)}%) - EXPECT HIGH DEATHS`);
  console.log(`   High: ${highCount} (${(highCount/patients.length*100).toFixed(1)}%)`);
  console.log(`   Medium: ${mediumCount} (${(mediumCount/patients.length*100).toFixed(1)}%)`);
  console.log(`   Low: ${lowCount} (${(lowCount/patients.length*100).toFixed(1)}%)`);

  if (config.severityDistribution) {
    console.log(`🎯 Target severity distribution:`, config.severityDistribution);
    console.log(`   ⚠️ Actual vs Target difference:`);
    console.log(`   Critical: ${(criticalCount/patients.length*100).toFixed(1)}% vs ${config.severityDistribution.critical}%`);
  }

  if (config.randomDeviation?.enabled) {
    console.log(`⚙️ Applied multipliers:`);
    console.log(`   Mortality: ×${config.randomDeviation.mortalityMultiplier || 1.0}`);
    console.log(`   Time: ×${config.randomDeviation.timeMultiplier || 1.0}`);
    console.log(`   Severity shift: ${config.randomDeviation.severityShift || 0}%`);
  }

  // ESTIMATE expected deaths
  const estimatedDeaths = Math.round(patients.reduce((sum, p) => sum + (p.mortalityRisk / 100), 0));
  console.log(`📊 ESTIMATED total deaths (base risk): ~${estimatedDeaths}`);
  console.log(`   ⚠️ This is WITHOUT delay factors!`);
  console.log(`   ⚠️ With capacity=1 and long queues, expect 2-3x more deaths!`);

  return patients;
}

function generatePatientFromCondition(
  index: number,
  condition: MedicalCondition,
  config: SimulationConfig,
  startMinutes: number,
  endMinutes: number,
  customConfig?: { customMortalityRate?: number; customMortalityIncreasePerHour?: number; customTimeToTreatment?: number }
): Patient {
  const patientType = getPatientTypeFromCondition(condition);
  const age = generateAge(patientType);
  const randomFactor = Math.random();

  // Apply custom overrides or use defaults
  let mortalityRate = customConfig?.customMortalityRate ?? condition.mortalityRate;
  let mortalityIncreasePerHour = customConfig?.customMortalityIncreasePerHour ?? condition.mortalityIncreasePerHour;
  let timeToTreatment = customConfig?.customTimeToTreatment ?? condition.timeToTreatment;

  // Apply mortality multiplier (affects BOTH base rate and increase rate)
  if (config.randomDeviation?.enabled && config.randomDeviation.mortalityMultiplier) {
    mortalityRate *= config.randomDeviation.mortalityMultiplier;
    mortalityRate = Math.min(100, mortalityRate);

    // IMPORTANT: Also multiply the increase per hour so delays are more/less dangerous
    mortalityIncreasePerHour *= config.randomDeviation.mortalityMultiplier;
  }

  // Apply time multiplier
  if (config.randomDeviation?.enabled && config.randomDeviation.timeMultiplier) {
    timeToTreatment *= config.randomDeviation.timeMultiplier;
  }

  // Generate arrival time
  const arrivalTime = generateArrivalTime(
    startMinutes,
    endMinutes,
    patientType,
    config.advancedSettings?.peakHourMultiplier
  );

  // Generate visits
  const visits = generateVisitsFromCondition(
    condition,
    config.simulationDay,
    arrivalTime,
    randomFactor,
    config
  );

  // Determine severity
  const severity = determineSeverity(mortalityRate);

  return {
    id: `Patient ${index + 1}`,
    name: `Patient ${index + 1}`,
    age,
    visits,
    patientType,
    condition: condition.name,
    severity,
    mortalityRisk: mortalityRate,
    timeToTreatment,
    arrivalMethod: getArrivalMethod(patientType),
    requiresAdmission: Math.random() < condition.requiresAdmission,
    randomFactor,
    mortalityIncreasePerHour
  };
}

function generateVisitsFromCondition(
  condition: MedicalCondition,
  day: string,
  arrivalMinutes: number,
  randomFactor: number,
  config: SimulationConfig
): Visit[] {
  const visits: Visit[] = [];
  let currentTime = arrivalMinutes;

  // Filter departments if filters are set
  let departments = condition.departments;
  if (config.departmentFilters && config.departmentFilters.length > 0) {
    // Ensure at least one filtered department is in the route
    const filteredDepts = config.departmentFilters.map(f => f.departmentId);
    const hasFilteredDept = departments.some(d => filteredDepts.includes(d));

    if (!hasFilteredDept && filteredDepts.length > 0) {
      // Add a filtered department to the route
      departments = [...departments, filteredDepts[Math.floor(Math.random() * filteredDepts.length)]];
    }
  }

  // Calculate time per department based on condition's typical duration
  // Divide total duration across all departments in the route
  const totalDurationForCondition = condition.typicalDuration;
  const numDepartments = departments.length;
  const avgTimePerDept = Math.floor(totalDurationForCondition / numDepartments);

  // Debug logging for first few patients
  if (Math.random() < 0.01) { // Log 1% of patients
    console.log(`📋 Patient route: ${condition.name}`);
    console.log(`   Total duration: ${totalDurationForCondition} min`);
    console.log(`   Departments: ${numDepartments}`);
    console.log(`   Avg per dept: ${avgTimePerDept} min`);
  }

  departments.forEach((deptId, index) => {
    const deptConfig = config.departmentCapacities.find(d => d.departmentId === deptId);

    // Use condition's time distribution, but respect department minimum if set
    // This means: Cardiac Arrest (180 min / 5 depts = 36 min each)
    //             Common Cold (25 min / 3 depts = 8 min each)
    let actualTime = avgTimePerDept;

    // Apply department-specific overrides if they exist
    // For example, if department config says minimum 10 min, respect it
    const deptMinTime = deptConfig?.processingTimeMinutes;
    if (deptMinTime) {
      // Use the LARGER of: condition time or department minimum
      actualTime = Math.max(avgTimePerDept, deptMinTime);
    }

    const startTime = minutesToTime(currentTime);
    currentTime += actualTime;
    const endTime = minutesToTime(currentTime);

    visits.push({
      day,
      startTime,
      endTime,
      departmentId: deptId
    });
  });

  return visits;
}

function selectWeightedCondition(conditions: MedicalCondition[]): MedicalCondition {
  const totalWeight = conditions.reduce((sum, c) => sum + c.prevalence, 0);
  let random = Math.random() * totalWeight;

  for (const condition of conditions) {
    random -= condition.prevalence;
    if (random <= 0) {
      return condition;
    }
  }

  return conditions[conditions.length - 1];
}

/**
 * Select condition based on severity distribution
 * This FORCES the distribution to match the user's settings
 */
function selectConditionBySeverity(
  conditions: MedicalCondition[],
  severityDist: { critical: number; high: number; medium: number; low: number },
  config: SimulationConfig
): MedicalCondition {
  // Categorize conditions by their BASE mortality rate (before multipliers)
  const critical = conditions.filter(c => c.mortalityRate >= 20);  // >=20% mortality
  const high = conditions.filter(c => c.mortalityRate >= 5 && c.mortalityRate < 20);  // 5-20%
  const medium = conditions.filter(c => c.mortalityRate >= 1 && c.mortalityRate < 5);  // 1-5%
  const low = conditions.filter(c => c.mortalityRate < 1);  // <1%

  // Random selection based on EXACT distribution percentages
  const roll = Math.random() * 100;
  let cumulative = 0;

  // Check critical range
  cumulative += severityDist.critical;
  if (roll < cumulative && critical.length > 0) {
    return critical[Math.floor(Math.random() * critical.length)];
  }

  // Check high range
  cumulative += severityDist.high;
  if (roll < cumulative && high.length > 0) {
    return high[Math.floor(Math.random() * high.length)];
  }

  // Check medium range
  cumulative += severityDist.medium;
  if (roll < cumulative && medium.length > 0) {
    return medium[Math.floor(Math.random() * medium.length)];
  }

  // Check low range
  cumulative += severityDist.low;
  if (roll < cumulative && low.length > 0) {
    return low[Math.floor(Math.random() * low.length)];
  }

  // Fallback: if the selected category is empty, pick from available
  const available = [...critical, ...high, ...medium, ...low];
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }

  // Final fallback
  return selectWeightedCondition(conditions);
}

function getPatientTypeFromCondition(condition: MedicalCondition): 'emergency' | 'common' | 'hospitalized' | 'scheduled_checkup' {
  if (emergencyConditions.includes(condition)) return 'emergency';
  if (commonConditions.includes(condition)) return 'common';
  if (hospitalizedConditions.includes(condition)) return 'hospitalized';
  return 'scheduled_checkup';
}

function generateAge(patientType: string): number {
  // Emergency and hospitalized tend to be older
  if (patientType === 'emergency' || patientType === 'hospitalized') {
    return Math.floor(40 + Math.random() * 45); // 40-85
  }
  // Common and scheduled more balanced
  return Math.floor(25 + Math.random() * 55); // 25-80
}

function generateArrivalTime(
  startMinutes: number,
  endMinutes: number,
  patientType: string,
  peakMultiplier?: number
): number {
  const totalMinutes = endMinutes - startMinutes;

  // Emergency patients arrive uniformly
  if (patientType === 'emergency') {
    return startMinutes + Math.floor(Math.random() * totalMinutes);
  }

  // Others peak in morning (8-12)
  const peakStart = 8 * 60;
  const peakEnd = 12 * 60;
  const isPeak = Math.random() < (peakMultiplier || 1.5) / 3;

  if (isPeak && startMinutes <= peakStart && endMinutes >= peakEnd) {
    return peakStart + Math.floor(Math.random() * (peakEnd - peakStart));
  }

  return startMinutes + Math.floor(Math.random() * totalMinutes);
}

function determineSeverity(mortalityRate: number): 'critical' | 'high' | 'medium' | 'low' {
  if (mortalityRate >= 20) return 'critical';
  if (mortalityRate >= 5) return 'high';
  if (mortalityRate >= 1) return 'medium';
  return 'low';
}

function getArrivalMethod(patientType: string): 'ambulance' | 'walk-in' | 'hospitalized' | 'scheduled' {
  if (patientType === 'emergency') return 'ambulance';
  if (patientType === 'hospitalized') return 'hospitalized';
  if (patientType === 'scheduled_checkup') return 'scheduled';
  return 'walk-in';
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function passesRouteFilter(patient: Patient, config: SimulationConfig): boolean {
  if (!config.departmentFilters || config.departmentFilters.length === 0) {
    return true;
  }

  const patientDepartments = patient.visits.map(v => v.departmentId);
  const filteredDepts = config.departmentFilters.map(f => f.departmentId);

  // Patient must visit at least one filtered department
  return patientDepartments.some(d => filteredDepts.includes(d));
}
