// Canonical React Query keys for senseiapi-backed data.
import { clearPatientsCache } from './patientsCache';

export const queryKeys = {
  patients: ['patients'] as const,
  patientsArchived: ['patients', 'archived'] as const,
  calendar: ['calendar'] as const,
  calendarWeek: (from: string, to: string) => ['calendar', 'week', from, to] as const,
  /** Dashboard focus — all upcoming patient-linked meetings in a range. */
  calendarUpcomingAll: (from: string, to: string) => ['calendar', 'upcoming-all', from, to] as const,
  patientUpcoming: (patientId: string) => ['calendar', 'upcoming', patientId] as const,
  patientPast: (patientId: string) => ['calendar', 'past', patientId] as const,
};

export function invalidatePatients(client: { invalidateQueries: (opts: { queryKey: readonly unknown[] }) => unknown }) {
  clearPatientsCache();
  return client.invalidateQueries({ queryKey: queryKeys.patients });
}

export function invalidateCalendar(client: { invalidateQueries: (opts: { queryKey: readonly unknown[] }) => unknown }) {
  return client.invalidateQueries({ queryKey: queryKeys.calendar });
}
