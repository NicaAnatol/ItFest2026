# MedGraph AI

**Hospital Intelligence Platform** — AI-powered clinical decision analysis with graph-based patient modeling.

Built for **ITFest 2026**.

---

## What It Does

MedGraph AI models every patient's hospital journey as a **directed graph** where each node is a clinical decision point. The system captures, analyzes, and visualizes the complete chain of medical decisions — from admission through discharge — enabling doctors, auditors, and hospital administrators to understand exactly what happened, why, and what could have been done differently.

---

## Complete Data Model — What Each Node Captures

Each patient journey consists of ~24 decision nodes. Every node preserves a full clinical snapshot at that moment in time — approximately **200+ data points** across 11 domains:

### 1. Patient State

Every node records the patient's full clinical picture at that decision point:

- **Demographics** — age, gender, weight (kg), height (cm), BMI, ethnicity, insurance type
- **Medical history** — chronic conditions (each with condition name, ICD-10 code, diagnosed date, severity, controlled status, current medications, HbA1c if diabetic), allergies (allergen, reaction type, severity), risk factors, undiagnosed conditions discovered during the visit
- **Diagnosis** — primary diagnosis (name, ICD-10, confidence %, diagnosed at which node, severity, acuity, status), secondary diagnoses (name, ICD-10), differential diagnoses (each candidate with probability % and ruled-out flag)
- **Symptoms** — each symptom with severity (0–10), onset, duration, characteristics, anatomical location, change from last node, exacerbating factors, relieving factors
- **Vitals** — blood pressure (systolic + diastolic mmHg), heart rate (bpm + rhythm), respiratory rate, oxygen saturation (SpO2 % + supplemental O2 flag + flow rate), temperature (°C), consciousness level + Glasgow Coma Scale (3–15), pain score (0–10)
- **Lab results** — hematology (hemoglobin, WBC, platelets), chemistry (creatinine, glucose, potassium, sodium, BUN, lipase, amylase), coagulation (PT, INR, aPTT, D-dimer), cardiac markers (troponin, BNP), inflammatory markers (CRP, procalcitonin), blood gas (pH, bicarbonate, lactate) — each value with unit, status (normal/high/low/critical), critical flag, interpretation
- **Imaging results** — study type (CT, X-ray, MRI, ultrasound), timestamp, result summary, findings list, severity
- **Active medications** — each drug with name, dose, route (IV/oral/SC), timing, start date, status (active/discontinued), indication
- **Active complications** — each with ID, type, ICD-10, severity, onset (timestamp + node + causing decision), current status, change in this transition, predicted flag, predicted probability, impact on mortality, impact on treatment plan, treatment history (timestamped actions + responses), prediction accuracy, resolution status + timeline
- **Risk scores** — PESI (pulmonary embolism severity), TIMI (cardiac risk), HEART (chest pain), Wells PE (DVT/PE probability), HAS-BLED (bleeding risk) — each with numeric value, risk class, interpretation

### 2. Decision

The medical decision made at this node:

- **Action taken** — free-text description (e.g. "Start IV Heparin 80 units/kg bolus")
- **Action category** — one of: `admission`, `triage`, `diagnostic`, `treatment`, `monitoring`, `consultation`, `transfer`, `procedure`, `discharge`, `disposition`
- **Decision maker** — person ID, name, role, specialty, years of experience, hours on current shift, current patient load, decision confidence (0–1)
- **Clinical reasoning** — primary reason (free text), supporting evidence (list of clinical findings), guidelines followed (list of guideline names)
- **Alternatives considered** — each rejected option with: option name, description, why not chosen, pros (list), cons (list), historical outcome data if chosen (total cases, healed count, complications count, deaths, mortality rate, major bleeding rate, success rate, comparison note)
- **Orders issued** — each order with: ID, type (lab/imaging/medication/transfer/procedure), urgency; for lab orders: test list; for imaging: study name; for medications: drug, dose, route, timing, indication, loading dose, maintenance dose, monitoring requirements (parameter, frequency, target range), precautions; for transfers: from/to department, reason, urgency, requirements; estimated cost per order
- **Expected outcome** — primary expected result, expected timeline (key milestones → timeframes), success criteria list

### 3. Risk Assessment

Quantified risk at this decision point:

