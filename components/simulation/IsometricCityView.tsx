'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface Hospital {
  id: string;
  name: string;
  position: { x: number; y: number };
}

interface IsometricCityViewProps {
  hospitals: Hospital[];
  selectedHospitalId: string | null;
  onHospitalClick: (hospitalId: string) => void;
  onCameraChange?: (camera: { x: number; y: number; zoom: number }) => void;
  transferringPatients?: Patient[];
  currentTime?: string;
  currentSeconds?: number;
}

interface Patient {
  id: string;
  name: string;
  currentHospitalId?: string;
  isTransferring?: boolean;
  transferTo?: string;
  transferStartTime?: string;
  transferDurationMinutes?: number;
  transferDistance?: number;
}

// Constants to avoid magic numbers
const HOSPITAL_WIDTH = 180;
const HOSPITAL_HEIGHT = 140;
const GRID_SPACING = 100;
const CROSS_SIZE = 40;
const CROSS_THICKNESS = 10;

export default function IsometricCityView({
  hospitals,
  selectedHospitalId,
  onHospitalClick,
  onCameraChange,
  transferringPatients = [],
  currentTime = '08:00',
  currentSeconds = 0
}: IsometricCityViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredHospital, setHoveredHospital] = useState<string | null>(null);
  const staticLayerRef = useRef<HTMLCanvasElement | null>(null);

  // Special exit point for patients leaving the system
  const SYSTEM_EXIT_POINT = { x: 1450, y: 500 };

  // Camera state for panning
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);

  // Notify parent of camera changes
  useEffect(() => {
    if (onCameraChange) {
      onCameraChange(camera);
    }
  }, [camera, onCameraChange]);

  // Adjust color brightness (EXACTLY like IsometricFloorView)
  const adjustColor = useCallback((color: string, amount: number): string => {
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }, []);

  // Helper function to find hospital at given coordinates (accounting for camera)
  const getHospitalAtPoint = useCallback((canvasX: number, canvasY: number): Hospital | null => {
    // The canvas coordinates are already in screen space
    // We need to transform them to world space by reversing the camera transform
    // World coordinates = (screen - translation) / zoom
    const worldX = (canvasX - camera.x) / camera.zoom;
    const worldY = (canvasY - camera.y) / camera.zoom;

    // Check each hospital with isometric hitbox
    for (const hospital of hospitals) {
      const x = hospital.position.x;
      const y = hospital.position.y;

      // Building dimensions (MUST MATCH the drawing dimensions exactly)
      const width = 200;
      const height = 160;
      const depth = 80;

      // Isometric transformation (same as drawing)
      const toIso = (px: number, py: number) => ({
        x: (px - py) * 0.866,
        y: (px + py) * 0.5
      });

      // Calculate the 4 corners of the top face
      const top1 = { x: x + toIso(0, 0).x, y: y + toIso(0, 0).y };
      const top2 = { x: x + toIso(width, 0).x, y: y + toIso(width, 0).y };
      const top3 = { x: x + toIso(width, height).x, y: y + toIso(width, height).y };
      const top4 = { x: x + toIso(0, height).x, y: y + toIso(0, height).y };

      // Create a bounding box that includes the entire building + name label
      const minX = Math.min(top1.x, top2.x, top3.x, top4.x) - 20;
      const maxX = Math.max(top1.x, top2.x, top3.x, top4.x) + 20;
      const minY = Math.min(top1.y, top2.y, top3.y, top4.y) - 50; // Include name area above
      const maxY = Math.max(top1.y, top2.y, top3.y, top4.y) + depth + 20; // Include walls below

      if (worldX >= minX && worldX <= maxX &&
          worldY >= minY && worldY <= maxY) {
        return hospital;
      }
    }
    return null;
  }, [hospitals, camera]);

  // Draw static background layer (grid) only once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Increase canvas size for more hospitals
    const canvasWidth = 1600;
    const canvasHeight = 1000;

    // Create static layer if not exists
    if (!staticLayerRef.current) {
      staticLayerRef.current = document.createElement('canvas');
      staticLayerRef.current.width = canvasWidth;
      staticLayerRef.current.height = canvasHeight;

      const ctx = staticLayerRef.current.getContext('2d');
      if (ctx) {
        // Background - dark theme
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Draw grid (city streets) - only once
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = 1;
        for (let i = 0; i < canvasWidth; i += GRID_SPACING) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, canvasHeight);
          ctx.stroke();
        }
        for (let i = 0; i < canvasHeight; i += GRID_SPACING) {
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(canvasWidth, i);
          ctx.stroke();
        }
      }
    }
  }, []); // Only run once

  // Draw dynamic content (hospitals)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx || !staticLayerRef.current) return;

    // Clear and apply camera transform
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Copy static layer first (background grid)
    ctx.drawImage(staticLayerRef.current, 0, 0);

    // Apply camera transform AFTER drawing background
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    // Draw hospitals EXACTLY like departments (same style and proportions)
    hospitals.forEach(hospital => {
      const isSelected = hospital.id === selectedHospitalId;
      const isHovered = hospital.id === hoveredHospital;

      const x = hospital.position.x;
      const y = hospital.position.y;

      // Building dimensions (much larger than departments for city scale)
      const width = 200;
      const height = 160;
      const depth = 80;

      // Isometric transformation (same as departments)
      const toIso = (px: number, py: number) => ({
        x: (px - py) * 0.866,
        y: (px + py) * 0.5
      });

      // Choose base color based on state
      let baseColor: string;
      if (isSelected) {
        baseColor = '#10b981'; // Green
      } else if (isHovered) {
        baseColor = '#3b82f6'; // Blue
      } else {
        baseColor = '#6366f1'; // Indigo
      }

      // Helper to adjust color brightness (same as departments)
      const adjustColor = (hex: string, amount: number): string => {
        const num = parseInt(hex.slice(1), 16);
        const r = Math.max(0, Math.min(255, ((num >> 16) & 0xFF) + amount));
        const g = Math.max(0, Math.min(255, ((num >> 8) & 0xFF) + amount));
        const b = Math.max(0, Math.min(255, (num & 0xFF) + amount));
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
      };

      // Create gradient for top face (EXACTLY like departments)
      const topCenter = { x: x + toIso(width / 2, height / 2).x, y: y + toIso(width / 2, height / 2).y };
      const gradient = ctx.createRadialGradient(
        topCenter.x, topCenter.y, 0,
        topCenter.x, topCenter.y, width * 1.2
      );

      gradient.addColorStop(0, adjustColor(baseColor, 30));
      gradient.addColorStop(0.6, baseColor);
      gradient.addColorStop(1, adjustColor(baseColor, -20));

      // Calculate all corner points first
      const top1 = { x: x + toIso(0, 0).x, y: y + toIso(0, 0).y };
      const top2 = { x: x + toIso(width, 0).x, y: y + toIso(width, 0).y };
      const top3 = { x: x + toIso(width, height).x, y: y + toIso(width, height).y };
      const top4 = { x: x + toIso(0, height).x, y: y + toIso(0, height).y };

      // Enhanced shadow (EXACTLY like departments)
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = isSelected ? 25 : 15;
      ctx.shadowOffsetX = 8;
      ctx.shadowOffsetY = 8;

      // LEFT WALL - Draw first (back-most)
      const leftGradient = ctx.createLinearGradient(top4.x, top4.y, top4.x, top4.y + depth);
      leftGradient.addColorStop(0, isSelected ? '#1e40af' : adjustColor(baseColor, -55));
      leftGradient.addColorStop(1, isSelected ? '#1e3a8a' : adjustColor(baseColor, -75));

      ctx.fillStyle = leftGradient;
      ctx.strokeStyle = isSelected ? '#172554' : adjustColor(baseColor, -80);
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(top4.x, top4.y);
      ctx.lineTo(top4.x, top4.y + depth);
      ctx.lineTo(top3.x, top3.y + depth);
      ctx.lineTo(top3.x, top3.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // RIGHT WALL - Draw second
      const rightGradient = ctx.createLinearGradient(top2.x, top2.y, top2.x, top2.y + depth);
      rightGradient.addColorStop(0, isSelected ? '#3b82f6' : adjustColor(baseColor, -35));
      rightGradient.addColorStop(1, isSelected ? '#1e40af' : adjustColor(baseColor, -55));

      ctx.fillStyle = rightGradient;
      ctx.strokeStyle = isSelected ? '#1e3a8a' : adjustColor(baseColor, -60);
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(top2.x, top2.y);
      ctx.lineTo(top2.x, top2.y + depth);
      ctx.lineTo(top3.x, top3.y + depth);
      ctx.lineTo(top3.x, top3.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // TOP FACE - Draw last (front-most)
      ctx.fillStyle = isSelected ? '#60a5fa' : gradient;
      ctx.strokeStyle = isSelected ? '#2563eb' : adjustColor(baseColor, -40);
      ctx.lineWidth = isSelected ? 3.5 : 2.5;

      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = isSelected ? 20 : 12;

      ctx.beginPath();
      ctx.moveTo(top1.x, top1.y);
      ctx.lineTo(top2.x, top2.y);
      ctx.lineTo(top3.x, top3.y);
      ctx.lineTo(top4.x, top4.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Hospital cross on top face
      const centerX = (top1.x + top2.x + top3.x + top4.x) / 4;
      const centerY = (top1.y + top2.y + top3.y + top4.y) / 4;

      ctx.fillStyle = 'white';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 3;
      const crossSize = 24;
      const crossThick = 6;

      // Vertical bar
      ctx.fillRect(
        centerX - crossThick / 2,
        centerY - crossSize / 2,
        crossThick,
        crossSize
      );

      // Horizontal bar
      ctx.fillRect(
        centerX - crossSize / 2,
        centerY - crossThick / 2,
        crossSize,
        crossThick
      );

      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      // Hospital name ABOVE the building
      ctx.font = 'bold 16px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      const nameY = top4.y - 15;
      const nameX = centerX;

      // Background for name
      const textMetrics = ctx.measureText(hospital.name);
      const textWidth = textMetrics.width;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(nameX - textWidth / 2 - 8, nameY - 16, textWidth + 16, 22);

      // Name text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(hospital.name, nameX, nameY);

      // Badge for selected
      if (isSelected) {
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 12px Inter, system-ui, sans-serif';
        ctx.fillText('✓ SELECTAT', nameX, nameY - 25);
      }
    });

    // DRAW SYSTEM EXIT POINT (like entrance/exit in internal hospital view)
    // Draw a red circle with exit icon for patients leaving the system
    ctx.shadowColor = 'rgba(220, 38, 38, 0.4)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Outer pulsing circle
    const exitRadius = 40;
    const pulseSize = Math.sin(Date.now() / 500) * 5; // Pulsing animation

    // Red background circle
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(SYSTEM_EXIT_POINT.x, SYSTEM_EXIT_POINT.y, exitRadius + pulseSize, 0, Math.PI * 2);
    ctx.fill();

    // Inner darker circle
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.arc(SYSTEM_EXIT_POINT.x, SYSTEM_EXIT_POINT.y, exitRadius - 10, 0, Math.PI * 2);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(SYSTEM_EXIT_POINT.x, SYSTEM_EXIT_POINT.y, exitRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Exit icon (arrow pointing right and up)
    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🌍', SYSTEM_EXIT_POINT.x, SYSTEM_EXIT_POINT.y);

    // Label below the circle
    ctx.fillStyle = 'rgba(220, 38, 38, 0.9)';
    ctx.fillRect(SYSTEM_EXIT_POINT.x - 60, SYSTEM_EXIT_POINT.y + 50, 120, 24);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    ctx.fillText('SYSTEM EXIT', SYSTEM_EXIT_POINT.x, SYSTEM_EXIT_POINT.y + 62);

    // DRAW TRANSFER ANIMATIONS (EXACTLY like IsometricFloorView patient movements)
    // Calculate current time in seconds
    const [currHours, currMinutes] = currentTime.split(':').map(Number);
    const currTimeSeconds = (currHours * 60 + currMinutes) * 60 + currentSeconds;

    // Filter patients that are actually transferring
    const activeTransfers = transferringPatients.filter(p => p.isTransferring && p.transferTo);

    // Turn off shadows for patient animations
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    activeTransfers.forEach(patient => {
      const fromHospital = hospitals.find(h => h.id === patient.currentHospitalId);

      // Check if patient is leaving the system
      const isLeavingSystem = patient.transferTo === 'OUTSIDE_SYSTEM';
      const toHospital = isLeavingSystem ? null : hospitals.find(h => h.id === patient.transferTo);

      if (!fromHospital) return;

      // Calculate transfer progress based on TIME
      let transferStartSeconds;
      if (patient.transferStartTime) {
        const [startH, startM] = patient.transferStartTime.split(':').map(Number);
        transferStartSeconds = (startH * 60 + startM) * 60;
      } else {
        return; // No start time, skip
      }

      const transferDurationSeconds = (patient.transferDurationMinutes || 5) * 60;
      const transferEndSeconds = transferStartSeconds + transferDurationSeconds;

      // Check if we're in the transfer time window
      if (currTimeSeconds < transferStartSeconds || currTimeSeconds > transferEndSeconds) {
        return; // Not in transfer period
      }

      // Calculate progress (0 to 1)
      const elapsed = currTimeSeconds - transferStartSeconds;
      const progress = Math.min(1, Math.max(0, elapsed / transferDurationSeconds));

      // Hospital building dimensions (MUST MATCH rendering above)
      const width = 200;
      const height = 160;

      // Isometric transformation (same as drawing)
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
        // Patient goes to the system exit point (red circle)
        endX = SYSTEM_EXIT_POINT.x;
        endY = SYSTEM_EXIT_POINT.y;
      } else if (toHospital) {
        const toIso2 = toIso(width / 2, height / 2);
        endX = toHospital.position.x + toIso2.x;
        endY = toHospital.position.y + toIso2.y;
      } else {
        return;
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

      // Draw patient circle (EXACTLY like IsometricFloorView)
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
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(idNum, currentX, currentY);

      // Optional info label
      if (patient.transferDistance && patient.transferDurationMinutes && !isLeavingSystem) {
        const timeRemaining = Math.ceil((1 - progress) * patient.transferDurationMinutes);
        const labelText = `${patient.transferDistance.toFixed(1)}km • ${timeRemaining}min`;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(currentX - 50, currentY - 25, 100, 18);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 9px Inter, system-ui';
        ctx.fillText(labelText, currentX, currentY - 12);
      } else if (isLeavingSystem) {
        ctx.fillStyle = 'rgba(220, 38, 38, 0.9)';
        ctx.fillRect(currentX - 40, currentY - 25, 80, 18);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 9px Inter, system-ui';
        ctx.fillText('🌍 LEAVING', currentX, currentY - 12);
      }
    });

    ctx.restore();
  }, [hospitals, selectedHospitalId, hoveredHospital, camera, transferringPatients, currentTime, currentSeconds, adjustColor]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Don't trigger click if we were dragging/moving
    if (hasMoved) {
      setHasMoved(false);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    // Account for canvas scaling (CSS size vs actual canvas size)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    const hospital = getHospitalAtPoint(canvasX, canvasY);
    if (hospital) {
      onHospitalClick(hospital.id);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    // Account for canvas scaling (CSS size vs actual canvas size)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    // Handle dragging
    if (isDragging) {
      const dx = canvasX - dragStart.x;
      const dy = canvasY - dragStart.y;

      // Mark as moved if distance > 5px
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        setHasMoved(true);
      }

      setCamera(prev => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy
      }));
      setDragStart({ x: canvasX, y: canvasY });
      canvas.style.cursor = 'grabbing';
      return;
    }

    // Check for hospital hover
    const hospital = getHospitalAtPoint(canvasX, canvasY);

    if (hospital) {
      canvas.style.cursor = 'pointer';
      setHoveredHospital(hospital.id);
    } else {
      canvas.style.cursor = 'grab';
      setHoveredHospital(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    // Account for canvas scaling
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    setIsDragging(true);
    setHasMoved(false); // Reset moved flag
    setDragStart({ x: canvasX, y: canvasY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Use native wheel event listener with passive: false to allow preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      setCamera(prev => ({
        ...prev,
        zoom: Math.max(0.5, Math.min(2, prev.zoom * zoomFactor))
      }));
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <div className="relative w-full h-[700px] bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-700">
      <canvas
        ref={canvasRef}
        width={1600}
        height={1000}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setHoveredHospital(null);
          setIsDragging(false);
        }}
        className="w-full h-full"
      />
      <div className="absolute top-4 left-4 bg-card/90 backdrop-blur px-4 py-2 rounded-lg shadow-lg border">
        <p className="text-sm font-semibold text-foreground">
          🏙️ City View - {hospitals.length} Hospitals
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Click on a hospital • Drag to move • Scroll to zoom
        </p>
        {transferringPatients && transferringPatients.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              🚑 Active transfers: <span className="font-bold text-foreground">{transferringPatients.length}</span>
            </p>
            <p className="text-xs text-red-500">
              🌍 Leaving system: <span className="font-bold">{transferringPatients.filter(p => p.transferTo === 'OUTSIDE_SYSTEM').length}</span>
            </p>
          </div>
        )}
      </div>
      <div className="absolute bottom-4 right-4 bg-card/90 backdrop-blur px-3 py-2 rounded-lg shadow-lg border text-xs">
        <p className="text-muted-foreground">Zoom: {(camera.zoom * 100).toFixed(0)}%</p>
      </div>
    </div>
  );
}
