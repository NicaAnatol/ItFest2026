import { NextRequest, NextResponse } from 'next/server';
import { saveGeneratedPatients } from '@/lib/simulation/data/patientStorage';

// POST - Save generated patients to MongoDB
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patients } = body;

    if (!patients || !Array.isArray(patients)) {
      return NextResponse.json(
        { success: false, error: 'Invalid patients array' },
        { status: 400 }
      );
    }

    const success = await saveGeneratedPatients(patients);

    return NextResponse.json({
      success,
      saved: patients.length,
    });
  } catch (error) {
    console.error('Error saving generated patients:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save patients' },
      { status: 500 }
    );
  }
}
