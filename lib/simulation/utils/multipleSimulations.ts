import JSZip from 'jszip';
import { SimulationConfig } from '../types/simulationConfig';
import { Building } from '../types/building';
import { runHeadlessSimulation, HeadlessSimulationResult } from './headlessSimulation';

export interface MultipleSimulationsResult {
  runs: HeadlessSimulationResult[];
  aggregateStats: {
    avgTotalPatients: number;
    avgTotalDeaths: number;
    avgMortalityRate: number;
    minMortalityRate: number;
    maxMortalityRate: number;
    avgSimulationDuration: number;
    totalRuns: number;
  };
}

/**
 * Run multiple simulations and generate comprehensive statistics
 */
export async function runMultipleSimulations(
  config: SimulationConfig,
  building: Building,
  runCount: number,
  onProgress?: (overallProgress: number, currentRun: number, message: string) => void
): Promise<MultipleSimulationsResult> {
  const runs: HeadlessSimulationResult[] = [];

  for (let i = 0; i < runCount; i++) {
    onProgress?.(0, i + 1, `Running simulation ${i + 1}/${runCount}...`);

    const result = await runHeadlessSimulation(
      config,
      building,
      (progress, message) => {
        const overallProgress = ((i / runCount) * 100) + (progress / runCount);
        onProgress?.(overallProgress, i + 1, `Run ${i + 1}/${runCount}: ${message}`);
      }
    );

    runs.push(result);
  }

  // Calculate aggregate statistics
  const totalPatients = runs.reduce((sum, r) => sum + r.totalPatients, 0);
  const totalDeaths = runs.reduce((sum, r) => sum + r.totalDeaths, 0);
  const mortalityRates = runs.map(r => (r.totalDeaths / r.totalPatients) * 100);

  const aggregateStats = {
    avgTotalPatients: totalPatients / runCount,
    avgTotalDeaths: totalDeaths / runCount,
    avgMortalityRate: mortalityRates.reduce((sum, rate) => sum + rate, 0) / runCount,
    minMortalityRate: Math.min(...mortalityRates),
    maxMortalityRate: Math.max(...mortalityRates),
    avgSimulationDuration: runs[0].simulationDuration,
    totalRuns: runCount,
  };

  return {
    runs,
    aggregateStats,
  };
}

/**
 * Generate a comprehensive ZIP archive with all multiple simulation results
 */
