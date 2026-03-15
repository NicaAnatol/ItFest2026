'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Patient } from '@/lib/simulation/types/building';
import { building } from '@/lib/simulation/data/buildingData';
import { QueueManager } from '@/lib/simulation/data/queueManagerClass';

interface StatisticsPanelProps {
  patients: Patient[];
  currentTime: string;
  currentDay: string;
  queueManager: QueueManager | null;
  isStressTestMode: boolean;
  isOpen: boolean;
  onClose: () => void;
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
  activeeTransfers?: Patient[];
}

export default function StatisticsPanel({
  patients,
  currentTime,
  currentDay,
  queueManager,
  isStressTestMode,
  isOpen,
  onClose,
  completedTransfers = [],
  activeeTransfers = [],
}: StatisticsPanelProps) {
  const [currentHours, currentMinutes] = currentTime.split(':').map(Number);
  const currentTotalMinutes = currentHours * 60 + currentMinutes;

  // Calculate statistics for each department
  const departmentStats = useMemo(() => {
    const allDepartments = building.floors.flatMap(f => f.departments);
    const stats = new Map<string, {
      name: string;
      floor: number;
      type: string;
      totalVisitsToday: number;
      currentOccupancy: number;
      capacity: number;
      utilizationPercent: number;
      avgDurationMinutes: number;
      peakOccupancy: number;
      peakTime: string;
      totalWaitingQueue: number;
      isBlocked: boolean;
      patientsServedToday: number;
      totalBlockedMinutes: number;
      totalBlockedHours: number;
      totalDeaths: number;
      deathsFromDelay: number;
      deathsNatural: number;  // NEW
      deathsDuringTreatment: number;  // NEW
    }>();

    allDepartments.forEach(dept => {
      const todayVisits = patients.flatMap(p =>
        p.visits.filter(v => v.day === currentDay && v.departmentId === dept.id)
      );

      // Current occupancy and death statistics
      let currentOccupancy = 0;
      let totalBlockedMinutes = 0;
      let totalDeaths = 0;
      let deathsFromDelay = 0;
      let deathsNatural = 0;  // NEW
      let deathsDuringTreatment = 0;  // NEW

      if (isStressTestMode && queueManager) {
        const queueState = queueManager.getQueueState(dept.id);
        currentOccupancy = queueState?.currentOccupancy || 0;
        totalBlockedMinutes = queueState?.totalBlockedMinutes || 0;
        totalDeaths = queueState?.totalDeaths || 0;
        deathsFromDelay = queueState?.deathsFromDelay || 0;
        deathsNatural = queueState?.deathsNatural || 0;  // NEW
        deathsDuringTreatment = queueState?.deathsDuringTreatment || 0;  // NEW
      } else {
        currentOccupancy = todayVisits.filter(visit => {
          const [startH, startM] = visit.startTime.split(':').map(Number);
          const [endH, endM] = visit.endTime.split(':').map(Number);
          const startMinutes = startH * 60 + startM;
          const endMinutes = endH * 60 + endM;
          return currentTotalMinutes >= startMinutes && currentTotalMinutes < endMinutes;
        }).length;
      }

      // Average duration
      let avgDuration = 0;
      if (todayVisits.length > 0) {
        const totalDuration = todayVisits.reduce((sum, visit) => {
          const [startH, startM] = visit.startTime.split(':').map(Number);
          const [endH, endM] = visit.endTime.split(':').map(Number);
          return sum + ((endH * 60 + endM) - (startH * 60 + startM));
        }, 0);
        avgDuration = totalDuration / todayVisits.length;
      }

      // Peak occupancy throughout the day
      let peakOccupancy = 0;
      let peakTime = '08:00';
      for (let hour = 8; hour <= 20; hour++) {
        for (let min = 0; min < 60; min += 15) {
          const checkMinutes = hour * 60 + min;
          const occupancy = todayVisits.filter(visit => {
            const [startH, startM] = visit.startTime.split(':').map(Number);
            const [endH, endM] = visit.endTime.split(':').map(Number);
            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;
            return checkMinutes >= startMinutes && checkMinutes < endMinutes;
          }).length;

          if (occupancy > peakOccupancy) {
            peakOccupancy = occupancy;
            peakTime = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
          }
        }
      }

      const capacity = dept.capacity || 10;
      const queueLength = isStressTestMode && queueManager
        ? queueManager.getQueueState(dept.id)?.queue.length || 0
        : 0;

      // Count unique patients who visited
      const uniquePatients = new Set(
        patients.filter(p => p.visits.some(v => v.day === currentDay && v.departmentId === dept.id)).map(p => p.id)
      );

      stats.set(dept.id, {
        name: dept.name,
        floor: dept.floor,
        type: dept.type,
        totalVisitsToday: todayVisits.length,
        currentOccupancy,
        capacity,
        utilizationPercent: capacity > 0 ? (currentOccupancy / capacity) * 100 : 0,
        avgDurationMinutes: avgDuration,
        peakOccupancy,
        peakTime,
        totalWaitingQueue: queueLength,
        isBlocked: currentOccupancy >= capacity,
        patientsServedToday: uniquePatients.size,
        totalBlockedMinutes,
        totalBlockedHours: totalBlockedMinutes / 60,
        totalDeaths,
        deathsFromDelay,
        deathsNatural,  // NEW
        deathsDuringTreatment,  // NEW
      });
    });

    return stats;
  }, [patients, currentTime, currentDay, queueManager, isStressTestMode, currentTotalMinutes]);

  // Group by floor
  const statsByFloor = useMemo(() => {
    const grouped = new Map<number, typeof departmentStats>();
    building.floors.forEach(floor => {
      const floorStats = new Map();
      floor.departments.forEach(dept => {
        const stat = departmentStats.get(dept.id);
        if (stat) {
          floorStats.set(dept.id, stat);
        }
      });
      grouped.set(floor.id, floorStats);
    });
    return grouped;
  }, [departmentStats]);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sliding Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-[500px] bg-background border-l shadow-2xl z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b bg-muted/50">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">📊 Detailed Statistics</h2>
              <Button variant="ghost" size="sm" onClick={onClose}>
                ✕ Close
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Current time: {currentTime} • {currentDay}
            </p>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* TRANSFER HISTORY SECTION */}
            {(completedTransfers.length > 0 || activeeTransfers.length > 0) && (
              <div className="mb-6">
                <div className="mb-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    🚑 Transfer History
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Patients transferred between hospitals
                  </p>
                </div>

                <Card className="border-purple-500 bg-purple-50/50 dark:bg-purple-900/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>Transfer Summary</span>
                      <div className="flex gap-2">
                        {activeeTransfers.length > 0 && (
                          <Badge className="bg-red-600 text-white animate-pulse">
                            🚑 {activeeTransfers.length} active
                          </Badge>
                        )}
                        <Badge className="bg-purple-600 text-white">
                          ✅ {completedTransfers.length} complet
                        </Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {/* Active transfers */}
                    {activeeTransfers.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-red-600 dark:text-red-400">
                          🚨 Active Transfers:
                        </div>
                        {activeeTransfers.map((transfer, idx) => (
                          <div
                            key={`${transfer.id}-${transfer.transferTo || 'unknown'}-${idx}`}
                            className="p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-500 animate-pulse"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-semibold">{transfer.name}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  <div>{transfer.transferReason}</div>
                                  {transfer.transferDistance && transfer.transferDurationMinutes && (
                                    <div className="text-xs mt-0.5 text-blue-600 dark:text-blue-400">
                                      🚗 {transfer.transferDistance.toFixed(1)}km • ⏱️ {transfer.transferDurationMinutes}min
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Badge className="bg-red-600 text-white text-xs">
                                {Math.round((transfer.transferProgress || 0) * 100)}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                        <Separator />
                      </div>
                    )}

                    {/* Completed transfers */}
                    {completedTransfers.length > 0 && (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        <div className="text-xs font-semibold text-green-600 dark:text-green-400">
                          ✅ Transferuri Complete ({completedTransfers.length}):
                        </div>
                        {completedTransfers.slice().reverse().map((transfer, idx) => (
                          <div
                            key={`${transfer.patientId}-${idx}`}
                            className="p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-500"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-semibold">{transfer.patientName}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  <div>🏥 {transfer.fromHospital} → {transfer.toHospital}</div>
                                  <div className="text-xs mt-0.5">📋 {transfer.reason}</div>
                                  {transfer.distance && transfer.durationMinutes && (
                                    <div className="text-xs mt-0.5 text-blue-600 dark:text-blue-400">
                                      🚗 {transfer.distance.toFixed(1)}km • ⏱️ {transfer.durationMinutes}min
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {transfer.time}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {completedTransfers.length === 0 && activeeTransfers.length === 0 && (
                      <div className="text-xs text-muted-foreground text-center py-4">
                        No transfers yet
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {building.floors.map((floor, idx) => {
              const floorStats = statsByFloor.get(floor.id);
              if (!floorStats || floorStats.size === 0) return null;

              return (
                <div key={floor.id}>
                  <div className="mb-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      🏢 {floor.name}
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {Array.from(floorStats.entries()).map(([deptId, stat]) => (
                      <Card key={deptId} className={stat.isBlocked ? 'border-red-500 bg-red-50/50 dark:bg-red-900/20' : ''}>
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-base">{stat.name}</CardTitle>
                              <p className="text-xs text-muted-foreground mt-1">{stat.type}</p>
                            </div>
                            {stat.isBlocked && (
                              <Badge variant="destructive" className="text-xs">🚫 BLOCKED</Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          {/* Occupancy */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2 bg-muted rounded-lg">
                              <div className="text-xs text-muted-foreground">Current Occupancy</div>
                              <div className="text-lg font-bold">
                                {stat.currentOccupancy} / {stat.capacity}
                              </div>
                            </div>
                            <div className="p-2 bg-muted rounded-lg">
                              <div className="text-xs text-muted-foreground">Usage</div>
                              <div className={`text-lg font-bold ${
                                stat.utilizationPercent > 80 ? 'text-red-600' :
                                stat.utilizationPercent > 50 ? 'text-yellow-600' :
                                'text-green-600'
                              }`}>
                                {stat.utilizationPercent.toFixed(0)}%
                              </div>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                stat.utilizationPercent > 80 ? 'bg-red-500' :
                                stat.utilizationPercent > 50 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(stat.utilizationPercent, 100)}%` }}
                            />
                          </div>

                          <Separator />

                          {/* Statistics Grid */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Peak today:</span>
                              <Badge variant="outline" className="text-xs">{stat.peakOccupancy} @ {stat.peakTime}</Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total visits:</span>
                              <Badge variant="outline" className="text-xs">{stat.totalVisitsToday}</Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Patients served:</span>
                              <Badge variant="outline" className="text-xs">{stat.patientsServedToday}</Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Average duration:</span>
                              <Badge variant="outline" className="text-xs">{Math.round(stat.avgDurationMinutes)}m</Badge>
                            </div>
                          </div>

                          <Separator />

                          {/* Total Blocked Time - ALWAYS VISIBLE FOR ALL DEPARTMENTS */}
                          <div className={`p-3 rounded-lg border ${
                            stat.totalBlockedMinutes > 0
                              ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'
                              : 'bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700'
                          }`}>
                            <div className="flex justify-between items-center">
                              <div>
                                <div className={`text-xs font-semibold mb-1 ${
                                  stat.totalBlockedMinutes > 0
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-gray-600 dark:text-gray-400'
                                }`}>
                                  {stat.totalBlockedMinutes > 0 ? '🚫 Total Blocked Time Today' : '✅ Total Blocked Time Today'}
                                </div>
                                <div className={`text-2xl font-bold ${
                                  stat.totalBlockedMinutes > 0
                                    ? 'text-red-700 dark:text-red-300'
                                    : 'text-green-700 dark:text-green-400'
                                }`}>
                                  {stat.totalBlockedMinutes === 0
                                    ? '0 min'
                                    : stat.totalBlockedHours >= 1
                                      ? `${stat.totalBlockedHours.toFixed(1)} ore`
                                      : `${Math.round(stat.totalBlockedMinutes)} min`
                                  }
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Debug: {stat.totalBlockedMinutes} minute acumulate
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground">Detalii</div>
                                <div className={`text-sm font-semibold ${
                                  stat.totalBlockedMinutes > 0
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-green-600 dark:text-green-400'
                                }`}>
                                  {Math.floor(stat.totalBlockedHours)}h {Math.round((stat.totalBlockedHours % 1) * 60)}m
                                </div>
                              </div>
                            </div>
                            {stat.totalBlockedMinutes > 0 && (
                              <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-800">
                                <div className="text-xs text-red-600 dark:text-red-400">
                                  ⚠️ Department was blocked (at maximum capacity) during the day
                                </div>
                              </div>
                            )}
                            {stat.totalBlockedMinutes === 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                <div className="text-xs text-green-600 dark:text-green-400">
                                  ✓ Never blocked today
                                </div>
                              </div>
                            )}
                          </div>

                          {/* DEATH STATISTICS - ALWAYS VISIBLE */}
                          {isStressTestMode && (
                            <>
                              <Separator />
                              <div className={`p-3 rounded-lg border ${
                                stat.totalDeaths > 0
                                  ? 'bg-black dark:bg-gray-900 border-red-600'
                                  : 'bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700'
                              }`}>
                                <div className="flex justify-between items-center">
                                  <div>
                                    <div className={`text-xs font-semibold mb-1 ${
                                      stat.totalDeaths > 0
                                        ? 'text-red-600 dark:text-red-400'
                                        : 'text-gray-600 dark:text-gray-400'
                                    }`}>
                                      {stat.totalDeaths > 0 ? '💀 DEATHS IN DEPARTMENT' : '✅ No Deaths'}
                                    </div>
                                    <div className={`text-3xl font-bold ${
                                      stat.totalDeaths > 0
                                        ? 'text-red-700 dark:text-red-300'
                                        : 'text-green-700 dark:text-green-400'
                                    }`}>
                                      {stat.totalDeaths}
                                    </div>
                                    {stat.totalDeaths > 0 && (
                                      <div className="text-xs text-red-500 mt-1 space-y-0.5">
                                        {stat.deathsFromDelay > 0 && (
                                          <div>⏰ {stat.deathsFromDelay} due to delay</div>
                                        )}
                                        {stat.deathsNatural > 0 && (
                                          <div>💔 {stat.deathsNatural} due to disease severity</div>
                                        )}
                                        {stat.deathsDuringTreatment > 0 && (
                                          <div>🏥 {stat.deathsDuringTreatment} during treatment</div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  {stat.totalDeaths > 0 && (
                                    <div className="text-6xl">☠️</div>
                                  )}
                                </div>
                                {stat.totalDeaths > 0 && (
                                  <div className="mt-2 pt-2 border-t border-red-600">
                                    <div className="text-xs text-red-600 dark:text-red-400 font-semibold">
                                      ⚠️ WARNING: Deaths occurred in this department!
                                    </div>
                                  </div>
                                )}
                              </div>
                            </>
                          )}

                          {stat.totalWaitingQueue > 0 && (
                            <>
                              <Separator />
                              <div className="space-y-2">
                                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-semibold">⏳ Waiting:</span>
                                    <Badge className="bg-yellow-500">{stat.totalWaitingQueue}</Badge>
                                  </div>
                                  {/* List of patients in queue */}
                                  {isStressTestMode && queueManager && (() => {
                                    const queueState = queueManager.getQueueState(deptId);
                                    if (queueState && queueState.queue.length > 0) {
                                      return (
                                        <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                                          {queueState.queue.map((patientInfo, idx) => (
                                            <div key={idx} className={`text-xs p-1.5 rounded flex justify-between items-center ${
                                              patientInfo.isDead
                                                ? 'bg-black dark:bg-gray-900 border border-red-600'
                                                : 'bg-white dark:bg-gray-800'
                                            }`}>
                                              <div className="flex flex-col">
                                                <span className={`font-semibold ${patientInfo.isDead ? 'text-red-600 dark:text-red-400' : ''}`}>
                                                  {patientInfo.isDead && '💀 '}
                                                  {patientInfo.patientName}
                                                  {patientInfo.isDead && ' (DECEDAT)'}
                                                </span>
                                                {patientInfo.adjustedMortalityRisk !== undefined && (
                                                  <span className={`text-xs ${
                                                    patientInfo.adjustedMortalityRisk >= 50 ? 'text-red-600' :
                                                    patientInfo.adjustedMortalityRisk >= 20 ? 'text-orange-600' :
                                                    patientInfo.adjustedMortalityRisk >= 5 ? 'text-yellow-600' :
                                                    'text-green-600'
                                                  }`}>
                                                    Risc: {patientInfo.adjustedMortalityRisk?.toFixed(1)}%
                                                  </span>
                                                )}
                                              </div>
                                              <span className={`text-muted-foreground ${patientInfo.isDead ? 'text-red-500' : ''}`}>
                                                {patientInfo.waitingMinutes > 0 ? `${patientInfo.waitingMinutes}m waiting` : 'Just arrived'}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>

                                {/* Blocked time tracking */}
                                {isStressTestMode && queueManager && (() => {
                                  const queueState = queueManager.getQueueState(deptId);
                                  if (queueState && queueState.totalBlockedMinutes > 0) {
                                    return (
                                      <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                        <div className="text-xs">
                                          <span className="font-semibold text-red-600 dark:text-red-400">
                                            🚫 Total blocked time: {Math.round(queueState.totalBlockedMinutes)} minute
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {idx < building.floors.length - 1 && <Separator className="my-6" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