- **Mortality risk** — baseline %, additional risk from this decision %, total %, contributing factors (each with factor name + contribution %)
- **Complication risk** — overall probability %, breakdown (minor %, moderate %, severe %)
- **Potential complications** — each with: type, ICD-10, probability %, severity distribution (mild/moderate/severe %), mortality if occurs %, typical onset, earliest onset, patient-specific risk factors (each with factor name + risk multiplier), risk-factor-adjusted probability %, mitigation strategies (list), historical frequency (cases with this decision, cases with this complication, rate %, deaths)
- **Drug interaction risks** — each with: interaction type (drug-drug, drug-condition, complication-complication), description, condition, medication, risk level, probability %, mortality if occurs %, how discovered, mitigation
- **Overlapping decision risks** — when multiple active treatments compound: this decision + overlapping decision, overlap type, combined risk (e.g. heparin 3% + aspirin 2% = combined 8% with 1.6× interaction factor), mitigation

### 4. Historical Analysis

AI-powered pattern analysis from similar cases:

- **Similar cases** — total count, outcome distribution (healed count + %, complications count + %, died count + %), complication frequency per type (count, percentage, severity breakdown, outcomes, mortality rate, timing with median onset and range, anatomical locations, salvage procedure success rates), final diagnoses distribution, temporal patterns (median time to stabilization, median length of stay with Q25/Q75), subgroup analysis by risk category (count, mortality %, bleeding rate %, decompensation rate %)
- **AI flags** — automated clinical alerts with: flag ID, type (`HIGH_RISK_COMPLICATION`, `TIMING_CRITICAL`, `DOSAGE_CHECK`, `INTERACTION_WARNING`, `HIGH_RISK_PRESENTATION`, `AGE_RELATED_RISK`, `DECISION_OVERLAP_RISK`, `CONSIDER_WORKUP`), severity (`CRITICAL`/`WARNING`/`INFO`), complication name, message, evidence (similar cases count, complication rate, deaths, mortality %, patient-specific adjustment, age-adjusted mortality, age-adjusted complication rate), patient-specific risk factors, adjusted risk %, recommendation (action + message), urgency, priority
- **Pattern matching** — recognized clinical patterns with confidence scores
- **Alternative paths analyzed** — what-if scenarios for roads not taken

### 5. Logistics

Physical resources and personnel:

- **Location** — department (ID, name, type: ED/ICU/OR/ward, floor, bed capacity), room (ID, name, type), bed (ID, type, occupied status, occupied since), vehicle (ID, type — if ambulance transfer)
- **Personnel assigned** — attending physician (ID, name, specialty, experience years, shift start, hours on shift, patient load), primary nurse (same fields), paramedics (same fields), additional staff
- **Equipment in use** — each with: equipment ID, type (cardiac monitor, ventilator, infusion pump, etc.), duration, cost
- **Consumables used** — each with: item name, quantity, cost
- **Department state** — current occupancy, staffing levels

### 6. Execution

What actually happened when the decision was carried out:

- **Timing** — started at, completed at, total duration (human-readable + seconds)
- **Events timeline** — chronological log of each event: timestamp, description (e.g. "IV access established", "First dose administered"), details, result, performed by whom, bed/room, dose given
- **Delays** — each with: delay type, resource involved, duration, reason, impact assessment, historical comparison (typical delay vs this delay, assessment)
- **Blockers** — each with: blocker type, description, resolution, duration blocked
- **Resources consumed** — personnel (person ID, time spent, activities, cost), medications (drug, amount/dose, total quantity, cost), equipment (item, duration, cost), consumables (item, quantity, cost)
- **Cost breakdown** — personnel EUR, medications EUR, equipment EUR, consumables EUR, investigations EUR, procedures EUR, total EUR

### 7. State After

Snapshot of the patient immediately after this decision was executed:

- **Location** — department name, ID, type, floor
- **Diagnosis** — primary name, ICD-10, confidence, status
- **Vitals** — blood pressure, heart rate, SpO2, O2 status
- **Active medications** — drug, dose, status
- **Active complications** — ID, type, severity, current status
- **Overall status** — condition description + trajectory (improving/stable/deteriorating)

### 8. Transition Outcome

Evaluation of whether the decision worked:

- **Success** — boolean: did the decision achieve its clinical goal?
- **As expected** — boolean: did reality match the prediction?
- **Prediction vs reality** — for each predicted complication: complication name, predicted probability %, did it occur (bool), severity predicted vs actual, assessment (accurate/inaccurate/partially accurate); plus list of unexpected complications that were NOT predicted
- **Net impact** — patient state change description, mortality risk change (delta %), cost incurred (EUR), overall assessment, decision quality rating

### 9. Metadata

- Node creation timestamp
- Data quality: completeness score (0–1), accuracy confidence (0–1)

### 10. Edges (Node Connections)

Each edge connecting two nodes: `from` node ID → `to` node ID, transition type, time elapsed (seconds)

### 11. Flow Analytics (Per-Patient Summary)

