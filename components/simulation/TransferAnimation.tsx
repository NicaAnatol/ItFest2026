'use client';

import { useEffect, useRef } from 'react';
import { Patient } from '@/lib/simulation/types/building';

interface Hospital {
  id: string;
  name: string;
  position: { x: number; y: number };
}

interface TransferAnimationProps {
  patients: Patient[];
  hospitals: Hospital[];
  camera: { x: number; y: number; zoom: number };
  currentTime: string;
  currentSeconds: number;
}

export default function TransferAnimation({ patients, hospitals, camera, currentTime, currentSeconds }: TransferAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Adjust color brightness (EXACTLY like IsometricFloorView)
  const adjustColor = (color: string, amount: number) => {
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply camera transform
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    // Calculate current time in seconds
    const [currHours, currMinutes] = currentTime.split(':').map(Number);
    const currTimeSeconds = (currHours * 60 + currMinutes) * 60 + currentSeconds;

    // Draw transfer animations based on TIME (like internal hospital movements)
    const transferringPatients = patients.filter(p => p.isTransferring && p.transferTo);

    transferringPatients.forEach(patient => {
      const fromHospital = hospitals.find(h => h.id === patient.currentHospitalId);

      // Check if patient is leaving the system (no target hospital)
      const isLeavingSystem = patient.transferTo === 'OUTSIDE_SYSTEM';
      const toHospital = isLeavingSystem ? null : hospitals.find(h => h.id === patient.transferTo);

      if (!fromHospital) return;

      // Calculate transfer progress based on TIME
      let transferStartSeconds;

      if (patient.transferStartTime) {
        const [startH, startM] = patient.transferStartTime.split(':').map(Number);
        transferStartSeconds = (startH * 60 + startM) * 60;
      } else {
        // Fallback to first visit time
        const firstVisit = patient.visits[0];
        if (!firstVisit) return;
        const [startH, startM] = firstVisit.startTime.split(':').map(Number);
        transferStartSeconds = (startH * 60 + startM) * 60;
      }

      // Transfer duration in simulation seconds (1 real minute = 60 simulation seconds)
      const transferDurationSeconds = (patient.transferDurationMinutes || 5) * 60;
      const transferEndSeconds = transferStartSeconds + transferDurationSeconds;

      // Check if we're in the transfer time window
      if (currTimeSeconds < transferStartSeconds || currTimeSeconds > transferEndSeconds) {
        return; // Not in transfer period
      }

      // Calculate progress (0 to 1)
      const elapsed = currTimeSeconds - transferStartSeconds;
      const progress = Math.min(1, Math.max(0, elapsed / transferDurationSeconds));

      // Hospital centers (adjusted for proper 3D isometric buildings)
      // Building dimensions match IsometricCityView
      const width = 200;
      const height = 160;
      const depth = 80;

      // Isometric helpers (match IsometricCityView)
      const toIso = (px: number, py: number) => ({
        x: (px - py) * 0.866,
        y: (px + py) * 0.5
      });

      // Center of building top face
      const fromIso = toIso(width / 2, height / 2);
      const startX = fromHospital.position.x + fromIso.x;
      const startY = fromHospital.position.y + fromIso.y;

      let endX, endY;

      if (isLeavingSystem) {
        // Patient leaves to the right edge of the screen (outside system)
        endX = 1600; // Canvas width
        endY = startY; // Keep same Y level
      } else if (toHospital) {
        const toIso2 = toIso(width / 2, height / 2);
        endX = toHospital.position.x + toIso2.x;
        endY = toHospital.position.y + toIso2.y;
      } else {
        return; // Invalid state
      }

      // Generate unique color for each patient (EXACTLY like IsometricFloorView)
      const hue = (parseInt(patient.id.replace(/\D/g, '')) * 137) % 360;
      const color = `hsl(${hue}, 75%, 55%)`;

      // Draw full path line with dashes (EXACTLY like IsometricFloorView)
      ctx.strokeStyle = isLeavingSystem ? 'rgba(239, 68, 68, 0.5)' : adjustColor(color, -40);
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // Draw traveled portion with gradient (EXACTLY like IsometricFloorView)
      const currentX = startX + (endX - startX) * progress;
      const currentY = startY + (endY - startY) * progress;

      const gradient = ctx.createLinearGradient(startX, startY, currentX, currentY);
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(1, isLeavingSystem ? '#ef4444' : color);

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(currentX, currentY);
      ctx.stroke();

      // Draw patient icon (EXACTLY like IsometricFloorView)
      // FORCE shadow to be completely off
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      const patientRadius = 10;

      // Simple solid circle
      ctx.fillStyle = isLeavingSystem ? '#ef4444' : color;
      ctx.beginPath();
      ctx.arc(currentX, currentY, patientRadius, 0, Math.PI * 2);
      ctx.fill();

      // Progress ring (thin, subtle)
      if (progress > 0.05 && progress < 0.95) {
        ctx.strokeStyle = isLeavingSystem ? '#ef4444' : color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(currentX, currentY, patientRadius + 3, -Math.PI / 2, -Math.PI / 2 + (progress * Math.PI * 2), false);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Patient ID (EXACTLY like IsometricFloorView)
      const idNum = patient.id.replace(/\D/g, '').slice(-2);
      ctx.fillStyle = '#000000'; // Black text
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(idNum, currentX, currentY);

      // Ensure shadow stays off for next drawing
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Draw label with distance and duration (optional info label)
      if (patient.transferDistance && patient.transferDurationMinutes && !isLeavingSystem) {
        const timeRemaining = Math.ceil((1 - progress) * patient.transferDurationMinutes);
        const labelText = `${patient.transferDistance.toFixed(1)}km • ${timeRemaining}min`;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(currentX - 50, currentY - 25, 100, 18);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 9px Inter, system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(labelText, currentX, currentY - 12);
      } else if (isLeavingSystem) {
        // Special label for leaving system
        ctx.fillStyle = 'rgba(220, 38, 38, 0.9)';
        ctx.fillRect(currentX - 40, currentY - 25, 80, 18);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 9px Inter, system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('🌍 LEAVING', currentX, currentY - 12);
      }
    });

    ctx.restore();
  }, [patients, hospitals, camera, currentTime, currentSeconds]);

  return (
    <canvas
      ref={canvasRef}
      width={1600}
      height={1000}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    />
  );
}
