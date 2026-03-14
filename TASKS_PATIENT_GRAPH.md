# 🏥 Modelarea Pacienților și Evaluarea Deciziilor — Subtasks

> **Scope:** Part I – Graph-Based Patient Modeling (Micro-Level)
> **Stack:** Next.js 16 (App Router, RSC) · shadcn/ui (radix-maia) · Tailwind v4 · Phosphor Icons
> **Data:** Mocked JSON in `public/data/patient-flows.json` (100 patients, ~24 nodes/patient)

---

## 📁 I. Data Layer & Types

### 1. TypeScript Type Definitions
- [ ] Create `lib/types/patient.ts` — core patient graph types:
  - `PatientGraph` (top-level: patient_id, admission, discharge, final_outcome, nodes, edges)
  - `PatientNode` (node_id, sequence, timestamp, duration, patient_state, logistics, decision, risk_assessment, historical_analysis, execution, state_after, transition_outcome, metadata)
  - `PatientEdge` (from, to, type)
  - `Admission`, `Discharge`, `FinalOutcome`
- [ ] Create `lib/types/patient-state.ts` — patient state sub-types:
  - `Demographics`, `MedicalHistory`, `ChronicCondition`, `Allergy`
  - `Diagnosis`, `DifferentialDiagnosis`
  - `Vitals`, `LabResults`, `ImagingResult`
  - `Symptom`, `Medication`, `Complication`
  - `RiskScores`
- [ ] Create `lib/types/decision.ts` — decision & risk types:
  - `Decision`, `DecisionMaker`, `Reasoning`, `Order`, `Alternative`
  - `RiskAssessment`, `PotentialComplication`, `InteractionRisk`, `OverlappingDecision`
- [ ] Create `lib/types/historical.ts` — historical analysis types:
  - `HistoricalAnalysis`, `SimilarCases`, `Flag`, `PatternMatch`, `DeadlyPattern`
- [ ] Create `lib/types/logistics.ts` — logistics types:
  - `Location`, `Department`, `Room`, `Bed`
  - `PersonnelAssigned`, `EquipmentInUse`, `DepartmentState`
- [ ] Create `lib/types/execution.ts` — execution types:
  - `Execution`, `ExecutionEvent`, `ResourcesConsumed`, `CostBreakdown`

### 2. Data Fetching Utilities
- [ ] Create `lib/data/patients.ts` — data fetch + helpers:
  - `getAllPatients()` — fetch & parse from `/data/patient-flows.json`
  - `getPatientById(id)` — single patient lookup
  - `getPatientNodes(id)` — all nodes for a patient
  - `getNodeById(patientId, nodeId)` — single node detail
  - `getPatientEdges(id)` — edge list for graph rendering
  - `getMetadata()` — global stats (total patients, outcomes, diagnoses distribution)
- [ ] Create `lib/data/analytics.ts` — computed analytics:
  - `getOutcomeDistribution()` — healed / complicated / deceased counts & %
  - `getDiagnosisDistribution()` — diagnosis breakdown
  - `getAvgLOS()` — average length of stay
  - `getFlaggedDecisions(patientId)` — all nodes with non-empty flags
  - `getComplicationsTimeline(patientId)` — complication events sorted by time
  - `getCostBreakdown(patientId)` — cumulative cost per department/type
  - `getDecisionQualityMetrics(patientId)` — appropriate vs suboptimal decisions

---

## 🧩 II. Shared UI Components (shadcn + custom)

### 3. Install Required shadcn Components
- [ ] Add shadcn components (via `npx shadcn@latest add`):
  - `card`, `badge`, `table`, `tabs`, `tooltip`, `dialog`, `sheet`
  - `select`, `separator`, `scroll-area`, `progress`, `avatar`
  - `accordion`, `alert`, `collapsible`, `skeleton`, `popover`
  - `command` (for search/filter), `dropdown-menu`

### 4. Custom Domain Components
- [ ] `components/patient/patient-card.tsx` — summary card for a patient:
  - Name, ID, age/gender, primary diagnosis
  - Outcome badge (color-coded: green/yellow/red for HEALED/COMPLICATED/DECEASED)
  - Admission date, LOS, total cost, node count
  - Triage badge (RED/ORANGE/YELLOW/GREEN)
