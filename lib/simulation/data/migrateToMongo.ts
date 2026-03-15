/**
 * Migration script to move simulation data from JSON to MongoDB
 * Run this once to populate the database with initial data
 */

import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { building, patients } from './buildingData.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function migrateSimulationData() {
  console.log('🚀 Starting simulation data migration to MongoDB...\n');

  try {
    // 1. Migrate Building Data
    console.log('📦 Migrating building data...');

    // Clear existing buildings
    await prisma.simulationBuilding.deleteMany({});
    console.log('   ✓ Cleared existing buildings');

    // Create new building
    const createdBuilding = await prisma.simulationBuilding.create({
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
                size: dept.size || { width: 100, height: 80 },
              })),
            },
          })),
        },
      },
      include: {
        floors: {
          include: {
            departments: true,
          },
        },
      },
    });

    console.log(`   ✓ Created building: ${createdBuilding.name}`);
    console.log(`   ✓ Floors: ${createdBuilding.floors.length}`);
    console.log(
      `   ✓ Departments: ${createdBuilding.floors.reduce(
        (sum, f) => sum + f.departments.length,
        0
      )}\n`
    );

    // 2. Migrate Patient Data
    console.log('👥 Migrating patient data...');

    // Clear existing patients
    await prisma.simulationPatient.deleteMany({});
    console.log('   ✓ Cleared existing patients');

    // Create patients with visits
    let successCount = 0;
    for (const patient of patients) {
      try {
        const { id, visits, ...patientData } = patient; // Exclude 'id' - let MongoDB generate it

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

        successCount++;
      } catch (error) {
        console.error(`   ✗ Failed to create patient ${patient.name}:`, error);
      }
    }

    console.log(`   ✓ Created ${successCount}/${patients.length} patients\n`);

    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Building: ${createdBuilding.name}`);
    console.log(`   - Floors: ${createdBuilding.floors.length}`);
    console.log(
      `   - Departments: ${createdBuilding.floors.reduce(
        (sum, f) => sum + f.departments.length,
        0
      )}`
    );
    console.log(`   - Patients: ${successCount}`);
    console.log(
      `   - Visits: ${patients.reduce((sum, p) => sum + p.visits.length, 0)}`
    );
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateSimulationData()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error:', error);
    process.exit(1);
  });

export { migrateSimulationData };
