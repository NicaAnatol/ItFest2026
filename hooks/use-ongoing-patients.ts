"use client";

import { useState, useEffect, useCallback } from "react";
import type { OngoingPatient } from "@/lib/ongoing/types";

const STORAGE_KEY = "medgraph:ongoing-patients";
const MAX_ONGOING = 50;

// ─── Module-level pub/sub so multiple hook consumers stay in sync ───

type Listener = () => void;
const _listeners = new Set<Listener>();
function notify() {
  _listeners.forEach((l) => l());
}

function readStore(): OngoingPatient[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OngoingPatient[]) : [];
  } catch {
    return [];
  }
}

function writeStore(patients: OngoingPatient[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
  notify();
}

// ─── Hook ───

export function useOngoingPatients() {
  const [patients, setPatients] = useState<OngoingPatient[]>(() => readStore());

  // Subscribe to changes
  useEffect(() => {

    const refresh = () => setPatients(readStore());
    _listeners.add(refresh);

    // Sync across tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) refresh();
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      _listeners.delete(refresh);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const getById = useCallback(
    (id: string): OngoingPatient | null => {
      // Read directly from localStorage to avoid stale-state race on mount
      const all = readStore();
      return all.find((p) => p.id === id) ?? null;
    },
    [],
  );

  const save = useCallback(
    (patient: OngoingPatient) => {
      const current = readStore();
      const idx = current.findIndex((p) => p.id === patient.id);
      let next: OngoingPatient[];
      if (idx >= 0) {
        next = [...current];
        next[idx] = { ...patient, updatedAt: new Date().toISOString() };
      } else {
        if (current.length >= MAX_ONGOING) {
          throw new Error(`Maximum of ${MAX_ONGOING} ongoing patients reached.`);
        }
        next = [...current, { ...patient, updatedAt: new Date().toISOString() }];
      }
      writeStore(next);
    },
    [],
  );

  const remove = useCallback((id: string) => {
    const current = readStore();
    writeStore(current.filter((p) => p.id !== id));
  }, []);

  return { ongoingPatients: patients, getById, save, remove };
}