export async function generateMultipleSimulationsArchive(
  result: MultipleSimulationsResult,
  config: SimulationConfig
): Promise<Blob> {
  const zip = new JSZip();

  // 1. Executive Summary comparing all runs
  const summary = {
    generatedAt: new Date().toISOString(),
    simulationName: config.simulationDay,
    totalRuns: result.aggregateStats.totalRuns,
    aggregateStatistics: {
      averageTotalPatients: result.aggregateStats.avgTotalPatients.toFixed(0),
      averageTotalDeaths: result.aggregateStats.avgTotalDeaths.toFixed(2),
      averageMortalityRate: result.aggregateStats.avgMortalityRate.toFixed(2) + '%',
      minMortalityRate: result.aggregateStats.minMortalityRate.toFixed(2) + '%',
      maxMortalityRate: result.aggregateStats.maxMortalityRate.toFixed(2) + '%',
      simulationDuration: result.aggregateStats.avgSimulationDuration + ' minutes',
    },
  };
  zip.file('00-AGGREGATE-SUMMARY.json', JSON.stringify(summary, null, 2));

  // 2. Comparison table (CSV)
  let comparisonCsv = 'Run,Total Patients,Total Deaths,Mortality Rate,Avg Wait Time,System Utilization\n';
  result.runs.forEach((run, index) => {
    const mortalityRate = ((run.totalDeaths / run.totalPatients) * 100).toFixed(2);
    comparisonCsv += `${index + 1},${run.totalPatients},${run.totalDeaths},${mortalityRate}%,${run.performanceMetrics.avgPatientJourneyTime.toFixed(1)}min,${run.performanceMetrics.systemUtilization.toFixed(1)}%\n`;
  });
  zip.file('01-runs-comparison.csv', comparisonCsv);

  // 3. Configuration used for all runs
  zip.file('02-configuration.json', JSON.stringify(config, null, 2));

  // 4. Detailed statistics per run (in subfolders)
  for (let i = 0; i < result.runs.length; i++) {
    const run = result.runs[i];
    const runFolder = zip.folder(`run-${i + 1}`);

    if (!runFolder) continue;

    // Summary for this run
    const runSummary = {
      runNumber: i + 1,
      totalPatients: run.totalPatients,
      totalDeaths: run.totalDeaths,
      mortalityRate: ((run.totalDeaths / run.totalPatients) * 100).toFixed(2) + '%',
      simulationDuration: run.simulationDuration + ' minutes',
    };
    runFolder.file('summary.json', JSON.stringify(runSummary, null, 2));

    // Patient type statistics
    let patientTypeCsv = 'Patient Type,Count,Deaths,Mortality Rate,Avg Wait Time\n';
    Object.entries(run.patientTypeStats).forEach(([type, stats]) => {
      const mortalityRate = stats.count > 0 ? ((stats.deaths / stats.count) * 100).toFixed(2) : '0.00';
      patientTypeCsv += `${type},${stats.count},${stats.deaths},${mortalityRate}%,${stats.avgWaitTime.toFixed(1)}min\n`;
    });
    runFolder.file('patient-type-statistics.csv', patientTypeCsv);

    // Department statistics
    let deptCsv = 'Department,Total Visits,Deaths,Avg Wait Time,Max Wait Time,Blocked Minutes,Utilization\n';
    Object.values(run.departmentStats).forEach(dept => {
      deptCsv += `${dept.name},${dept.totalVisits},${dept.totalDeaths},${dept.avgWaitTime.toFixed(1)}min,${dept.maxWaitTime.toFixed(1)}min,${dept.totalBlockedMinutes}min,${dept.utilizationRate.toFixed(1)}%\n`;
    });
    runFolder.file('department-statistics.csv', deptCsv);

    // Death records
    let deathRecordsCsv = 'Patient ID,Patient Name,Department,Time of Death,Cause,Mortality Risk,Wait Time\n';
    run.rawData.allDeathRecords.forEach(death => {
      deathRecordsCsv += `${death.patientId},${death.patientName},${death.departmentId},${death.timeOfDeath}min,${death.causeOfDeath},${death.mortalityRisk}%,${death.waitingTime || 0}min\n`;
    });
    runFolder.file('death-records.csv', deathRecordsCsv);

    // Hourly flow
    let hourlyCsv = 'Hour,Arrivals,Departures,Active Patients,Deaths\n';
    Object.entries(run.hourlyFlow).forEach(([hour, data]) => {
      hourlyCsv += `${hour}:00,${data.arrivals},${data.departures},${data.activePatients},${data.deaths}\n`;
    });
    runFolder.file('hourly-flow.csv', hourlyCsv);

    // Full raw data
    runFolder.file('raw-data.json', JSON.stringify(run.rawData, null, 2));
  }

  // 5. Statistical Analysis across all runs
  const statisticalAnalysis = {
    mortalityRateDistribution: result.runs.map((r, i) => ({
      run: i + 1,
      rate: ((r.totalDeaths / r.totalPatients) * 100).toFixed(2),
    })),
    deathsDistribution: result.runs.map((r, i) => ({
      run: i + 1,
      deaths: r.totalDeaths,
    })),
    systemUtilizationDistribution: result.runs.map((r, i) => ({
      run: i + 1,
      utilization: r.performanceMetrics.systemUtilization.toFixed(2),
    })),
  };
  zip.file('03-statistical-analysis.json', JSON.stringify(statisticalAnalysis, null, 2));

  // 6. README
  const readme = `# Multiple Simulations Analysis
Generated: ${new Date().toISOString()}
Simulation: ${config.simulationDay}
Total Runs: ${result.aggregateStats.totalRuns}

## Aggregate Statistics:
- Average Patients: ${result.aggregateStats.avgTotalPatients.toFixed(0)}
- Average Deaths: ${result.aggregateStats.avgTotalDeaths.toFixed(2)}
- Average Mortality Rate: ${result.aggregateStats.avgMortalityRate.toFixed(2)}%
- Min Mortality Rate: ${result.aggregateStats.minMortalityRate.toFixed(2)}%
- Max Mortality Rate: ${result.aggregateStats.maxMortalityRate.toFixed(2)}%

## Files Structure:
- 00-AGGREGATE-SUMMARY.json - Overview of all runs
- 01-runs-comparison.csv - Side-by-side comparison table
- 02-configuration.json - Simulation configuration
- 03-statistical-analysis.json - Statistical distributions
- run-N/ folders - Detailed data for each individual run

## Usage:
Import CSV files into Excel or statistical analysis tools for comparison.
Use JSON files for programmatic analysis.
Compare mortality rates and system utilization across runs to identify patterns.
`;
  zip.file('README.txt', readme);

  // Generate the ZIP
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  return blob;
}

/**
 * Download the multiple simulations archive
 */
export function downloadMultipleSimulationsArchive(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-multiple-runs-${new Date().toISOString().split('T')[0]}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