Computed across the entire patient graph:

- Total nodes, total duration (hours)
- Department utilization — each department visited with: entry/exit nodes, node count, personnel IDs, cost
- Investigation summary — total count, by type (laboratory, imaging, consultation, procedure), total cost
- Complication tracking — full timeline of every complication (introduced at, resolved at, permanent flag, was predicted flag, contributed to final outcome flag)
- Decision quality — total decisions, appropriate count, suboptimal count
- Cost analysis — total EUR, breakdown (personnel, investigations, procedures, medications, hospitalization, equipment), cost per day
- Outcome quality — final status, preventable complications count, quality score (0–1)

---

## Architecture

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui (radix-maia style) |
| **Icons** | Phosphor Icons |
| **Auth** | WorkOS AuthKit |
| **AI — Clinical Analysis** | MedGemma 27B (via HuggingFace Inference Endpoint, vLLM) |
| **AI — Presentation** | OpenAI GPT-4o-mini (streaming) |
| **Graph Database** | Neo4j Aura |
| **Document Database** | MongoDB Atlas (via Prisma) |
| **Data Source** | `patient-flows.json` (~100 patients, ~24 nodes each) |
| **Infrastructure** | AWS ECS Fargate, ALB, ECR, Secrets Manager, Route 53 |
| **CI/CD** | GitHub Actions → SonarQube → Gitleaks → Trivy → Docker → ECR → ECS |
| **DNS** | Cloudflare (authoritative) → AWS ALB |

### AI Pipeline (Dual-Model)

All 5 AI API routes use a two-phase architecture:

1. **Phase 1 — MedGemma** (`google/medgemma-27b-text-it`): Performs structured clinical analysis — diagnosis reasoning, drug interactions, risk assessment, pathway auditing, cross-case pattern analysis. Non-streaming, returns full clinical text.
2. **Phase 2 — OpenAI** (`gpt-4o-mini`): Takes MedGemma's raw clinical output and presents it as polished, user-friendly markdown. Streaming response to client.
3. **Fallback**: If MedGemma endpoint is unavailable, routes fall back to OpenAI-only mode.

### Cross-Case Analysis

Client-side computation (no API needed): patient similarity scoring, graph alignment, divergence point detection, outcome correlations — all computed from the patient graph data.

---

## Routes

| Route | Description |
|---|---|
| `/` | Sign-in page (unauthenticated) or redirect to `/dashboard` |
| `/auth/callback` | WorkOS OAuth callback |
| `/dashboard` | Overview stats — cost breakdown, risk heatmap, department load, critical alerts |
| `/dashboard/patients` | Filterable patient list |
| `/dashboard/patients/[id]` | Patient detail — interactive graph, timeline, cost tabs, cross-case panel |
| `/dashboard/add-patient` | Step-by-step new patient wizard with AI similarity matching |
| `/dashboard/ongoing` | Active/ongoing patient monitoring |
| `/dashboard/alerts` | AI-generated clinical alerts dashboard |

---

## Getting Started

```bash
cd itfest
npm install
npm run dev          # dev server with Turbopack (http://localhost:3000)
```

### Environment Variables (`.env.local`)

```env
# Auth
WORKOS_API_KEY=sk_...
WORKOS_CLIENT_ID=client_...
WORKOS_COOKIE_PASSWORD=<random-64-char-string>
NEXT_PUBLIC_WORKOS_REDIRECT_URI=http://localhost:3000/auth/callback

# AI
OPENAI_API_KEY=sk-proj-...
HF_TOKEN=hf_...
HF_ENDPOINT_URL=https://...endpoints.huggingface.cloud
HF_MODEL_ID=google/medgemma-27b-text-it

# Database
DATABASE_URL=mongodb://...
NEO4J_URI=neo4j+s://...
NEO4J_USERNAME=...
NEO4J_PASSWORD=...
NEO4J_DATABASE=...
```

### Commands

```bash
npm run dev          # dev server (Turbopack)
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run format       # prettier (ts/tsx only)
node scripts/generate-patient-flows.mjs   # regenerate mock data
```

---

## Deployment

**Production URL:** `https://medgraph.vulniq.org`

**Infrastructure:** AWS ECS Fargate behind an Application Load Balancer, with secrets injected from AWS Secrets Manager at container startup. CI/CD via GitHub Actions on push to `master`:

```
Push → Code Quality (lint, typecheck, SonarQube)
     → Security (Gitleaks secret scan, Trivy vulnerability scan)
     → Build Docker image → Push to ECR
     → Scan image with Trivy
     → Deploy to ECS (rolling update)
```

---

## License

Built for ITFest 2026 hackathon.
