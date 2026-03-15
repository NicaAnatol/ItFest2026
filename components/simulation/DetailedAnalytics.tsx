'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Patient } from '@/lib/simulation/types/building';
import { building } from '@/lib/simulation/data/buildingData';
import { QueueManager } from '@/lib/simulation/data/queueManagerClass';

interface Hospital {
  id: string;
  name: string;
  patients: Patient[];
  queueManager: QueueManager | null;
}

interface DetailedAnalyticsProps {
  patients: Patient[];
  currentTime: string;
  currentDay: string;
  queueManager: QueueManager | null;
  isStressTestMode: boolean;
  completedTransfers?: Array<{
    patientId: string;
    patientName: string;
    fromHospital: string;
    toHospital: string;
    reason: string;
    time: string;
    distance?: number;
    durationMinutes?: number;
  }>;
  activeTransfers?: Patient[];
  // Multi-hospital support
  hospitals?: Hospital[];
  isCityMode?: boolean;
}

// Helper to format time from minutes
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function DetailedAnalytics({
  patients,
  currentTime,
  currentDay,
  queueManager,
  isStressTestMode,
  completedTransfers = [],
  activeTransfers = [],
  hospitals = [],
  isCityMode = false,
}: DetailedAnalyticsProps) {
  // Hospital selection for city mode
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | 'all'>('all');

  // Get current hospital data
  const currentHospital = selectedHospitalId === 'all' ? null : hospitals.find(h => h.id === selectedHospitalId);
  const currentPatients = selectedHospitalId === 'all' ?
    (isCityMode ? hospitals.flatMap(h => h.patients) : patients) :
    (currentHospital?.patients || patients);
  const currentQueueManager = selectedHospitalId === 'all' ? queueManager : (currentHospital?.queueManager || queueManager);

  // Parse current time
  const [currentHours, currentMinutes] = currentTime.split(':').map(Number);
  const currentTotalMinutes = currentHours * 60 + currentMinutes;

  // Helper: Convert time string to minutes
  const timeToMinutes = (time: string): number => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  // Filter completed transfers to only show those that happened BEFORE current time
  const validCompletedTransfers = useMemo(() => {
    return completedTransfers.filter(transfer => {
      const transferMinutes = timeToMinutes(transfer.time);
      return transferMinutes <= currentTotalMinutes;
    });
  }, [completedTransfers, currentTotalMinutes]);

  // Calculate comprehensive statistics
  const stats = useMemo(() => {
    const result = {
      // Traffic analysis by hour
      trafficByHour: new Map<number, { arrivals: number; departures: number }>(),

      // Blockage analysis
      peakBlockageTime: { hour: 0, count: 0 },
      totalBlockageEvents: 0,
      blockageByDepartment: new Map<string, number>(),

      // Efficiency metrics
      avgWaitTime: 0,
      avgProcessingTime: 0,
      peakUtilizationTime: { hour: 0, utilization: 0 },

      // Department statistics
      departmentStats: new Map<string, {
        totalVisits: number;
        avgDuration: number;
        peakHour: number;
        peakCount: number;
      }>(),

      // Patient flow
      totalPatients: currentPatients.length,
      activeNow: 0,
      completedToday: 0,
      avgJourneyDuration: 0,

      // Busiest times
      busiestHour: { hour: 0, count: 0 },
      quietestHour: { hour: 23, count: 1000 },

      // Transfer statistics (city mode)
      totalTransfers: validCompletedTransfers.length,
      transfersInProgress: activeTransfers.length,
      uniquePatientsTransferred: new Set([
        ...validCompletedTransfers.map(t => t.patientId),
        ...activeTransfers.map(p => p.id)
      ]).size,
      // Count UNIQUE patients who left the system (not number of transfers)
      uniquePatientsLeftSystem: new Set(
        validCompletedTransfers
          .filter(t => t.toHospital === 'ABROAD')
          .map(t => t.patientId)
      ).size,
      // Also track patients currently leaving
      patientsCurrentlyLeaving: activeTransfers.filter(p => p.transferTo === 'OUTSIDE_SYSTEM').length,
      deathsInTransfer: validCompletedTransfers.filter(t => t.patientName.includes('💀')).length,
      avgTransferDistance: 0,
      avgTransferDuration: 0,
    };

    // Initialize hourly traffic (8:00 - 20:00)
    for (let h = 8; h <= 20; h++) {
      result.trafficByHour.set(h, { arrivals: 0, departures: 0 });
    }

    // Analyze all patients
    let totalWaitMinutes = 0;
    let totalProcessingMinutes = 0;
    let totalJourneyMinutes = 0;
    let journeyCount = 0;

    currentPatients.forEach(patient => {
      const todayVisits = patient.visits.filter(v => v.day === currentDay);
      if (todayVisits.length === 0) return;

      // Journey duration
      if (todayVisits.length > 0) {
        const firstVisit = todayVisits[0];
        const lastVisit = todayVisits[todayVisits.length - 1];

        const [startH, startM] = firstVisit.startTime.split(':').map(Number);
        const [endH, endM] = lastVisit.endTime.split(':').map(Number);

        const journeyMinutes = (endH * 60 + endM) - (startH * 60 + startM);
        totalJourneyMinutes += journeyMinutes;
        journeyCount++;

        // Track arrivals
        const arrivalHour = startH;
        const hourData = result.trafficByHour.get(arrivalHour);
        if (hourData) hourData.arrivals++;

        // Track departures
        const departureHour = endH;
        const deptData = result.trafficByHour.get(departureHour);
        if (deptData) deptData.departures++;
      }

      // Check if patient is active now
      const isActive = todayVisits.some(visit => {
        const [startH, startM] = visit.startTime.split(':').map(Number);
        const [endH, endM] = visit.endTime.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        return currentTotalMinutes >= startMinutes && currentTotalMinutes < endMinutes;
      });

      if (isActive) result.activeNow++;

      // Check if completed
      const lastVisit = todayVisits[todayVisits.length - 1];
      const [lastEndH, lastEndM] = lastVisit.endTime.split(':').map(Number);
      const lastEndMinutes = lastEndH * 60 + lastEndM;
      if (currentTotalMinutes > lastEndMinutes) {
        result.completedToday++;
      }

      // Analyze each visit
      todayVisits.forEach(visit => {
        const [startH, startM] = visit.startTime.split(':').map(Number);
        const [endH, endM] = visit.endTime.split(':').map(Number);
        const duration = (endH * 60 + endM) - (startH * 60 + startM);

        totalProcessingMinutes += duration;

        // Department statistics
        if (!result.departmentStats.has(visit.departmentId)) {
          result.departmentStats.set(visit.departmentId, {
            totalVisits: 0,
            avgDuration: 0,
            peakHour: startH,
            peakCount: 0,
          });
        }

        const deptStat = result.departmentStats.get(visit.departmentId)!;
        deptStat.totalVisits++;
        deptStat.avgDuration = ((deptStat.avgDuration * (deptStat.totalVisits - 1)) + duration) / deptStat.totalVisits;
      });
    });

    // Calculate averages
    result.avgJourneyDuration = journeyCount > 0 ? totalJourneyMinutes / journeyCount : 0;
    result.avgProcessingTime = currentPatients.length > 0 ? totalProcessingMinutes / (currentPatients.length * 3) : 0;

    // Calculate transfer statistics
    if (validCompletedTransfers.length > 0) {
      const transfersWithDistance = validCompletedTransfers.filter(t => t.distance && t.distance > 0);
      const transfersWithDuration = validCompletedTransfers.filter(t => t.durationMinutes && t.durationMinutes > 0);

      result.avgTransferDistance = transfersWithDistance.length > 0 ?
        transfersWithDistance.reduce((sum, t) => sum + (t.distance || 0), 0) / transfersWithDistance.length : 0;

      result.avgTransferDuration = transfersWithDuration.length > 0 ?
        transfersWithDuration.reduce((sum, t) => sum + (t.durationMinutes || 0), 0) / transfersWithDuration.length : 0;
    }

    // Find busiest and quietest hours
    result.trafficByHour.forEach((data, hour) => {
      const totalActivity = data.arrivals + data.departures;
      if (totalActivity > result.busiestHour.count) {
        result.busiestHour = { hour, count: totalActivity };
      }
      if (totalActivity < result.quietestHour.count && totalActivity > 0) {
        result.quietestHour = { hour, count: totalActivity };
      }
    });

    // Queue manager stats (if available)
    if (currentQueueManager && isStressTestMode) {
      const globalStats = currentQueueManager.getGlobalStats();

      // Find peak utilization
      let maxUtil = 0;
      let maxUtilHour = 8;
      for (let h = 8; h <= 20; h++) {
        // This is an approximation - in reality you'd need historical data
        if (h === currentHours && globalStats.overallUtilization > maxUtil) {
          maxUtil = globalStats.overallUtilization;
          maxUtilHour = h;
        }
      }
      result.peakUtilizationTime = { hour: maxUtilHour, utilization: maxUtil };

      // Count blocked departments
      result.totalBlockageEvents = globalStats.totalBlocked;
    }

    return result;
  }, [currentPatients, currentTime, currentDay, currentQueueManager, isStressTestMode, currentTotalMinutes, validCompletedTransfers, activeTransfers]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>📊 Statistics {isCityMode ? 'City' : 'Complete'}</span>
            {selectedHospitalId === 'all' && isCityMode && (
              <Badge className="bg-purple-600">All Hospitals</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Hospital Selector (City Mode) */}
          {isCityMode && hospitals.length > 0 && (
            <>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">Select Hospital</div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedHospitalId === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedHospitalId('all')}
                    className="transition-all"
                  >
                    🏙️ All ({hospitals.length})
                  </Button>
                  {hospitals.map(hospital => (
                    <Button
                      key={hospital.id}
                      variant={selectedHospitalId === hospital.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedHospitalId(hospital.id)}
                      className="transition-all"
                    >
                      {hospital.name}
                    </Button>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Transfer Statistics (City Mode Only) */}
          {isCityMode && selectedHospitalId === 'all' && (
            <>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">📊 Transfer Statistics</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-xs text-muted-foreground">Patients Transferred</div>
                    <div className="text-xl font-bold text-purple-600">{stats.uniquePatientsTransferred}</div>
                  </div>
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-xs text-muted-foreground">Active Transfer</div>
                    <div className="text-xl font-bold text-blue-600">{stats.transfersInProgress}</div>
                  </div>
                  <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-xs text-muted-foreground">Completed Transfers</div>
                    <div className="text-xl font-bold text-green-600">{stats.totalTransfers}</div>
                  </div>
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-300">
                    <div className="text-xs text-muted-foreground">Left System</div>
                    <div className="text-xl font-bold text-red-600">{stats.uniquePatientsLeftSystem}</div>
                    {stats.patientsCurrentlyLeaving > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        ({stats.patientsCurrentlyLeaving} en route)
                      </div>
                    )}
                  </div>
                </div>

                {stats.deathsInTransfer > 0 && (
                  <div className="p-3 bg-black dark:bg-gray-900 border-2 border-red-600 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-red-500">💀 Deaths in Transfer:</span>
                      <Badge className="bg-red-700 text-white text-lg">{stats.deathsInTransfer}</Badge>
                    </div>
                  </div>
                )}

                {stats.avgTransferDistance > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex justify-between items-center p-2 bg-muted rounded-lg">
                      <span className="text-xs">Avg distance:</span>
                      <Badge variant="outline">{stats.avgTransferDistance.toFixed(1)} km</Badge>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted rounded-lg">
                      <span className="text-xs">Avg duration:</span>
                      <Badge variant="outline">{Math.round(stats.avgTransferDuration)} min</Badge>
                    </div>
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Overall Metrics */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">Overall Metrics</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-xs text-muted-foreground">Total Patients</div>
                <div className="text-xl font-bold">{stats.totalPatients}</div>
              </div>
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-xs text-muted-foreground">Active Now</div>
                <div className="text-xl font-bold">{stats.activeNow}</div>
              </div>
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-xs text-muted-foreground">Completed</div>
                <div className="text-xl font-bold">{stats.completedToday}</div>
              </div>
              <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="text-xs text-muted-foreground">In Progress</div>
                <div className="text-xl font-bold">{stats.activeNow}</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Time Analysis */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">Time Analysis</div>
            <div className="space-y-1">
              <div className="flex justify-between items-center p-2 bg-muted rounded-lg">
                <span className="text-xs">Avg journey duration:</span>
                <Badge variant="outline">{Math.round(stats.avgJourneyDuration)} min</Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted rounded-lg">
                <span className="text-xs">Avg processing time:</span>
                <Badge variant="outline">{Math.round(stats.avgProcessingTime)} min</Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Peak Times */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">Peak Times</div>
            <div className="space-y-1">
              <div className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <span className="text-xs">Busiest hour:</span>
                <Badge className="bg-red-500">
                  {String(stats.busiestHour.hour).padStart(2, '0')}:00 ({stats.busiestHour.count} events)
                </Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-xs">Quietest hour:</span>
                <Badge className="bg-green-500">
                  {String(stats.quietestHour.hour).padStart(2, '0')}:00 ({stats.quietestHour.count} events)
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Traffic by Hour */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">Traffic by Hour</div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {Array.from(stats.trafficByHour.entries())
                .sort((a, b) => a[0] - b[0])
                .map(([hour, data]) => (
                  <div key={hour} className="flex justify-between items-center p-1.5 bg-muted rounded text-xs">
                    <span className="font-semibold w-16">
                      {String(hour).padStart(2, '0')}:00
                    </span>
                    <div className="flex gap-2 items-center">
                      <span className="text-green-600 dark:text-green-400">↓{data.arrivals}</span>
                      <span className="text-red-600 dark:text-red-400">↑{data.departures}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <Separator />

          {/* Department Statistics */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">Department Statistics</div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {Array.from(stats.departmentStats.entries()).map(([deptId, stat]) => {
                const dept = building.floors
                  .flatMap(f => f.departments)
                  .find(d => d.id === deptId);

                return (
                  <div key={deptId} className="p-2 bg-muted rounded-lg space-y-1">
                    <div className="text-xs font-semibold">{dept?.name || deptId}</div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div>Visits: <Badge variant="outline" className="text-xs">{stat.totalVisits}</Badge></div>
                      <div>Duration: <Badge variant="outline" className="text-xs">{Math.round(stat.avgDuration)}m</Badge></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {isStressTestMode && currentQueueManager && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">Blockage Analysis</div>
                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-xs text-muted-foreground">Blocked departments:</div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {stats.totalBlockageEvents}
                  </div>
                </div>
                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="text-xs text-muted-foreground">Maximum usage:</div>
                  <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                    {stats.peakUtilizationTime.utilization.toFixed(1)}% la {String(stats.peakUtilizationTime.hour).padStart(2, '0')}:00
                  </div>
                </div>
              </div>

              {/* DEATH RECORDS */}
              <Separator />
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">💀 Death Registry</div>

                {(() => {
                  // Check if functions exist (for backwards compatibility)
                  if (!currentQueueManager.getDeathRecords || !currentQueueManager.getDeathsByType) {
                    return (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
                        <div className="text-sm text-yellow-600 dark:text-yellow-400">
                          ⚠️ Death registry not available (old version)
                        </div>
                      </div>
                    );
                  }

                  const deathRecords = currentQueueManager.getDeathRecords();
                  const deathsByType = currentQueueManager.getDeathsByType();

                  if (deathRecords.length === 0) {
                    return (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                        <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                          ✅ No deaths recorded
                        </div>
                      </div>
                    );
                  }

                  const delayDeaths = deathRecords.filter(d => d.causeOfDeath === 'delay');
                  const naturalDeaths = deathRecords.filter(d => d.causeOfDeath === 'natural');

                  return (
                    <>
                      {/* Summary Cards */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <div className="text-xs text-muted-foreground">⏰ From delay:</div>
                          <div className="text-2xl font-bold text-red-600">{delayDeaths.length}</div>
                        </div>
                        <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                          <div className="text-xs text-muted-foreground">💔 Natural:</div>
                          <div className="text-2xl font-bold text-orange-600">{naturalDeaths.length}</div>
                        </div>
                      </div>

                      {/* Deaths by Patient Type */}
                      <div className="space-y-1">
                        <div className="text-xs font-semibold">Deaths by patient types:</div>
                        <div className="grid grid-cols-2 gap-1">
                          {Array.from(deathsByType.entries()).map(([type, count]) => (
                            <div key={type} className="p-1.5 bg-muted rounded flex justify-between text-xs">
                              <span className={
                                type === 'emergency' ? 'text-red-600 font-bold' :
                                type === 'hospitalized' ? 'text-orange-600' :
                                type === 'scheduled_checkup' ? 'text-blue-600' :
                                'text-gray-600'
                              }>
                                {type === 'emergency' && '🚑 Emergency'}
                                {type === 'common' && '👤 Common'}
                                {type === 'hospitalized' && '🏥 Hospitalized'}
                                {type === 'scheduled_checkup' && '📋 Checkup'}
                              </span>
                              <Badge variant="destructive" className="text-xs">{count}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* List of Deaths */}
                      <div className="space-y-1">
                        <div className="text-xs font-semibold">Lista decese ({deathRecords.length} total):</div>
                        <div className="space-y-1 max-h-96 overflow-y-auto">
                          {deathRecords.map((death, idx) => (
                            <div key={idx} className={`p-2 rounded-lg border text-xs ${
                              death.causeOfDeath === 'delay'
                                ? 'bg-red-50 dark:bg-red-900/20 border-red-200'
                                : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200'
                            }`}>
                              <div className="flex justify-between items-start mb-1">
                                <div className="font-semibold">
                                  {death.causeOfDeath === 'delay' ? '⏰' : '💔'} {death.patientName}
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {minutesToTime(death.timeOfDeath)}
                                </Badge>
                              </div>
                              <div className="space-y-0.5 text-xs text-muted-foreground">
                                <div>
                                  <span className="font-semibold">Department:</span> {
                                    building.floors.flatMap(f => f.departments).find(d => d.id === death.departmentId)?.name || death.departmentId
                                  }
                                </div>
                                {death.condition && (
                                  <div>
                                    <span className="font-semibold">Condition:</span> {death.condition}
                                  </div>
                                )}
                                <div>
                                  <span className="font-semibold">Risk:</span> {death.mortalityRisk.toFixed(1)}%
                                  {death.adjustedMortalityRisk && death.adjustedMortalityRisk !== death.mortalityRisk && (
                                    <span className="text-red-600"> → {death.adjustedMortalityRisk.toFixed(1)}%</span>
                                  )}
                                </div>
                                {death.waitingTime !== undefined && (
                                  <div>
                                    <span className="font-semibold">Waiting:</span> {death.waitingTime} minute
                                  </div>
                                )}
                                <div>
                                  <span className="font-semibold">Cause:</span>{' '}
                                  <span className={death.causeOfDeath === 'delay' ? 'text-red-600 font-bold' : 'text-orange-600 font-bold'}>
                                    {death.causeOfDeath === 'delay' ? 'Treatment delay' : 'Disease severity'}
                                  </span>
                                </div>
                                {death.patientType && (
                                  <div>
                                    <span className="font-semibold">Type:</span>{' '}
                                    <span className={
                                      death.patientType === 'emergency' ? 'text-red-600 font-bold' :
                                      death.patientType === 'hospitalized' ? 'text-orange-600' :
                                      ''
                                    }>
                                      {death.patientType === 'emergency' && '🚑 EMERGENCY'}
                                      {death.patientType === 'common' && '👤 Common'}
                                      {death.patientType === 'hospitalized' && '🏥 Hospitalized'}
                                      {death.patientType === 'scheduled_checkup' && '📋 Checkup'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
