"use client";

import { usePatientData } from "@/hooks/use-patient-data";
import { PatientList } from "@/components/patient/patient-list";
import { Skeleton } from "@/components/ui/skeleton";

export default function PatientsPage() {
  const { patients, loading, error } = usePatientData();

  if (error) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-destructive">Error loading data: {error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <Skeleton className="h-6 w-28" />
          <Skeleton className="mt-1 h-4 w-56" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Patients</h1>
        <p className="text-sm text-muted-foreground">
          Browse and filter all {patients.length} patient flows
        </p>
      </div>
      <PatientList patients={patients} />
    </div>
  );
}

