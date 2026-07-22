// Shared agenda helpers — resolve the patient behind a calendar event and build
// its one-line "previously on" recap. Used by the calendar grid (event → detail)
// and the dashboard's today-agenda list, so both surfaces decode events the same
// way instead of each re-deriving it.
import { eventGuestName, type CalendarUiEvent } from '../services/calendar';
import { sessionSummaries } from '../data/sessions';

/** Patient id behind an event: explicit `patientId`, else match guest name against the roster. */
export function eventPatientId(ev: CalendarUiEvent, patients: { id: string; name: string }[]): string | null {
  if (ev.patientId) return ev.patientId;
  const name = eventGuestName(ev);
  return patients.find((p) => p.name === name)?.id ?? null;
}

/** The patient's most recent session summary, trimmed to `max` chars for a one-line agenda recap. */
export function eventRecap(ev: CalendarUiEvent, patients: { id: string; name: string }[], max = 96): string {
  const pid = eventPatientId(ev, patients);
  if (!pid) return '';
  const sum = sessionSummaries({ id: pid })[0] || '';
  return sum.length > max ? sum.slice(0, max).trim() + '…' : sum;
}
