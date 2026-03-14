"use client";

import { useState, useEffect, useCallback } from "react";
import type { PatientFlowsData, PatientGraph } from "@/lib/types/patient";

let _cache: PatientFlowsData | null = null;
const _listeners = new Set<() => void>();

function notifyListeners() {
  for (const fn of _listeners) fn();
}

export function invalidatePatientCache() {
  _cache = null;
  notifyListeners();
}

export function usePatientData() {
  const [data, setData] = useState<PatientFlowsData | null>(_cache);
  const [loading, setLoading] = useState(!_cache);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (_cache) {
      setData(_cache);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch("/data/patient-flows.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load data");
        return res.json();
      })
      .then((json: PatientFlowsData) => {
        if (!cancelled) {
          _cache = json;
          setData(json);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Re-fetch when cache is invalidated
  useEffect(() => {
    const listener = () => load();
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  }, [load]);

  const deletePatient = useCallback(async (patientId: string) => {
    const res = await fetch(`/api/patients/${patientId}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
    _cache = null;
    notifyListeners();
  }, []);

  const savePatient = useCallback(async (patient: PatientGraph) => {
    const res = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patient),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
    _cache = null;
    notifyListeners();
    return res.json();
  }, []);

  return {
    data,
    patients: data?.patients ?? [],
    metadata: data?.metadata ?? null,
    loading,
    error,
    deletePatient,
    savePatient,
  };
}

export function usePatientById(id: string) {
  const { patients, loading, error } = usePatientData();
  const patient = patients.find((p) => p.patient_id === id) ?? null;
  return { patient, loading, error };
}