- [ ] `components/patient/patient-list.tsx` — filterable/searchable patient list:
  - Search by name/ID
  - Filter by outcome status, diagnosis, triage code
  - Sort by admission date, LOS, cost, outcome
  - Grid/list view toggle
- [ ] `components/patient/outcome-badge.tsx` — reusable outcome badge:
  - HEALED → green, HEALED_WITH_COMPLICATIONS → amber, DECEASED → red
  - Icon: CheckCircle / Warning / Skull (Phosphor)
- [ ] `components/patient/triage-badge.tsx` — triage code badge:
  - RED / ORANGE / YELLOW / GREEN with matching colors
- [ ] `components/patient/vitals-display.tsx` — compact vitals card:
  - BP, HR, RR, SpO2, Temp, Pain, GCS
  - Color-coded: normal/warning/critical ranges
  - Optional trend arrows (↑/↓/→)
- [ ] `components/patient/diagnosis-card.tsx` — current diagnosis panel:
  - Primary diagnosis with confidence bar
  - Differential diagnoses as mini bar chart
  - ICD-10 codes

### 5. Graph Visualization Components
- [ ] `components/graph/patient-graph.tsx` — main graph canvas:
  - Render nodes as connected cards on a horizontal timeline
  - Edges as animated connecting lines
  - Color-code nodes by action_category (admission, triage, diagnostic, treatment, disposition)
  - Highlight flagged nodes (pulsing border or icon)
  - Pan/zoom support
  - Click node → expand detail
- [ ] `components/graph/graph-node.tsx` — single graph node:
  - Compact view: sequence #, action, timestamp, department icon
  - Severity indicator dot
  - Flag count indicator
  - Transition outcome status (success/failure icon)
  - Hover: quick tooltip with decision + risk summary
- [ ] `components/graph/graph-edge.tsx` — edge between nodes:
  - Animated dash line or solid based on type (sequential, complication, etc.)
  - Duration label on edge
- [ ] `components/graph/graph-timeline.tsx` — alternative linear timeline view:
  - Vertical timeline with timestamps on left
  - Decision cards on right
  - Department color stripes
  - Complication markers

### 6. Decision & Risk Components
- [ ] `components/decision/decision-detail.tsx` — full decision panel:
  - Action, category, made_by info
  - Reasoning with supporting evidence list
  - Guidelines followed
  - Orders list (medication, lab, imaging, transfer)
  - Expected outcome + timeline
- [ ] `components/decision/alternatives-panel.tsx` — alternative decisions considered:
  - Comparison cards: option, pros/cons, why not chosen
  - Historical outcomes if that alternative was chosen
  - Visual comparison bars (mortality rate, bleeding rate, etc.)
- [ ] `components/decision/risk-assessment-card.tsx` — risk visualization:
  - Mortality risk gauge (baseline → adjusted → total)
  - Complication risk breakdown (minor/moderate/severe)
  - Contributing factors as stacked bar
- [ ] `components/decision/risk-gauge.tsx` — circular/semicircular risk gauge:
  - 0-100% with color gradient (green → yellow → red)
  - Animated fill on mount

### 7. Alert & Flag Components
- [ ] `components/alerts/ai-flag.tsx` — individual AI flag card:
  - Severity icon + color (INFO=blue, WARNING=amber, CRITICAL=red)
  - Flag type badge
  - Message, evidence summary
  - Recommendation with actionable steps
  - Historical evidence stats
- [ ] `components/alerts/flag-list.tsx` — aggregated flags per node:
  - Sorted by severity
  - Expandable details
  - Count summary (e.g., "2 warnings, 1 info")
- [ ] `components/alerts/ai-alert-banner.tsx` — prominent alert banner for critical decisions:
  - Risk percentage with comparison (8.1% baseline → 12% adjusted)
  - Recommendation (PROCEED / CAUTION / ALTERNATIVE)
  - Collapsible detail section with full evidence

### 8. Historical Analysis Components
- [ ] `components/historical/similar-cases-panel.tsx` — historical comparison:
  - Total similar cases count
  - Outcome pie/donut chart (healed/complicated/deceased)
  - Complication frequency table
  - Time-to-diagnosis stats
