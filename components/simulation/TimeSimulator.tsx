'use client';

import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TimeSimulatorProps {
  currentTime: string;
  currentDay: string;
  onTimeChange: (time: string) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  totalEntrances: number;
  totalExits: number;
  currentSeconds: number;
  onSecondsChange: (seconds: number | ((prev: number) => number)) => void;
  endTime?: string; // Optional end time (default 20:00)
}

export default function TimeSimulator({
  currentTime,
  currentDay,
  onTimeChange,
  isPlaying,
  onPlayPause,
  speed,
  onSpeedChange,
  totalEntrances,
  totalExits,
  currentSeconds,
  onSecondsChange,
  endTime = '20:00', // Default end time
}: TimeSimulatorProps) {
  // Auto-advance time with SECOND-LEVEL precision for smooth animations
  useEffect(() => {
    if (!isPlaying) return;

    // Parse end time to seconds
    const [endH, endM] = endTime.split(':').map(Number);
    const maxSeconds = (endH * 60 + endM) * 60;

    // Dynamic frame rate based on speed for performance
    // Low speed = higher FPS for smooth animation
    // High speed = lower FPS but bigger jumps
    const frameRate = speed <= 10 ? 20 : speed <= 30 ? 10 : 5;
    const msPerFrame = 1000 / frameRate;

    const interval = setInterval(() => {
      onSecondsChange((prevSeconds) => {
        const [hours, minutes] = currentTime.split(':').map(Number);
        const totalSeconds = (hours * 60 + minutes) * 60 + prevSeconds;

        // Calculate seconds per tick based on speed and frame rate
        const secondsPerTick = speed / frameRate;
        const newTotalSeconds = totalSeconds + secondsPerTick;

        if (newTotalSeconds >= maxSeconds) {
          return prevSeconds; // Stop at end time
        }

        // Round to avoid floating point accumulation errors
        const roundedTotalSeconds = Math.round(newTotalSeconds * 100) / 100;
        const newSeconds = Math.floor(roundedTotalSeconds % 60);
        const totalMinutes = Math.floor(roundedTotalSeconds / 60);
        const newMinutes = totalMinutes % 60;
        const newHours = Math.floor(totalMinutes / 60);

        // Update time only when minute changes
        if (totalMinutes !== hours * 60 + minutes) {
          const newTime = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
          onTimeChange(newTime);
        }

        // Return only the fractional seconds part (0-59)
        return roundedTotalSeconds % 60;
      });
    }, msPerFrame);

    return () => clearInterval(interval);
  }, [isPlaying, currentTime, speed, onTimeChange, onSecondsChange, endTime]);

  const handleTimeSkip = (minutes: number) => {
    const [hours, mins] = currentTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    // Calculate min/max bounds dynamically
    const minTotalMins = Math.max(0, (endH * 60 + endM) - 13 * 60); // Start 13 hours before end
    const maxTotalMins = endH * 60 + endM;

    let totalMins = hours * 60 + mins + minutes;
    totalMins = Math.max(minTotalMins, Math.min(totalMins, maxTotalMins));

    const newHours = Math.floor(totalMins / 60);
    const newMins = totalMins % 60;
    onTimeChange(`${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`);
    onSecondsChange(0); // Reset seconds when skipping
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Control Timp</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-2xl font-bold font-mono">
              {currentTime}
              <span className="text-base text-muted-foreground">
                :{String(Math.floor(currentSeconds)).padStart(2, '0')}
              </span>
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              {isPlaying ? '▶ Running' : '⏸ Pause'} • {speed}x speed
            </span>
          </div>
          <Badge variant="outline">{currentDay}</Badge>
        </div>

        <div className="flex gap-2">
          <Button onClick={onPlayPause} className="flex-1">
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </Button>
        </div>

        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => handleTimeSkip(-60)}>
            -1h
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleTimeSkip(-15)}>
            -15m
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleTimeSkip(15)}>
            +15m
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleTimeSkip(60)}>
            +1h
          </Button>
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Simulation Speed</div>
          <div className="grid grid-cols-5 gap-1">
            {[1, 5, 10, 30, 60].map((s) => (
              <Button
                key={s}
                size="sm"
                variant={speed === s ? 'default' : 'outline'}
                onClick={() => onSpeedChange(s)}
                className="text-xs"
              >
                {s}x
              </Button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground text-center mt-1">
            {speed === 1 && '🐢 Real time (1 min = 1 min real)'}
            {speed === 5 && '🚶 1 simulated min = 12 real sec'}
            {speed === 10 && '🏃 1 simulated min = 6 real sec'}
            {speed === 30 && '🚗 1 simulated min = 2 real sec'}
            {speed === 60 && '🚀 1 simulated min = 1 real sec'}
          </div>
        </div>

        <div className="pt-2 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Entered:</span>
            <Badge variant="default" className="bg-green-500">{totalEntrances}</Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Exited:</span>
            <Badge variant="default" className="bg-red-500">{totalExits}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
