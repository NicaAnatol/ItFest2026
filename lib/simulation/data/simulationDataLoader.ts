import { Building, Patient } from '../types/building';
import { building as defaultBuilding, patients as defaultPatients } from './buildingData';

/**
 * Load simulation data from MongoDB or fallback to JSON
 * This function is used by the simulation to get data
 */
export async function loadSimulationData(): Promise<{
  building: Building;
  patients: Patient[];
}> {
  // Try to load from MongoDB first
  try {
    const response = await fetch('/api/simulation/buildings');
    const buildingsData = await response.json();

    const patientsResponse = await fetch('/api/simulation/patients');
    const patientsData = await patientsResponse.json();

    if (buildingsData.success && buildingsData.data.length > 0 &&
        patientsData.success && patientsData.data.length > 0) {

      const dbBuilding = buildingsData.data[0];
      const dbPatients = patientsData.data;

      // Convert MongoDB format to simulation format
      const building: Building = {
        id: dbBuilding.id,
        name: dbBuilding.name,
        floors: dbBuilding.floors.map((floor: any) => ({
          id: floor.floorNumber,
          name: floor.name,
          departments: floor.departments.map((dept: any) => ({
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

      const patients: Patient[] = dbPatients.map((p: any) => ({
        id: p.id,
        name: p.name,
        age: p.age,
        visits: p.visits,
        patientType: p.patientType,
        condition: p.condition,
        severity: p.severity,
        mortalityRisk: p.mortalityRisk,
        timeToTreatment: p.timeToTreatment,
        arrivalMethod: p.arrivalMethod,
        requiresAdmission: p.requiresAdmission,
        randomFactor: p.randomFactor,
        mortalityIncreasePerHour: p.mortalityIncreasePerHour,
      }));

      console.log('✅ Loaded simulation data from MongoDB:', {
        building: building.name,
        floors: building.floors.length,
        patients: patients.length,
      });

      return { building, patients };
    }
  } catch (error) {
    console.log('⚠️ MongoDB not available, using default JSON data');
  }

  // Fallback to JSON data
  return {
    building: defaultBuilding,
    patients: defaultPatients,
  };
}

/**
 * Save simulation data to MongoDB
 */
export async function saveSimulationData(building: Building, patients: Patient[]): Promise<boolean> {
  try {
    // Save building
    await fetch('/api/simulation/buildings', {
      method: 'DELETE',
    });

    const buildingResponse = await fetch('/api/simulation/buildings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: building.name,
        floors: building.floors,
      }),
    });

    // Save patients
    await fetch('/api/simulation/patients', {
      method: 'DELETE',
    });

    const patientsResponse = await fetch('/api/simulation/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patients: patients,
      }),
    });

    const buildingData = await buildingResponse.json();
    const patientsData = await patientsResponse.json();

    if (buildingData.success && patientsData.success) {
      console.log('✅ Saved simulation data to MongoDB');
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Error saving simulation data:', error);
    return false;
  }
}