- [ ] `components/historical/pattern-match-card.tsx` — matched patterns:
  - Pattern name + similarity % bar
  - Pattern outcomes (mortality, complication rate, success rate)
  - Deadly pattern warnings with key differences
- [ ] `components/historical/outcome-comparison-chart.tsx` — bar/pie chart:
  - Compare chosen path vs alternatives
  - Mortality rate, bleeding rate, success rate side by side

### 9. Execution & Cost Components
- [ ] `components/execution/execution-timeline.tsx` — events timeline:
  - Each event as a row: timestamp, event, details
  - Delays highlighted in amber
  - Blockers highlighted in red
- [ ] `components/execution/cost-breakdown.tsx` — cost visualization:
  - Donut chart: personnel, medications, equipment, consumables, investigations
  - Total cost prominent
  - Comparison to average for similar cases
- [ ] `components/execution/resources-panel.tsx` — personnel & equipment used:
  - Personnel cards with time spent, cost, activities
  - Equipment list with duration
  - Consumables itemized

---

## 📄 III. Pages & Routes

### 10. Dashboard Page — `/dashboard`
- [ ] `app/dashboard/page.tsx` — overview dashboard:
  - Global stats cards: total patients, outcome distribution, avg LOS, total cost
  - Diagnosis distribution bar chart
  - Recent patients list (top 10 by admission)
  - Outcome trend (if time data allows)
  - Quick search to jump to patient
- [ ] `app/dashboard/layout.tsx` — dashboard layout with:
  - Sidebar navigation (Dashboard, Patients, Analytics)
  - Top bar with title + dark mode toggle
  - Responsive: collapsible sidebar on mobile

### 11. Patients List Page — `/dashboard/patients`
- [ ] `app/dashboard/patients/page.tsx`:
  - Full patient-list component with filters
  - Pagination (or virtual scroll for 100 patients)
  - Empty state if no matches
  - Loading skeletons

### 12. Patient Detail Page — `/dashboard/patients/[id]`
- [ ] `app/dashboard/patients/[id]/page.tsx` — patient deep-dive:
  - **Header:** Patient name, ID, demographics, outcome badge, LOS, cost
  - **Tabs:**
    - **Graph View** — interactive patient graph (graph-canvas component)
    - **Timeline View** — linear timeline of all decisions
    - **Complications** — complication tracking with timeline
    - **Cost Analysis** — cost breakdown charts
    - **Summary** — admission, discharge, final outcome details

### 13. Node Detail Panel — (Sheet/Dialog from patient detail)
- [ ] `components/patient/node-detail-sheet.tsx` — side sheet for node detail:
  - **Patient State:** vitals, diagnosis, active medications, complications
  - **Decision:** full decision-detail component
  - **Risk Assessment:** risk-assessment-card
  - **AI Flags:** flag-list with all flags for this node
  - **Historical Analysis:** similar-cases-panel, pattern-match cards
  - **Execution:** execution-timeline, cost-breakdown
  - **Transition Outcome:** success/failure, prediction vs reality, lessons

---

## ⚙️ IV. Backend / Data Processing Utilities

### 14. Graph Processing
- [ ] `lib/graph/graph-utils.ts` — graph manipulation helpers:
  - `buildAdjacencyList(edges)` — convert edge list to adjacency list
  - `getNodeDepth(nodeId, edges)` — node depth in graph
  - `getCriticalPath(nodes, edges)` — longest path (LOS bottleneck)
  - `getDepartmentTransitions(nodes)` — list of department changes
  - `getNodesByDepartment(nodes)` — group nodes by department

### 15. Risk Calculation Helpers
- [ ] `lib/risk/risk-utils.ts`:
  - `calculateAdjustedRisk(baseRisk, factors)` — apply patient-specific risk factors
  - `getRiskLevel(probability)` → 'low' | 'moderate' | 'high' | 'critical'
  - `getRiskColor(level)` → CSS color string
  - `formatRiskPercentage(value)` — display "8.1%" style

