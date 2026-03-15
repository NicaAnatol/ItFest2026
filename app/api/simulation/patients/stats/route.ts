import { NextRequest, NextResponse } from 'next/server';
import { getPatientStatistics } from '@/lib/simulation/data/patientStorage';

// GET - Get patient statistics from MongoDB
export async function GET(request: NextRequest) {
  try {
    const stats = await getPatientStatistics();

    if (!stats) {
      return NextResponse.json(
        { success: false, error: 'Failed to get statistics' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error getting patient statistics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get statistics' },
      { status: 500 }
    );
  }
}
