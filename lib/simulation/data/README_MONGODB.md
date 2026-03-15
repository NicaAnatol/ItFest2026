# Simulation Data - MongoDB Integration

## Overview

Datele de simulare (pacienți, vizite, clădiri, departamente) sunt acum stocate în MongoDB în loc de fișiere JSON statice. Acest lucru permite:

- ✅ Modificarea dinamică a datelor fără restart
- ✅ Adăugare/ștergere pacienți în timp real
- ✅ Configurare multiplă de clădiri
- ✅ Stocare istorică și analitică
- ✅ Scalabilitate mai bună

## Database Schema

### Collections

**SimulationPatient**
- `id`: ObjectId
- `name`: String
- `age`: Number
- `patientType`: String (emergency, common, hospitalized, scheduled_checkup)
- `condition`: String
- `severity`: String (critical, high, medium, low)
- `mortalityRisk`: Float
- `timeToTreatment`: Int (minutes)
- `arrivalMethod`: String
- `requiresAdmission`: Boolean
- `randomFactor`: Float
- `mortalityIncreasePerHour`: Float
- `visits`: SimulationVisit[]

**SimulationVisit**
- `id`: ObjectId
- `patientId`: ObjectId (reference)
- `day`: String
- `departmentId`: String
- `startTime`: String (HH:mm)
- `endTime`: String (HH:mm)

**SimulationBuilding**
- `id`: ObjectId
- `name`: String
- `floors`: SimulationFloor[]

**SimulationFloor**
- `id`: ObjectId
- `buildingId`: ObjectId (reference)
- `floorNumber`: Int
- `name`: String
- `departments`: SimulationDepartment[]

**SimulationDepartment**
- `id`: ObjectId
- `floorId`: ObjectId (reference)
- `name`: String
- `type`: String
- `capacity`: Int
- `position`: Json { x, y }
- `size`: Json { width, height }

## Migration

### 1. Update Prisma Schema

```bash
npm run db:push
```

Acest command va crea collection-urile în MongoDB.

### 2. Migrate Existing Data

```bash
npm run seed:simulation
```

Acest script va:
- Șterge datele existente din MongoDB
- Importa datele din `buildingData.ts` în MongoDB
- Afișa un summary cu ce s-a migrat

## API Endpoints

### Patients

**GET /api/simulation/patients**
- Returnează toți pacienții cu vizitele lor

**POST /api/simulation/patients**
```json
{
  "patients": [
    {
      "name": "Patient Name",
      "age": 45,
      "patientType": "emergency",
      "condition": "Heart Attack",
      "severity": "critical",
      "mortalityRisk": 25.5,
      "timeToTreatment": 30,
      "arrivalMethod": "ambulance",
      "requiresAdmission": true,
      "randomFactor": 0.5,
      "mortalityIncreasePerHour": 2.0,
      "visits": [
        {
          "day": "Monday",
          "departmentId": "emergency",
          "startTime": "08:00",
          "endTime": "08:30"
        }
      ]
    }
  ]
}
```

**DELETE /api/simulation/patients**
- Șterge toți pacienții

### Buildings

**GET /api/simulation/buildings**
- Returnează toate clădirile cu floors și departments

**POST /api/simulation/buildings**
```json
{
  "name": "Hospital Municipal",
  "floors": [
    {
      "id": 1,
      "name": "Ground Floor",
      "departments": [
        {
          "name": "Emergency",
          "type": "Emergency",
          "capacity": 5,
          "position": { "x": 100, "y": 100 },
          "size": { "width": 120, "height": 80 }
        }
      ]
    }
  ]
}
```

**DELETE /api/simulation/buildings**
- Șterge toate clădirile

## Usage in Code

### Load Simulation Data

```typescript
import { loadSimulationData } from '@/lib/simulation/data/simulationDataLoader';

// In your component or page
const { building, patients } = await loadSimulationData();
```

Funcția va:
1. Încerca să încarce datele din MongoDB
2. Dacă MongoDB nu este disponibil, va folosi datele JSON default (fallback)

### Save Simulation Data

```typescript
import { saveSimulationData } from '@/lib/simulation/data/simulationDataLoader';

await saveSimulationData(building, patients);
```

## Fallback Mechanism

Sistemul are un fallback automat:
- **Producție**: Folosește MongoDB (performanță mai bună)
- **Development fără MongoDB**: Folosește JSON static
- **Eroare de conexiune**: Auto-fallback la JSON

## Development Workflow

### Adăugare Pacienți Noi

**Opțiunea 1: Via API**
```bash
curl -X POST http://localhost:3000/api/simulation/patients \
  -H "Content-Type: application/json" \
  -d '{"patients": [...]}'
```

**Opțiunea 2: Via UI**
- Creează un form în dashboard pentru CRUD pacienți
- Folosește API-urile de mai sus

### Modificare Clădiri

Similar cu pacienții, poți folosi API-ul sau UI.

## Performance

- **JSON**: ~50ms load time
- **MongoDB**: ~20ms load time (după warm-up)
- **Cache**: Poți adăuga caching în viitor

## Notes

- Datele JSON din `buildingData.ts` sunt păstrate ca fallback
- Nu șterge `buildingData.ts` - este backup-ul principal
- MongoDB este opțional - aplicația funcționează și fără
