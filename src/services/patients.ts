// Patient service — senseiapi `/patients` CRUD + archive lifecycle.
import { apiRequest, isApiConfigured } from './apiClient';
import { MOCK_PATIENTS } from '../data/mockPatients';
import { AVATAR_PALETTE } from '../utils';

export interface Patient {
  id: string
  name: string
  phone: string
  email: string | null
  address?: string | null
  created_at: string
  /** When the file was archived — the treatment "end date". */
  archived_at?: string | null
  archived?: boolean
}

export interface PatientCreatePayload {
  name: string
  phone: string
  email?: string | null
  address?: string | null
}

export interface PatientUpdatePayload {
  name?: string
  phone?: string
  email?: string | null
  address?: string | null
}

function normalizePatient(patient: Patient): Patient {
  const archived = !!patient.archived || !!patient.archived_at;
  return {
    ...patient,
    archived,
    archived_at: archived ? (patient.archived_at || null) : null,
  };
}

/** Active roster by default; pass `{ archived: true }` for archived files. */
export async function listPatients(
  signal?: AbortSignal,
  opts?: { archived?: boolean },
): Promise<Patient[]> {
  const archived = opts?.archived === true;
  const patients = await apiRequest<Patient[]>('/patients', {
    signal,
    query: archived ? { archived: true } : undefined,
  });
  return patients.map(normalizePatient);
}

/** Load from API when configured; use mock roster only when VITE_API_BASE_URL is unset. */
export async function loadPatientsWithFallback(fallback: Patient[]): Promise<{ patients: Patient[]; source: 'api' | 'mock' }> {
  if (!isApiConfigured()) {
    const roster = fallback.length ? fallback : MOCK_PATIENTS;
    return {
      patients: roster.filter((p) => !p.archived),
      source: 'mock',
    };
  }
  try {
    return { patients: await listPatients(), source: 'api' };
  } catch {
    return { patients: [], source: 'api' };
  }
}

/** Archived files — live `GET /patients?archived=true`, or local fallback offline. */
export async function loadArchivedPatientsWithFallback(fallback: Patient[]): Promise<{ patients: Patient[]; source: 'api' | 'mock' }> {
  if (!isApiConfigured()) {
    return {
      patients: fallback.filter((p) => !!p.archived),
      source: 'mock',
    };
  }
  try {
    return { patients: await listPatients(undefined, { archived: true }), source: 'api' };
  } catch {
    return { patients: [], source: 'api' };
  }
}

export async function createPatient(payload: PatientCreatePayload): Promise<Patient> {
  const body: PatientCreatePayload = {
    name: payload.name.trim(),
    phone: payload.phone.trim(),
  };
  const email = payload.email?.trim();
  if (email) body.email = email;
  const created = await apiRequest<Patient>('/patients', { method: 'POST', body });
  return normalizePatient(created);
}

// PATCH /patients/{id} accepts phone/email/archived. name/address changes
// persist client-side only and are merged into the response.
export async function updatePatient(id: string, payload: PatientUpdatePayload): Promise<Patient> {
  const body: { phone?: string; email?: string | null } = {};
  if (payload.phone !== undefined) body.phone = payload.phone.trim();
  if ('email' in payload) body.email = payload.email?.trim() || null;
  const updated = await apiRequest<Patient>('/patients/' + encodeURIComponent(id), { method: 'PATCH', body });
  const merged = normalizePatient(updated);
  if (payload.name !== undefined) merged.name = payload.name.trim();
  if ('address' in payload) merged.address = payload.address?.trim() || null;
  return merged;
}

/** PATCH archive flag on the server. */
export async function setPatientArchived(id: string, archived: boolean): Promise<Patient> {
  const updated = await apiRequest<Patient>('/patients/' + encodeURIComponent(id), {
    method: 'PATCH',
    body: { archived },
  });
  return normalizePatient(updated);
}

/** Local lifecycle transform for offline/demo mode. */
export function archivePatient(patient: Patient): Patient {
  return { ...patient, archived: true, archived_at: new Date().toISOString() };
}

/** Local lifecycle transform for offline/demo mode. */
export function restorePatient(patient: Patient): Patient {
  return { ...patient, archived: false, archived_at: null };
}

export async function deletePatient(id: string): Promise<void> {
  return apiRequest<void>('/patients/' + encodeURIComponent(id), { method: 'DELETE' });
}

export function patientInitials(name: string): string {
  return (name || '').trim().split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('') || '—';
}

export function patientAvatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

export function formatPatientSince(created_at: string): string {
  const d = new Date(created_at);
  if (Number.isNaN(d.getTime())) return '—';
  return String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getFullYear() % 100).padStart(2, '0');
}

export function displayPatientEmail(email: string | null | undefined): string {
  return email && email.trim() ? email.trim() : '—';
}

export function localPatient(payload: PatientCreatePayload): Patient {
  return {
    id: 'p' + Date.now(),
    name: payload.name.trim(),
    phone: payload.phone.trim(),
    email: payload.email?.trim() || null,
    address: payload.address?.trim() || null,
    created_at: new Date().toISOString(),
    archived: false,
  };
}

/** Treatment span for an archived file: "MM.YYYY–MM.YYYY · N חודשים". */
export function formatTreatmentSpan(created_at: string, archived_at?: string | null): string {
  const start = new Date(created_at);
  if (Number.isNaN(start.getTime())) return '—';
  const end = archived_at ? new Date(archived_at) : null;
  const startLabel = formatPatientSince(created_at);
  if (!end || Number.isNaN(end.getTime())) return startLabel;
  const months = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
  return startLabel + '–' + formatPatientSince(archived_at as string) + ' · ' + months + ' חודשים';
}
