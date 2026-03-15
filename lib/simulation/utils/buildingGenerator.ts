import { Building, Floor, Department } from '../types/building';
import { CustomFloorConfig, CustomDepartmentConfig } from '../types/simulationConfig';

/**
 * Generate dynamic building structure from custom configuration
 */
export function generateCustomBuilding(
  floors: CustomFloorConfig[],
  floorCount: number
): Building {
  // Auto-layout departments on each floor in a grid
  const generatedFloors: Floor[] = floors.slice(0, floorCount).map((floorConfig, index) => {
    const { id: floorId, name, departments: depts } = floorConfig;

    // Auto-position departments in grid layout
    const positionedDepartments: Department[] = [];
    const COLS = 3; // 3 columns per floor
    const DEPT_WIDTH = 120;
    const DEPT_HEIGHT = 80;
    const SPACING_X = 150;
    const SPACING_Y = 120;
    const START_X = 25;
    const START_Y = 25;

    depts.forEach((dept, deptIndex) => {
      const col = deptIndex % COLS;
      const row = Math.floor(deptIndex / COLS);

      positionedDepartments.push({
        id: dept.id,
        name: dept.name,
        type: dept.type,
        capacity: dept.capacity,
        processingTimeMinutes: dept.processingTimeMinutes,
        floor: floorId,
        color: dept.color, // Preserve color from template
        position: {
          x: START_X + (col * SPACING_X),
          y: START_Y + (row * SPACING_Y)
        },
        size: {
          width: DEPT_WIDTH,
          height: DEPT_HEIGHT
        }
      });
    });

    return {
      id: floorId,
      name: name || (floorId === 1 ? 'Parter' : `Etaj ${floorId - 1}`),
      departments: positionedDepartments,
      paths: []
    };
  });

  return {
    id: 'hospital-custom',
    name: 'Spital Personalizat',
    floors: generatedFloors
  };
}

/**
 * Generate default building with all floors
 */
export function getDefaultBuilding(): Building {
  return {
    id: 'hospital-1',
    name: 'Hospital Municipal',
    floors: [
      {
        id: 1,
        name: 'Ground Floor - Reception & Emergency',
        departments: [
          { id: 'reception', name: 'Reception', type: 'Administrative', capacity: 5, floor: 1, position: { x: 25, y: 20 }, size: { width: 120, height: 70 } },
          { id: 'waiting-1', name: 'Waiting Room', type: 'Waiting', capacity: 15, floor: 1, position: { x: 20, y: 150 }, size: { width: 130, height: 95 } },
          { id: 'triage', name: 'Emergency Triage', type: 'Emergency', capacity: 3, floor: 1, position: { x: 220, y: 25 }, size: { width: 75, height: 85 } },
          { id: 'emergency', name: 'Emergency', type: 'Emergency', capacity: 4, floor: 1, position: { x: 215, y: 165 }, size: { width: 95, height: 110 } },
          { id: 'pharmacy', name: 'Farmacie', type: 'Pharmacy', capacity: 6, floor: 1, position: { x: 390, y: 20 }, size: { width: 105, height: 75 } },
          { id: 'info', name: 'Information', type: 'Administrative', capacity: 2, floor: 1, position: { x: 400, y: 155 }, size: { width: 80, height: 90 } },
        ],
        paths: [],
      },
      {
        id: 2,
        name: 'Floor 1 - Consultations & Diagnostics',
        departments: [
          { id: 'consultation-1', name: 'Cabinet 101', type: 'Medical', capacity: 2, floor: 2, position: { x: 30, y: 25 }, size: { width: 70, height: 65 } },
          { id: 'consultation-2', name: 'Cabinet 102', type: 'Medical', capacity: 2, floor: 2, position: { x: 25, y: 135 }, size: { width: 85, height: 75 } },
          { id: 'consultation-3', name: 'Cabinet 103', type: 'Medical', capacity: 2, floor: 2, position: { x: 30, y: 255 }, size: { width: 75, height: 80 } },
          { id: 'lab', name: 'Laborator', type: 'Diagnostic', capacity: 4, floor: 2, position: { x: 205, y: 20 }, size: { width: 115, height: 85 } },
          { id: 'xray', name: 'Radiologie', type: 'Imaging', capacity: 3, floor: 2, position: { x: 200, y: 160 }, size: { width: 110, height: 95 } },
          { id: 'ultrasound', name: 'Ecografie', type: 'Imaging', capacity: 3, floor: 2, position: { x: 390, y: 25 }, size: { width: 95, height: 70 } },
          { id: 'waiting-2', name: 'Waiting', type: 'Waiting', capacity: 12, floor: 2, position: { x: 385, y: 155 }, size: { width: 100, height: 100 } },
        ],
        paths: [],
      },
      {
        id: 3,
        name: 'Floor 2 - Specializations',
        departments: [
          { id: 'cardiology', name: 'Cardiologie', type: 'Specialized', capacity: 3, floor: 3, position: { x: 25, y: 30 }, size: { width: 100, height: 75 } },
          { id: 'neurology', name: 'Neurologie', type: 'Specialized', capacity: 3, floor: 3, position: { x: 30, y: 160 }, size: { width: 85, height: 90 } },
          { id: 'treatment-1', name: 'Tratament 1', type: 'Treatment', capacity: 4, floor: 3, position: { x: 215, y: 25 }, size: { width: 95, height: 70 } },
          { id: 'treatment-2', name: 'Tratament 2', type: 'Treatment', capacity: 4, floor: 3, position: { x: 210, y: 150 }, size: { width: 105, height: 95 } },
          { id: 'orthopedics', name: 'Ortopedie', type: 'Specialized', capacity: 3, floor: 3, position: { x: 390, y: 20 }, size: { width: 90, height: 85 } },
          { id: 'recovery', name: 'Recuperare', type: 'Treatment', capacity: 6, floor: 3, position: { x: 385, y: 160 }, size: { width: 110, height: 105 } },
        ],
        paths: [],
      },
      {
        id: 4,
        name: 'Floor 3 - Surgery & ICU',
        departments: [
          { id: 'surgery-1', name: 'Bloc Op. 1', type: 'Surgery', capacity: 1, floor: 4, position: { x: 20, y: 25 }, size: { width: 115, height: 95 } },
          { id: 'surgery-2', name: 'Bloc Op. 2', type: 'Surgery', capacity: 1, floor: 4, position: { x: 25, y: 175 }, size: { width: 110, height: 100 } },
          { id: 'preop', name: 'Pre-Operator', type: 'PreOp', capacity: 5, floor: 4, position: { x: 220, y: 20 }, size: { width: 100, height: 80 } },
          { id: 'postop', name: 'Post-Operator', type: 'PostOp', capacity: 6, floor: 4, position: { x: 215, y: 160 }, size: { width: 105, height: 90 } },
          { id: 'icu', name: 'Intensive Care', type: 'ICU', capacity: 8, floor: 4, position: { x: 390, y: 20 }, size: { width: 120, height: 105 } },
          { id: 'sterilization', name: 'Sterilizare', type: 'Support', capacity: 2, floor: 4, position: { x: 400, y: 185 }, size: { width: 95, height: 75 } },
        ],
        paths: [],
      },
    ],
  };
}