### 16. Decision Analysis Helpers
- [ ] `lib/decision/decision-utils.ts`:
  - `getDecisionQuality(node)` → 'APPROPRIATE' | 'SUBOPTIMAL'
  - `countFlagsBySeverity(flags)` → { info, warning, critical }
  - `hasDeadlyPatternMatch(node)` → boolean
  - `compareAlternatives(decision)` — structured comparison data

### 17. Formatting & Display Utilities
- [ ] `lib/utils/format.ts`:
  - `formatDuration(seconds)` → "2h 45min"
  - `formatTimestamp(iso)` → "Mar 14, 2024 08:00"
  - `formatCurrency(eur)` → "€15,420"
  - `formatVitalValue(vital, value)` → value + unit + status color
  - `getVitalStatus(type, value)` → 'normal' | 'warning' | 'critical'
  - `formatDiagnosisName(snakeCase)` → "Bilateral Pulmonary Embolism"
  - `getTriageColor(code)` → color map for RED/ORANGE/YELLOW/GREEN
  - `getOutcomeIcon(status)` → Phosphor icon name

---

## 🎨 V. Styling & Design System

### 18. Theme & Design Tokens
- [ ] Extend `globals.css` with medical-domain CSS variables:
  - Outcome colors: `--color-healed`, `--color-complicated`, `--color-deceased`
  - Triage colors: `--color-triage-red`, `--color-triage-orange`, etc.
  - Risk gradient: `--color-risk-low`, `--color-risk-moderate`, `--color-risk-high`, `--color-risk-critical`
  - Department colors: unique color per department (ER, ICU, Radiology, etc.)
  - Flag severity colors: `--color-flag-info`, `--color-flag-warning`, `--color-flag-critical`
- [ ] Create smooth animations:
  - Graph node entrance (fade + scale)
  - Edge drawing (stroke-dasharray animation)
  - Risk gauge fill animation
  - Flag pulse for critical alerts
  - Skeleton shimmer for loading

### 19. Responsive Design
- [ ] Mobile-first layouts for all pages
- [ ] Sidebar → bottom nav on mobile
- [ ] Graph view: horizontal scroll on mobile, pan/zoom on desktop
- [ ] Node detail: full-screen sheet on mobile, side sheet on desktop
- [ ] Table → card list on small screens

---

## ✅ VI. Integration & Polish

### 20. Navigation & Layout
- [ ] Update `app/layout.tsx` — add navigation wrapper
- [ ] Create sidebar component with links:
  - Dashboard, Patients, (future: Analytics)
- [ ] Add breadcrumbs on patient detail pages
- [ ] Add "Back to list" navigation

### 21. Search & Filtering
- [ ] Global patient search (Command palette style using shadcn `command`)
- [ ] Patient list filters: outcome, diagnosis, triage, date range
- [ ] Node-level filtering within patient graph (by department, by flag severity)

### 22. Loading & Error States
- [ ] Skeleton loaders for all data-heavy components
- [ ] Error boundaries with retry for data fetching
- [ ] Empty states with helpful messages
- [ ] 40MB JSON loading optimization:
  - Consider chunked loading or pre-processed smaller JSON files
  - Loading progress indicator
  - Cache fetched data in memory (React context or simple store)

### 23. Accessibility & SEO
- [ ] Proper heading hierarchy on all pages
- [ ] ARIA labels for interactive graph elements
- [ ] Keyboard navigation for graph nodes
- [ ] Proper page titles and meta descriptions for each route
- [ ] Color contrast compliance (especially for risk/triage colors)

---

## 📋 Task Priority Order (Recommended)

| Phase | Tasks | Focus |
|-------|-------|-------|
| **Phase 1 — Foundation** | #1, #2, #17, #18 | Types, data layer, utilities, design tokens |
| **Phase 2 — Core UI** | #3, #4, #5, #6 | shadcn install, patient cards, badges, vitals |
| **Phase 3 — Graph** | #5 (graph components), #14 | Graph visualization + node rendering |
| **Phase 4 — Decision & Risk** | #6, #7, #8 | Decision panels, AI flags, historical |
| **Phase 5 — Pages** | #10, #11, #12, #13, #20 | Dashboard, list, detail, navigation |
| **Phase 6 — Polish** | #9, #15, #16, #19, #21, #22, #23 | Execution, search, responsive, a11y |
