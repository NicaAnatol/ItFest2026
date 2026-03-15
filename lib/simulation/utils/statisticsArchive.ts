import JSZip from 'jszip';
import { HeadlessSimulationResult } from './headlessSimulation';

/**
 * Generate a comprehensive ZIP file with all simulation statistics
 */
export async function generateStatisticsArchive(
  result: HeadlessSimulationResult,
  filename: string = 'simulation-statistics'
): Promise<Blob> {
  const zip = new JSZip();

  // 1. Executive Summary (JSON)
  const summary = {
    generatedAt: new Date().toISOString(),
    simulationName: result.config.simulationDay,
    duration: `${result.simulationDuration} minutes`,
    totalPatients: result.totalPatients,
    totalDeaths: result.totalDeaths,
    mortalityRate: ((result.totalDeaths / result.totalPatients) * 100).toFixed(2) + '%',
    totalTransfers: result.totalTransfers,
    patientsLeftSystem: result.patientsLeftSystem,
  };
  zip.file('00-SUMMARY.json', JSON.stringify(summary, null, 2));

  // 2. Configuration (JSON)
  zip.file('01-configuration.json', JSON.stringify(result.config, null, 2));

  // 3. Patient Type Statistics (CSV)
  let patientTypeCsv = 'Patient Type,Count,Deaths,Mortality Rate,Avg Wait Time\n';
  Object.entries(result.patientTypeStats).forEach(([type, stats]) => {
    const mortalityRate = stats.count > 0 ? ((stats.deaths / stats.count) * 100).toFixed(2) : '0.00';
    patientTypeCsv += `${type},${stats.count},${stats.deaths},${mortalityRate}%,${stats.avgWaitTime.toFixed(1)}min\n`;
  });
  zip.file('02-patient-type-statistics.csv', patientTypeCsv);

  // 4. Severity Statistics (CSV)
  let severityCsv = 'Severity,Count,Deaths,Mortality Rate\n';
  Object.entries(result.severityStats).forEach(([severity, stats]) => {
    severityCsv += `${severity},${stats.count},${stats.deaths},${stats.mortalityRate.toFixed(2)}%\n`;
  });
  zip.file('03-severity-statistics.csv', severityCsv);

  // 5. Top Conditions (CSV)
  let conditionsCsv = 'Condition,Count,Deaths,Mortality Rate\n';
  result.topConditions.forEach(cond => {
    conditionsCsv += `${cond.condition},${cond.count},${cond.deaths},${cond.mortalityRate.toFixed(2)}%\n`;
  });
  zip.file('04-top-conditions.csv', conditionsCsv);

  // 6. Death Analysis (JSON + CSV)
  zip.file('05-death-analysis.json', JSON.stringify(result.deathAnalysis, null, 2));

  let deathsCsv = 'Hour,Deaths\n';
  Object.entries(result.deathAnalysis.deathsByHour).forEach(([hour, count]) => {
    deathsCsv += `${hour}:00,${count}\n`;
  });
  zip.file('05-deaths-by-hour.csv', deathsCsv);

  // 7. Department Statistics (CSV)
  let deptCsv = 'Department,Total Visits,Deaths,Avg Wait Time,Max Wait Time,Blocked Minutes,Utilization\n';
  Object.values(result.departmentStats).forEach(dept => {
    deptCsv += `${dept.name},${dept.totalVisits},${dept.totalDeaths},${dept.avgWaitTime.toFixed(1)}min,${dept.maxWaitTime.toFixed(1)}min,${dept.totalBlockedMinutes}min,${dept.utilizationRate.toFixed(1)}%\n`;
  });
  zip.file('06-department-statistics.csv', deptCsv);

  // 8. Hourly Flow (CSV)
  let hourlyCsv = 'Hour,Arrivals,Departures,Active Patients,Deaths\n';
  Object.entries(result.hourlyFlow).forEach(([hour, data]) => {
    hourlyCsv += `${hour}:00,${data.arrivals},${data.departures},${data.activePatients},${data.deaths}\n`;
  });
  zip.file('07-hourly-flow.csv', hourlyCsv);

  // 9. Wait Time Distribution (CSV)
  let waitCsv = 'Wait Time Range,Patient Count\n';
  Object.entries(result.waitTimeDistribution).forEach(([range, count]) => {
    waitCsv += `${range},${count}\n`;
  });
  zip.file('08-wait-time-distribution.csv', waitCsv);

  // 10. Performance Metrics (JSON)
  zip.file('09-performance-metrics.json', JSON.stringify(result.performanceMetrics, null, 2));

  // 11. Transfer Statistics (if available)
  if (result.transferStats) {
    zip.file('10-transfer-statistics.json', JSON.stringify(result.transferStats, null, 2));

    let transferCsv = 'Reason,Count\n';
    Object.entries(result.transferStats.transfersByReason).forEach(([reason, count]) => {
      transferCsv += `${reason},${count}\n`;
    });
    zip.file('10-transfers-by-reason.csv', transferCsv);
  }

  // 12. All Patient Journeys (CSV)
  let journeysCsv = 'Patient ID,Patient Name,Condition,Severity,Total Time,Outcome,Visits Count\n';
  result.rawData.patientJourneys.forEach(journey => {
    journeysCsv += `${journey.patientId},${journey.patientName},${journey.condition},${journey.severity},${journey.totalTime}min,${journey.outcome},${journey.visits.length}\n`;
  });
  zip.file('11-patient-journeys.csv', journeysCsv);

  // 13. Death Records (CSV)
  let deathRecordsCsv = 'Patient ID,Patient Name,Department,Time of Death,Cause,Mortality Risk,Wait Time\n';
  result.rawData.allDeathRecords.forEach(death => {
    deathRecordsCsv += `${death.patientId},${death.patientName},${death.departmentId},${death.timeOfDeath}min,${death.causeOfDeath},${death.mortalityRisk}%,${death.waitingTime || 0}min\n`;
  });
  zip.file('12-death-records.csv', deathRecordsCsv);

  // 14. Complete Raw Data (JSON) - for advanced analysis
  zip.file('13-raw-data-complete.json', JSON.stringify(result.rawData, null, 2));

  // 15. README with explanation
  const readme = `# Hospital Simulation Statistics Archive
Generated: ${new Date().toISOString()}
Simulation: ${result.config.simulationDay}

## Files Included:

### Summary & Configuration
- 00-SUMMARY.json - Executive summary of simulation results
- 01-configuration.json - Complete simulation configuration used

### Patient Statistics
- 02-patient-type-statistics.csv - Statistics by patient type (emergency, common, etc.)
- 03-severity-statistics.csv - Statistics by severity (critical, high, medium, low)
- 04-top-conditions.csv - Top 10 medical conditions

### Death Analysis
- 05-death-analysis.json - Detailed death statistics
- 05-deaths-by-hour.csv - Deaths distributed by hour
- 12-death-records.csv - Individual death records with details

### Department Performance
- 06-department-statistics.csv - Performance metrics per department
- 07-hourly-flow.csv - Patient flow by hour
- 08-wait-time-distribution.csv - Wait time distribution

### System Performance
- 09-performance-metrics.json - Overall system performance metrics
- 10-transfer-statistics.json - Transfer statistics (if city mode)
- 10-transfers-by-reason.csv - Transfers by reason

### Detailed Data
- 11-patient-journeys.csv - Complete journey of each patient
- 13-raw-data-complete.json - All raw data for advanced analysis

## Key Metrics:
- Total Patients: ${result.totalPatients}
- Total Deaths: ${result.totalDeaths}
- Mortality Rate: ${((result.totalDeaths / result.totalPatients) * 100).toFixed(2)}%
- Simulation Duration: ${result.simulationDuration} minutes
- Average Patient Journey: ${result.performanceMetrics.avgPatientJourneyTime.toFixed(1)} minutes

## Usage:
Import CSV files into Excel, Google Sheets, or data analysis tools.
Use JSON files for programmatic analysis or dashboards.
`;
  zip.file('README.txt', readme);

  // Generate the ZIP
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  return blob;
}

/**
 * Download the statistics archive
 */
export function downloadStatisticsArchive(blob: Blob, filename: string = 'simulation-statistics') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
