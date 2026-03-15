'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Floor, Department } from '@/lib/simulation/types/building';
import type { QueueManager } from '@/lib/simulation/data/queueManagerClass';

interface IsometricFloorViewProps {
  floor: Floor;
  selectedDepartment: string | null;
  onDepartmentClick: (departmentId: string) => void;
  currentTime: string;
  currentDay: string;
  activePatients: { patientId: string; from: string; to: string; progress: number }[];
  totalEntrances: number;
  totalExits: number;
  currentSeconds: number;
  customCapacities?: { [deptId: string]: { capacity: number; processingTimeMinutes: number } };
  queueManager?: QueueManager;
  queueUpdateTrigger?: number;
  departmentOccupancies?: Map<string, {
    occupied: number;
    capacity: number;
    isBlocked: boolean;
    queueLength: number;
  }>;
}

// Beautiful color palette for all room types (shadcn-inspired)
const DEPARTMENT_COLORS: { [key: string]: string } = {
  // Ground floor - Reception & Emergency
  'reception': '#3b82f6',           // Blue
  'triage': '#ef4444',              // Red
  'emergency': '#dc2626',           // Dark Red
  'waiting-1': '#404040',           // Dark gray
  'pharmacy': '#06b6d4',            // Cyan
  'info': '#505050',                // Gray

  // Floor 1 - Consultations & Diagnostics
  'consultation-1': '#10b981',      // Green
  'consultation-2': '#22c55e',      // Light Green
  'consultation-3': '#14b8a6',      // Teal
  'lab': '#f59e0b',                 // Orange
  'xray': '#8b5cf6',                // Purple
  'ultrasound': '#a78bfa',          // Light Purple
  'waiting-2': '#404040',           // Dark gray

  // Floor 2 - Specialized
  'cardiology': '#ec4899',          // Pink
  'neurology': '#f43f5e',           // Rose
  'orthopedics': '#fb923c',         // Orange
  'treatment-1': '#84cc16',         // Lime
  'treatment-2': '#a3e635',         // Light Lime
  'recovery': '#4ade80',            // Green

  // Floor 3 - Surgery & ICU
  'surgery-1': '#7c3aed',           // Violet
  'surgery-2': '#6366f1',           // Indigo
  'icu': '#dc2626',                 // Red (critical)
  'preop': '#8b5cf6',               // Purple
  'postop': '#a78bfa',              // Light Purple
  'sterilization': '#06b6d4',       // Cyan
};

