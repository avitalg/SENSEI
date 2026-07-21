// Snapshot of the last successful GET /patients for React Query warm-start.
// Separate from session PERSIST_KEYS so API mode can wipe mock roster without
// losing this short-lived cache.
import type { Patient } from '../services/patients';

const CACHE_KEY = 'sensei_patients_rq_v1';

/** How long a cached roster stays "fresh" across reloads (matches usePatientsQuery staleTime). */
export const PATIENTS_STALE_MS = 5 * 60_000;

export interface PatientsCacheSnapshot {
  data: Patient[]
  updatedAt: number
}

export function readPatientsCache(): PatientsCacheSnapshot | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PatientsCacheSnapshot;
    if (!parsed || !Array.isArray(parsed.data) || typeof parsed.updatedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePatientsCache(data: Patient[]): void {
  try {
    const snap: PatientsCacheSnapshot = { data, updatedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(snap));
  } catch { /* private mode / quota */ }
}

export function clearPatientsCache(): void {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* */ }
}
