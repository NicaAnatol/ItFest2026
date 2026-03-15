import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Fetch simulation building with all floors and departments
export async function GET(request: NextRequest) {
  try {
    const buildings = await prisma.simulationBuilding.findMany({
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

    return NextResponse.json({
      success: true,
      data: buildings,
    });
  } catch (error) {
    console.error('Error fetching simulation buildings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch buildings' },
      { status: 500 }
    );
  }
}

// POST - Create new simulation building with floors and departments
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, floors } = body;

    if (!name || !floors || !Array.isArray(floors)) {
      return NextResponse.json(
        { success: false, error: 'Invalid building data' },
        { status: 400 }
      );
    }

    const building = await prisma.simulationBuilding.create({
      data: {
        name,
        floors: {
          create: floors.map((floor: any) => ({
            floorNumber: floor.id,
            name: floor.name,
            departments: {
              create: floor.departments.map((dept: any) => ({
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
      include: {
        floors: {
          include: {
            departments: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: building,
    });
  } catch (error) {
    console.error('Error creating simulation building:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create building' },
      { status: 500 }
    );
  }
}

// DELETE - Delete all simulation buildings
export async function DELETE() {
  try {
    // Cascade delete will handle floors and departments
    const result = await prisma.simulationBuilding.deleteMany({});

    return NextResponse.json({
      success: true,
      deleted: result.count,
    });
  } catch (error) {
    console.error('Error deleting simulation buildings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete buildings' },
      { status: 500 }
    );
  }
}
