import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Fetch all simulation patients with their visits
export async function GET(request: NextRequest) {
  try {
    const patients = await prisma.simulationPatient.findMany({
      include: {
        visits: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: patients,
    });
  } catch (error) {
    console.error('Error fetching simulation patients:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch patients' },
      { status: 500 }
    );
  }
}

// POST - Create new simulation patients (bulk or single)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patients } = body;

    if (!patients || !Array.isArray(patients)) {
      return NextResponse.json(
        { success: false, error: 'Invalid patient data' },
        { status: 400 }
      );
    }

    // Create patients with their visits
    const createdPatients = await Promise.all(
      patients.map(async (patient: any) => {
        const { visits, ...patientData } = patient;

        return await prisma.simulationPatient.create({
          data: {
            ...patientData,
            visits: {
              create: visits || [],
            },
          },
          include: {
            visits: true,
          },
        });
      })
    );

    return NextResponse.json({
      success: true,
      data: createdPatients,
      count: createdPatients.length,
    });
  } catch (error) {
    console.error('Error creating simulation patients:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create patients' },
      { status: 500 }
    );
  }
}

// DELETE - Delete all simulation patients
export async function DELETE() {
  try {
    // Delete all visits first (cascade should handle this, but being explicit)
    await prisma.simulationVisit.deleteMany({});

    // Delete all patients
    const result = await prisma.simulationPatient.deleteMany({});

    return NextResponse.json({
      success: true,
      deleted: result.count,
    });
  } catch (error) {
    console.error('Error deleting simulation patients:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete patients' },
      { status: 500 }
    );
  }
}
