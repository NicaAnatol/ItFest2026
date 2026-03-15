import { PrismaClient } from '@prisma/client';
import { Patient } from '../types/building';

const prisma = new PrismaClient();

/**
 * Save generated patients to MongoDB for reuse
 */
export async function saveGeneratedPatients(
  patients: Patient[],
  configName: string = 'default'
): Promise<boolean> {
  try {
    console.log(`💾 Saving ${patients.length} generated patients to MongoDB...`);

    // Save each patient with their visits
    const savedCount = await Promise.all(
      patients.map(async (patient) => {
        const { id, visits, ...patientData } = patient;

        try {
          await prisma.simulationPatient.create({
            data: {
              ...patientData,
              name: patient.name || `Patient ${patient.id}`,
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
          return 1;
        } catch (error) {
          console.error(`Failed to save patient ${patient.name}:`, error);
          return 0;
        }
      })
    );

    const totalSaved = savedCount.reduce((sum, count) => sum + count, 0);
    console.log(`✅ Saved ${totalSaved}/${patients.length} patients to MongoDB`);

    return totalSaved === patients.length;
  } catch (error) {
    console.error('Error saving patients to MongoDB:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Load patients from MongoDB
 */
export async function loadSavedPatients(): Promise<Patient[]> {
  try {
    const dbPatients = await prisma.simulationPatient.findMany({
      include: {
        visits: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (dbPatients.length === 0) {
      console.log('⚠️ No saved patients found in MongoDB');
      return [];
    }

    console.log(`✅ Loaded ${dbPatients.length} patients from MongoDB`);

    return dbPatients.map((p) => ({
      id: p.id,
      name: p.name,
      age: p.age,
      visits: p.visits.map((v) => ({
        day: v.day,
        departmentId: v.departmentId,
        startTime: v.startTime,
        endTime: v.endTime,
      })),
      patientType: p.patientType as any,
      condition: p.condition,
      severity: p.severity as any,
      mortalityRisk: p.mortalityRisk,
      timeToTreatment: p.timeToTreatment,
      arrivalMethod: p.arrivalMethod as any,
      requiresAdmission: p.requiresAdmission,
      randomFactor: p.randomFactor,
      mortalityIncreasePerHour: p.mortalityIncreasePerHour,
    }));
  } catch (error) {
    console.error('Error loading patients from MongoDB:', error);
    return [];
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Clear all saved patients from MongoDB
 */
export async function clearSavedPatients(): Promise<boolean> {
  try {
    await prisma.simulationPatient.deleteMany({});
    console.log('✅ Cleared all patients from MongoDB');
    return true;
  } catch (error) {
    console.error('Error clearing patients:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Get patient statistics from MongoDB
 */
export async function getPatientStatistics() {
  try {
    const total = await prisma.simulationPatient.count();

    const byType = await prisma.simulationPatient.groupBy({
      by: ['patientType'],
      _count: true,
    });

    const bySeverity = await prisma.simulationPatient.groupBy({
      by: ['severity'],
      _count: true,
    });

    const byCondition = await prisma.simulationPatient.groupBy({
      by: ['condition'],
      _count: true,
      orderBy: {
        _count: {
          condition: 'desc',
        },
      },
      take: 10, // Top 10 conditions
    });

    return {
      total,
      byType: Object.fromEntries(
        byType.map((item) => [item.patientType, item._count])
      ),
      bySeverity: Object.fromEntries(
        bySeverity.map((item) => [item.severity, item._count])
      ),
      topConditions: byCondition.map((item) => ({
        condition: item.condition,
        count: item._count,
      })),
    };
  } catch (error) {
    console.error('Error getting patient statistics:', error);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}
