# 🏥 Simulation Data Storage - MongoDB

## Ce date sunt în MongoDB?

### 1️⃣ Date Statice (Manual sau prin Migration)
Acestea sunt datele de bază care definesc structura:
- **Buildings**: Clădirile spitalului (etaje, departamente, poziții)
- **Demo Patients**: 2 pacienți demo pentru testare

**Cum se adaugă:**
```bash
npm run seed:simulation
```

### 2️⃣ Date Dinamice (Automat Generate)
Acestea sunt datele care se generează când pornești o simulare:

**✅ Pacienți Generați Automat:**
- Când pornești o simulare cu configurație custom
- Sistemul generează 50-2000 pacienți cu:
  - Nume, vârstă
  - Tipul pacientului (emergency, common, hospitalized, scheduled)
  - **Boala/condiția** (ex: Heart Attack, Pneumonia, Diabetes, etc.)
  - **Severitate** (critical, high, medium, low)
  - **Risc de mortalitate** (0-100%)
  - **Timp critic până la tratament** (în minute)
  - **Creștere mortalitate pe oră** (cât crește riscul dacă așteaptă)
  - **Metoda de sosire** (ambulance, walk-in, transfer)
  - **Vizite** (rutele prin departamente: Emergency → Lab → X-Ray → etc.)

**✅ Acești pacienți sunt SALVAȚI AUTOMAT în MongoDB când pornești simularea!**

## Unde se văd datele despre boli și mișcare?

### 📊 Boli Disponibile

Fișierul `lib/simulation/data/medicalStatistics.ts` conține:

**Emergency Conditions (Urgențe):**
- Heart Attack (Infarct) - 25% mortalitate, +5%/oră
- Stroke (AVC) - 30% mortalitate, +8%/oră
- Severe Trauma - 35% mortalitate, +10%/oră
- Respiratory Failure - 40% mortalitate, +7%/oră
- Septic Shock - 50% mortalitate, +12%/oră

**Common Conditions (Comune):**
- Flu (Gripă) - 0.5% mortalitate
- Gastroenteritis - 0.2% mortalitate
- Minor Injury - 0.1% mortalitate
- Migraine - 0% mortalitate
- etc.

**Hospitalized Conditions:**
- Pneumonia - 8% mortalitate
- Appendicitis - 2% mortalitate
- Chronic Disease Exacerbation - 5% mortalitate
- etc.

**Scheduled Checkups:**
- Routine Checkup - 0% mortalitate
- Post-Op Follow-up - 0.5% mortalitate
- Vaccination - 0% mortalitate
- etc.

### 🚶 Mișcarea Pacienților

**Rutele pacienților se generează automat bazat pe:**
1. **Tipul bolii** → determină ce departamente trebuie vizitate
2. **Severitatea** → determină ordinea și urgența
3. **Configurația spitalului** → departamentele disponibile

**Exemplu ruță pacient cu Heart Attack:**
```
1. Entrance → Emergency (08:00-08:15) - Triage
2. Emergency → Lab (08:20-08:35) - Analize
3. Lab → ICU (08:40-10:00) - Tratament intensiv
4. ICU → Exit (10:05-10:10) - Ieșire
```

**Pacientul se mișcă automat între departamente cu:**
- Animații vizuale (dot-uri colorate)
- Transfer între etaje (lift)
- Așteptare în coadă dacă departamentul e plin
- **TRANSFER la alt spital** dacă:
  - Departamentul lipsește
  - Timpul de așteptare e prea mare
  - Riscul de mortalitate crește prea mult

## 🔍 Cum să verifici datele în MongoDB?

### Option 1: Via API
```bash
# Statistici pacienți salvați
curl http://localhost:3000/api/simulation/patients/stats

# Toți pacienții salvați
curl http://localhost:3000/api/simulation/patients

# Toate clădirile
curl http://localhost:3000/api/simulation/buildings
```

### Option 2: MongoDB Compass
1. Deschide MongoDB Compass
2. Conectează-te cu connection string din `.env.local`
3. Database: `medgraph`
4. Collections:
   - `SimulationPatient` - pacienții salvați
   - `SimulationVisit` - vizitele/rutele lor
   - `SimulationBuilding` - clădirile
   - `SimulationFloor` - etajele
   - `SimulationDepartment` - departamentele

## 📝 Exemplu de Pacient în MongoDB

```json
{
  "_id": "67a1b2c3d4e5f6789abcdef0",
  "name": "Patient #47",
  "age": 58,
  "patientType": "emergency",
  "condition": "Heart Attack",
  "severity": "critical",
  "mortalityRisk": 25.5,
  "timeToTreatment": 30,
  "mortalityIncreasePerHour": 5.0,
  "arrivalMethod": "ambulance",
  "requiresAdmission": true,
  "randomFactor": 0.7,
  "visits": [
    {
      "day": "Monday",
      "departmentId": "emergency",
      "startTime": "08:00",
      "endTime": "08:15"
    },
    {
      "day": "Monday",
      "departmentId": "lab",
      "startTime": "08:20",
      "endTime": "08:35"
    },
    {
      "day": "Monday",
      "departmentId": "icu",
      "startTime": "08:40",
      "endTime": "10:00"
    }
  ],
  "createdAt": "2024-01-15T08:00:00.000Z"
}
```

## 🎯 Workflow Complet

### 1. Pornești Simularea
```
User → Configuration → Generate Patients (500 patients)
                     ↓
              advancedPatientGenerator.ts
                     ↓
        Folosește medicalStatistics.ts
                     ↓
     Generează pacienți cu boli, severitate, rute
                     ↓
              Auto-save to MongoDB ✅
```

### 2. Pacienții se Mișcă
```
Simulation Engine
      ↓
Check Queue în fiecare departament
      ↓
Dacă full → așteptare → mortalitate crește
      ↓
Dacă prea mult → TRANSFER la alt spital
      ↓
MongoDB tracked deaths & transfers
```

### 3. Statistici
```
MongoDB queries →
  - Câți pacienți au murit
  - Care boli au cea mai mare mortalitate
  - Care departamente sunt blocate
  - Câte transferuri s-au făcut
```

## 🚀 Quick Start

```bash
# 1. Setup database
npm run db:push

# 2. Migrate initial data (buildings + demo patients)
npm run seed:simulation

# 3. Start app
npm run dev

# 4. Go to http://localhost:3000/dashboard/simulation

# 5. Create simulation → Patients auto-generated & saved to MongoDB!
```

## 💡 Pro Tips

- **Datele despre boli** sunt în `medicalStatistics.ts` - poți adăuga mai multe
- **Rutele** se generează automat bazat pe boală
- **MongoDB** salvează DOAR rezultatul final (pacienții generați)
- **Generarea** se face in-memory pentru viteză
- **Transfer-urile** sunt tracked în timp real
- **Mortalitatea** se calculează dinamic bazat pe așteptare

## 📊 Datele Tale Sunt Acum În MongoDB!

După ce pornești o simulare, vei avea:
- ✅ 500-2000 pacienți cu boli reale
- ✅ Toate rutele lor prin spital
- ✅ Statistici despre mortalitate
- ✅ Istoricul transferurilor
- ✅ Date persistente pentru analiză ulterioară
