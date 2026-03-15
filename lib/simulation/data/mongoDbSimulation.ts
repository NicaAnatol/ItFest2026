import { PrismaClient } from '@prisma/client';
import { Patient, Building, Floor, Department } from '../types/building';

const prisma = new PrismaClient();

/**
 * Convert database patient to simulation Patient type
 */
export function convertDbPatientToSimulation(dbPatient: any): Patient {
  return {
    id: dbPatient.id,
    name: dbPatient.name,
    age: dbPatient.age,
    visits: dbPatient.visits.map((visit: any) => ({
      day: visit.day,
      departmentId: visit.departmentId,
      startTime: visit.startTime,
      endTime: visit.endTime,
    })),
    patientType: dbPatient.patientType as any,
    condition: dbPatient.condition,
    severity: dbPatient.severity as any,
    mortalityRisk: dbPatient.mortalityRisk,
    timeToTreatment: dbPatient.timeToTreatment,
    arrivalMethod: dbPatient.arrivalMethod as any,
    requiresAdmission: dbPatient.requiresAdmission,
    randomFactor: dbPatient.randomFactor,
    mortalityIncreasePerHour: dbPatient.mortalityIncreasePerHour,
  };
}

/**
 * Convert database building to simulation Building type
 */
export function convertDbBuildingToSimulation(dbBuilding: any): Building {
  return {
    id: dbBuilding.id,
    name: dbBuilding.name,
    floors: dbBuilding.floors.map((floor: any): Floor => ({
      id: floor.floorNumber,
      name: floor.name,
      departments: floor.departments.map((dept: any): Department => ({
        id: dept.id,
        name: dept.name,
        type: dept.type,
        capacity: dept.capacity,
        floor: floor.floorNumber,
        position: dept.position,
        size: dept.size,
      })),
      paths: [],
    })),
  };
}

/**
 * Fetch all simulation patients from MongoDB
 */
export async function fetchSimulationPatients(): Promise<Patient[]> {
  try {
    const dbPatients = await prisma.simulationPatient.findMany({
      include: {
        visits: true,
      },
    });

    return dbPatients.map(convertDbPatientToSimulation);
  } catch (error) {
    console.error('Error fetching simulation patients from DB:', error);
    return [];
  }
}

/**
 * Fetch simulation building from MongoDB
 */
export async function fetchSimulationBuilding(): Promise<Building | null> {
  try {
    const dbBuilding = await prisma.simulationBuilding.findFirst({
      include: {
        floors: {
          include: {
            departments: true,
          },
          orderBy: {
            floorNumber: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!dbBuilding) return null;

    return convertDbBuildingToSimulation(dbBuilding);
  } catch (error) {
    console.error('Error fetching simulation building from DB:', error);
    return null;
  }
}

/**
 * Save simulation patients to MongoDB
 */
export async function saveSimulationPatients(patients: Patient[]): Promise<boolean> {
  try {
    // Delete existing patients
    await prisma.simulationPatient.deleteMany({});

    // Create new patients with visits
    await Promise.all(
      patients.map(async (patient) => {
        const { visits, ...patientData } = patient;

        await prisma.simulationPatient.create({
          data: {
            ...patientData,
            visits: {
              create: visits.map((visit) => ({
                day: visit.day,
                departmentId: visit.departmentId,
                startTime: visit.startTime,
                endTime: visit.endTime,
              })),
            },
          },
        });
      })
    );

    return true;
  } catch (error) {
    console.error('Error saving simulation patients to DB:', error);
    return false;
  }
}

/**
 * Save simulation building to MongoDB
 */
export async function saveSimulationBuilding(building: Building): Promise<boolean> {
  try {
    // Delete existing buildings
    await prisma.simulationBuilding.deleteMany({});

    // Create new building
    await prisma.simulationBuilding.create({
      data: {
        name: building.name,
        floors: {
          create: building.floors.map((floor) => ({
            floorNumber: floor.id,
            name: floor.name,
            departments: {
              create: floor.departments.map((dept) => ({
                name: dept.name,
                type: dept.type,
                capacity: dept.capacity,
                position: dept.position,
                size: dept.size,
              })),
            },
          })),
        },
      },
    });

    return true;
  } catch (error) {
    console.error('Error saving simulation building to DB:', error);
    return false;
  }
}
