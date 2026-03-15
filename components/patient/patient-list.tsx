"use client";

import { useState, useMemo } from "react";
import type { PatientGraph } from "@/lib/types/patient";
import { PatientCard } from "./patient-card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MagnifyingGlass, Rows, SquaresFour, Funnel } from "@phosphor-icons/react";
import { getPatientSummary } from "@/lib/data/analytics";

interface PatientListProps {
  patients: PatientGraph[];
}

type SortField = "admission_date" | "los" | "cost" | "outcome" | "name";

export function PatientList({ patients }: PatientListProps) {
  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all");
  const [triageFilter, setTriageFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortField>("admission_date");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filtered = useMemo(() => {
    let result = patients;

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) => {
        const s = getPatientSummary(p);
        return (
          s.patient_id.toLowerCase().includes(q) ||
          s.patient_name.toLowerCase().includes(q) ||
          s.primary_diagnosis.toLowerCase().includes(q)
        );
      });
    }

    // Outcome filter
    if (outcomeFilter !== "all") {
      result = result.filter((p) => p.final_outcome.status === outcomeFilter);
    }

    // Triage filter
    if (triageFilter !== "all") {
      result = result.filter((p) => p.admission.triage_code === triageFilter);
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "admission_date":
          return new Date(b.admission.timestamp).getTime() - new Date(a.admission.timestamp).getTime();
        case "los":
          return b.discharge.duration_days - a.discharge.duration_days;
        case "cost":
          return b.final_outcome.summary.total_cost_eur - a.final_outcome.summary.total_cost_eur;
        case "name":
          return a.patient_name.localeCompare(b.patient_name);
        case "outcome": {
          const order: Record<string, number> = { DECEASED: 0, HEALED_WITH_COMPLICATIONS: 1, HEALED: 2 };
          return (order[a.final_outcome.status] ?? 3) - (order[b.final_outcome.status] ?? 3);
        }
        default:
          return 0;
      }
    });

    return result;
  }, [patients, search, outcomeFilter, triageFilter, sortBy]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search by name, ID, or diagnosis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outcomes</SelectItem>
            <SelectItem value="HEALED">Healed</SelectItem>
            <SelectItem value="HEALED_WITH_COMPLICATIONS">Complications</SelectItem>
            <SelectItem value="DECEASED">Deceased</SelectItem>
          </SelectContent>
        </Select>

        <Select value={triageFilter} onValueChange={setTriageFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Triage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Triage</SelectItem>
            <SelectItem value="RED">RED</SelectItem>
            <SelectItem value="ORANGE">ORANGE</SelectItem>
            <SelectItem value="YELLOW">YELLOW</SelectItem>
            <SelectItem value="GREEN">GREEN</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortField)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admission_date">Admission Date</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="los">Length of Stay</SelectItem>
            <SelectItem value="cost">Cost</SelectItem>
            <SelectItem value="outcome">Outcome</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-1">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            className="h-9 w-9"
            onClick={() => setViewMode("grid")}
          >
            <SquaresFour size={16} />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            className="h-9 w-9"
            onClick={() => setViewMode("list")}
          >
            <Rows size={16} />
          </Button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {patients.length} patients
      </p>

      {/* Patient grid/list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Funnel size={40} className="mb-3 text-muted-foreground" />
          <p className="text-sm font-medium">No patients found</p>
          <p className="text-xs text-muted-foreground">
            Try adjusting your search or filters
          </p>
        </div>
      ) : (
        <div
            className={
              viewMode === "grid"
                ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "grid gap-3 grid-cols-1"
            }
          >
            {filtered.map((p) => (
              <PatientCard key={p.patient_id} patient={p} />
            ))}
          </div>
      )}
    </div>
  );
}