export default function IsometricFloorView({
  floor,
  selectedDepartment,
  onDepartmentClick,
  currentTime,
  currentDay,
  activePatients,
  totalEntrances,
  totalExits,
  currentSeconds,
  departmentOccupancies,
}: IsometricFloorViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [camera, setCamera] = useState({ offsetX: 0, offsetY: 0, zoom: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Special points
  const SPECIAL_POINTS = useMemo(() => ({
    ENTRANCE: { x: 25, y: 300 },
    EXIT: { x: 775, y: 300 },
    LIFT: { x: 400, y: 550 },
  }), []);

  // Convert 2D to isometric coordinates
  const toIso = (x: number, y: number) => {
    return {
      x: (x - y) * 0.866,
      y: (x + y) * 0.5,
    };
  };

  // Adjust color brightness
  const adjustColor = (color: string, amount: number) => {
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  };

  // Draw isometric room/chamber with realistic 3D effect and room details
  const drawIsometricBox = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    depth: number,
    color: string,
    isSelected: boolean,
    glowIntensity: number = 0
  ) => {
    // Enhanced gradient for realistic room lighting
    const gradient = ctx.createRadialGradient(
      toIso(x + width / 2, y + height / 2).x,
      toIso(x + width / 2, y + height / 2).y,
      0,
      toIso(x + width / 2, y + height / 2).x,
      toIso(x + width / 2, y + height / 2).y,
      width * 1.2
    );

    if (glowIntensity > 0) {
      // Active room with warm glow
      gradient.addColorStop(0, adjustColor(color, 50 + glowIntensity * 20));
      gradient.addColorStop(0.5, adjustColor(color, 20));
      gradient.addColorStop(1, adjustColor(color, -10));
    } else {
      // Normal room lighting
      gradient.addColorStop(0, adjustColor(color, 30));
      gradient.addColorStop(0.6, color);
      gradient.addColorStop(1, adjustColor(color, -20));
    }

    // Enhanced shadow for depth
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = isSelected ? 25 : 15;
    ctx.shadowOffsetX = 8;
    ctx.shadowOffsetY = 8;

    ctx.fillStyle = isSelected ? '#60a5fa' : gradient;
    ctx.strokeStyle = isSelected ? '#2563eb' : adjustColor(color, -40);
    ctx.lineWidth = isSelected ? 3.5 : 2.5;

    // Top face (floor of the room)
    ctx.beginPath();
    const top1 = toIso(x, y);
    const top2 = toIso(x + width, y);
    const top3 = toIso(x + width, y + height);
    const top4 = toIso(x, y + height);
    ctx.moveTo(top1.x, top1.y);
    ctx.lineTo(top2.x, top2.y);
    ctx.lineTo(top3.x, top3.y);
    ctx.lineTo(top4.x, top4.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Right wall
    const rightGradient = ctx.createLinearGradient(top2.x, top2.y, top2.x, top2.y + depth);
    rightGradient.addColorStop(0, isSelected ? '#3b82f6' : adjustColor(color, -35));
    rightGradient.addColorStop(1, isSelected ? '#1e40af' : adjustColor(color, -55));

    ctx.fillStyle = rightGradient;
    ctx.strokeStyle = isSelected ? '#1e3a8a' : adjustColor(color, -60);
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(top2.x, top2.y);
    ctx.lineTo(top2.x, top2.y + depth);
    ctx.lineTo(top3.x, top3.y + depth);
    ctx.lineTo(top3.x, top3.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Left wall
    const leftGradient = ctx.createLinearGradient(top4.x, top4.y, top4.x, top4.y + depth);
    leftGradient.addColorStop(0, isSelected ? '#1e40af' : adjustColor(color, -55));
    leftGradient.addColorStop(1, isSelected ? '#1e3a8a' : adjustColor(color, -75));

    ctx.fillStyle = leftGradient;
    ctx.strokeStyle = isSelected ? '#172554' : adjustColor(color, -80);
    ctx.beginPath();
    ctx.moveTo(top4.x, top4.y);
    ctx.lineTo(top4.x, top4.y + depth);
    ctx.lineTo(top3.x, top3.y + depth);
    ctx.lineTo(top3.x, top3.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  // Draw department with unique color and queue visualization
  const drawDepartment = (
    ctx: CanvasRenderingContext2D,
    dept: Department,
    offsetX: number,
    offsetY: number,
    isSelected: boolean,
    occupiedSlots: number,
    isBlocked: boolean,
    capacity: number,
    queueLength: number
  ) => {
    const x = dept.position.x + offsetX;
    const y = dept.position.y + offsetY;
    const width = dept.size?.width || 80;
    const height = dept.size?.height || 60;
    const depth = 40;

    // Get unique color for this department
    const baseColor = DEPARTMENT_COLORS[dept.id] || dept.color || '#94a3b8';

    // Add glow effect if busy
    const utilization = capacity > 0 ? occupiedSlots / capacity : 0;
    const glowIntensity = utilization;

    drawIsometricBox(ctx, x, y, width, height, depth, baseColor, isSelected, glowIntensity);

    // Draw department name with shadow
    const center = toIso(x + width / 2, y + height / 2);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 3;
    ctx.fillStyle = '#000000'; // Black text
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(dept.name, center.x, center.y - 10);

    // Draw occupancy info
    ctx.font = '11px sans-serif';
    const statusColor = isBlocked ? '#fee2e2' : utilization > 0.8 ? '#fef3c7' : '#d1fae5';
    ctx.fillStyle = statusColor;
    ctx.fillText(`${occupiedSlots}/${capacity}`, center.x, center.y + 4);

    // Draw utilization bar
    const barWidth = width * 0.6;
    const barHeight = 4;
    const barX = center.x - barWidth / 2;
    const barY = center.y + 18;

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const fillColor = isBlocked ? '#ef4444' : utilization > 0.8 ? '#f59e0b' : '#10b981';
    ctx.fillStyle = fillColor;
    ctx.fillRect(barX, barY, barWidth * utilization, barHeight);

    // Draw queue visualization if present
    if (queueLength > 0) {
      const queueStartX = x + width + 10;
      const queueStartY = y + height / 2;

      for (let i = 0; i < Math.min(queueLength, 10); i++) {
        const queuePos = toIso(queueStartX + (i % 3) * 12, queueStartY + Math.floor(i / 3) * 12);

        // Draw waiting patient
        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(queuePos.x, queuePos.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Queue count badge
      if (queueLength > 10) {
        const badgePos = toIso(queueStartX + 15, queueStartY + 40);
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(badgePos.x, badgePos.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText(`+${queueLength - 10}`, badgePos.x, badgePos.y);
      }
    }

    ctx.shadowColor = 'transparent';
  };

  // Draw special point with icon
  const drawSpecialPoint = (
    ctx: CanvasRenderingContext2D,
    point: { x: number; y: number },
    label: string,
    color: string,
    offsetX: number,
    offsetY: number
  ) => {
    const iso = toIso(point.x + offsetX, point.y + offsetY);

    // Draw glow
    const gradient = ctx.createRadialGradient(iso.x, iso.y, 5, iso.x, iso.y, 25);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(iso.x, iso.y, 25, 0, Math.PI * 2);
    ctx.fill();

    // Draw circle with shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = color;
    ctx.strokeStyle = adjustColor(color, -40);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(iso.x, iso.y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Draw label
    ctx.fillStyle = '#000000'; // Black text
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, iso.x, iso.y);
  };

  // Draw movement path line with animation
  const drawMovementPath = (
    ctx: CanvasRenderingContext2D,
    fromPos: { x: number; y: number },
    toPos: { x: number; y: number },
    progress: number,
    color: string
  ): { x: number; y: number } => {
    // Draw simple direct path
    ctx.strokeStyle = adjustColor(color, -40);
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(fromPos.x, fromPos.y);
    ctx.lineTo(toPos.x, toPos.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Draw traveled portion (brighter)
    const currentX = fromPos.x + (toPos.x - fromPos.x) * progress;
    const currentY = fromPos.y + (toPos.y - fromPos.y) * progress;

    const gradient = ctx.createLinearGradient(fromPos.x, fromPos.y, currentX, currentY);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, color);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(fromPos.x, fromPos.y);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();

    return { x: currentX, y: currentY };
  };

  // Draw moving patient - ULTRA SIMPLE, just pure color circles
  const drawPatient = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    patientId: string,
    progress: number
  ) => {
    // FORCE shadow to be completely off
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    const patientRadius = 10;

    // Simple solid circle - NO gradients, NO complexity
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, patientRadius, 0, Math.PI * 2);
    ctx.fill();

    // Progress ring (thin, subtle)
    if (progress > 0.05 && progress < 0.95) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(x, y, patientRadius + 3, -Math.PI / 2, -Math.PI / 2 + (progress * Math.PI * 2), false);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Patient ID
    const idNum = patientId.replace(/\D/g, '').slice(-2);
    ctx.fillStyle = '#000000'; // Black text
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(idNum, x, y);

    // Ensure shadow stays off for next drawing
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  };

  // Draw hospital corridors connecting rooms (updated positions)
  const drawCorridors = (
    ctx: CanvasRenderingContext2D,
    offsetX: number,
    offsetY: number
  ) => {
    ctx.strokeStyle = '#555555'; // Dark gray corridor color
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.5;

    // MAIN HORIZONTAL CORRIDOR (connects all three wings)
    const mainCorridorY = 100;
    const corridorStart = toIso(20 + offsetX, mainCorridorY + offsetY);
    const corridorEnd = toIso(470 + offsetX, mainCorridorY + offsetY);
    ctx.beginPath();
    ctx.moveTo(corridorStart.x, corridorStart.y);
    ctx.lineTo(corridorEnd.x, corridorEnd.y);
    ctx.stroke();

    // VERTICAL CORRIDORS connecting rooms to main hallway
    const leftCorridorX = 80;   // Left wing corridor
    const centerCorridorX = 245; // Center wing corridor
    const rightCorridorX = 405;  // Right wing corridor

    [leftCorridorX, centerCorridorX, rightCorridorX].forEach(x => {
      const top = toIso(x + offsetX, 20 + offsetY);
      const bottom = toIso(x + offsetX, 280 + offsetY);
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(bottom.x, bottom.y);
      ctx.stroke();
    });

    ctx.globalAlpha = 1;
  };

  // Draw walls with transparency based on camera zoom and position
  const drawWalls = (
    ctx: CanvasRenderingContext2D,
    dept: Department,
    offsetX: number,
    offsetY: number,
    isNearCamera: boolean
  ) => {
    const x = dept.position.x + offsetX;
    const y = dept.position.y + offsetY;
    const width = dept.size?.width || 80;
    const height = dept.size?.height || 60;
    const wallHeight = 35;

    // Calculate wall transparency based on camera zoom and proximity
    let wallAlpha = 0.6;
    if (isNearCamera || camera.zoom > 1.5) {
      wallAlpha = Math.max(0.1, 0.6 - (camera.zoom - 1) * 0.3);
    }

    ctx.globalAlpha = wallAlpha;
    ctx.strokeStyle = '#64748b'; // Gray walls
    ctx.lineWidth = 2;

    // Front wall
    const topLeft = toIso(x, y);
    const topRight = toIso(x + width, y);
    ctx.beginPath();
    ctx.moveTo(topLeft.x, topLeft.y);
    ctx.lineTo(topLeft.x, topLeft.y + wallHeight);
    ctx.moveTo(topRight.x, topRight.y);
    ctx.lineTo(topRight.x, topRight.y + wallHeight);
    ctx.stroke();

    // Side walls
    const bottomLeft = toIso(x, y + height);
    const bottomRight = toIso(x + width, y + height);
    ctx.beginPath();
    ctx.moveTo(bottomLeft.x, bottomLeft.y);
    ctx.lineTo(bottomLeft.x, bottomLeft.y + wallHeight);
    ctx.moveTo(bottomRight.x, bottomRight.y);
    ctx.lineTo(bottomRight.x, bottomRight.y + wallHeight);
    ctx.stroke();

    ctx.globalAlpha = 1;
  };

  // Get position for department or special point
  const getPosition = (id: string): { x: number; y: number } | null => {
    if (id === 'entrance') return SPECIAL_POINTS.ENTRANCE;
    if (id === 'exit') return SPECIAL_POINTS.EXIT;
    if (id.startsWith('lift-')) return SPECIAL_POINTS.LIFT;

    const dept = floor.departments.find(d => d.id === id);
    if (!dept) return null;

    const width = dept.size?.width || 80;
    const height = dept.size?.height || 60;
    return {
      x: dept.position.x + width / 2,
      y: dept.position.y + height / 2,
    };
  };

  // Smooth easing functions for fluid animations
  const easeInOutCubic = (t: number): number => {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  const easeOutQuad = (t: number): number => {
    return 1 - (1 - t) * (1 - t);
  };

  // Interpolate with smooth easing
  const lerp = (start: number, end: number, t: number) => {
    const smoothT = easeInOutCubic(t);
    return start + (end - start) * smoothT;
  };

  // Main render function
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with dark gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGradient.addColorStop(0, '#1a1a1a'); // Dark gray
    bgGradient.addColorStop(1, '#0a0a0a'); // Almost black
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply camera transformations
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-canvas.width / 2 + camera.offsetX, -canvas.height / 2 + camera.offsetY);

    const offsetX = 100;
    const offsetY = 50;

    // Draw subtle grid
    ctx.strokeStyle = '#333333'; // Dark gray grid
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 800; i += 50) {
      const start = toIso(i + offsetX, 0 + offsetY);
      const end = toIso(i + offsetX, 600 + offsetY);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
    for (let i = 0; i < 600; i += 50) {
      const start = toIso(0 + offsetX, i + offsetY);
      const end = toIso(800 + offsetX, i + offsetY);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Draw hospital corridors
    drawCorridors(ctx, offsetX, offsetY);

    // Draw special points
    drawSpecialPoint(ctx, SPECIAL_POINTS.ENTRANCE, '🚪', '#10b981', offsetX, offsetY);
    drawSpecialPoint(ctx, SPECIAL_POINTS.EXIT, '🚪', '#ef4444', offsetX, offsetY);
    drawSpecialPoint(ctx, SPECIAL_POINTS.LIFT, '🔼', '#3b82f6', offsetX, offsetY);

    // Draw departments
    floor.departments.forEach((dept) => {
      const occupancy = departmentOccupancies?.get(dept.id);
      const occupiedSlots = occupancy?.occupied ?? 0;
      const capacity = occupancy?.capacity ?? (dept.capacity ?? 10);
      const isBlocked = occupancy?.isBlocked ?? false;
      const queueLength = occupancy?.queueLength ?? 0;

      drawDepartment(
        ctx,
        dept,
        offsetX,
        offsetY,
        dept.id === selectedDepartment,
        occupiedSlots,
        isBlocked,
        capacity,
        queueLength
      );

      // Draw walls with transparency (after department floor)
      const deptCenter = {
        x: dept.position.x + (dept.size?.width || 80) / 2,
        y: dept.position.y + (dept.size?.height || 60) / 2
      };
      const isNearCamera = camera.zoom > 1.2;
      drawWalls(ctx, dept, offsetX, offsetY, isNearCamera);
    });

    // Draw movement paths and patients
    // RESET all shadows completely before drawing patients
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    activePatients.forEach((movement, index) => {
      const fromPos = getPosition(movement.from);
      const toPos = getPosition(movement.to);

      if (fromPos && toPos) {
        const isoFrom = toIso(fromPos.x + offsetX, fromPos.y + offsetY);
        const isoTo = toIso(toPos.x + offsetX, toPos.y + offsetY);

        // Generate unique color for each patient
        const hue = (parseInt(movement.patientId.replace(/\D/g, '')) * 137) % 360;
        const color = `hsl(${hue}, 75%, 55%)`;

        // Draw path line
        const currentPos = drawMovementPath(ctx, isoFrom, isoTo, movement.progress, color);

        // Draw patient at current position
        drawPatient(ctx, currentPos.x, currentPos.y, color, movement.patientId, movement.progress);
      }
    });

    // Draw enhanced stats overlay with glass effect
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 15;
    const statsHeight = 105;
    ctx.fillRect(10, 10, 220, statsHeight);
    ctx.shadowBlur = 0;

    // Stats border
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, 220, statsHeight);

    // Stats content
    ctx.fillStyle = '#ffffff'; // Keep stats text white for contrast
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`🏥 ${floor.name}`, 20, 32);

    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#cccccc'; // Light gray for secondary text
    ctx.fillText(`⏰ ${currentTime}`, 20, 52);
    ctx.fillText(`👥 Entered: ${totalEntrances}`, 20, 72);
    ctx.fillText(`🚪 Exited: ${totalExits}`, 20, 92);

    // Active patients indicator
    if (activePatients.length > 0) {
      ctx.fillStyle = '#10b981';
      ctx.fillText(`🔄 In motion: ${activePatients.length}`, 20, 112);
    }

    ctx.restore();
  }, [floor, selectedDepartment, currentTime, activePatients, totalEntrances, totalExits, camera, departmentOccupancies, currentSeconds, currentDay, SPECIAL_POINTS]);

  // Mouse handlers for camera control
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2 || e.ctrlKey) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - camera.offsetX, y: e.clientY - camera.offsetY });
      e.preventDefault();
    } else {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - canvas.width / 2) / camera.zoom + canvas.width / 2 - camera.offsetX;
      const y = (e.clientY - rect.top - canvas.height / 2) / camera.zoom + canvas.height / 2 - camera.offsetY;

      const offsetX = 100;
      const offsetY = 50;

      for (const dept of floor.departments) {
        const deptX = dept.position.x + offsetX;
        const deptY = dept.position.y + offsetY;
        const width = dept.size?.width || 80;
        const height = dept.size?.height || 60;

        const iso = toIso(deptX + width / 2, deptY + height / 2);
        const distance = Math.sqrt((x - iso.x) ** 2 + (y - iso.y) ** 2);

        if (distance < 50) {
          onDepartmentClick(dept.id);
          return;
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setCamera({
        ...camera,
        offsetX: e.clientX - dragStart.x,
        offsetY: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setCamera({
      ...camera,
      zoom: Math.max(0.5, Math.min(2.5, camera.zoom * delta)),
    });
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={1400}
        height={800}
        className="border-2 border-gray-300 rounded-xl shadow-2xl bg-gradient-to-br from-slate-50 to-slate-100 cursor-move w-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      />
      <div className="absolute bottom-3 right-3 bg-slate-900/90 text-white text-xs px-3 py-2 rounded-lg backdrop-blur-sm border border-slate-700">
        🖱️ Drag dreapta/Ctrl | 🔍 Scroll zoom | 📐 Zoom: {camera.zoom.toFixed(1)}x
      </div>
      <button
        onClick={() => setCamera({ offsetX: 0, offsetY: 0, zoom: 1 })}
        className="absolute top-3 right-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg transition-all hover:shadow-xl"
      >
        🔄 Reset Camera
      </button>
    </div>
  );
}
