import { useEffect, useState } from 'react';
import { isApiConfigured } from '../services/apiClient';
import {
  dbEventApiId,
  isUpcomingEvent,
  loadPatientUpcomingEvents,
  localApptsToUiEvents,
} from '../services/calendar';

function nextFromLocal(
  scheduledAppts: Array<{ id?: string; pid: string; date?: string; time: string; dur?: number; description?: string }>,
  patientId: string,
  patientName: string,
): { start: Date | null; meetingId: string | null } {
  const now = new Date();
  const events = localApptsToUiEvents(scheduledAppts || [], patientId, patientName)
    .filter((e) => isUpcomingEvent(e, now))
    .sort((a, b) => +a.start - +b.start);
  const next = events[0];
  return {
    start: next?.start ? new Date(next.start) : null,
    meetingId: next?.id ? dbEventApiId(next.id) : null,
  };
}

/** Earliest upcoming meeting for a patient (API calendar + local appts offline). */
export function usePatientNextMeeting(
  patientId: string,
  patientName: string,
  scheduledAppts: Array<{ id?: string; pid: string; date?: string; time: string; dur?: number; description?: string }>,
  patients: Array<{ id: string; name: string }>,
  calendarRefreshNonce = 0,
) {
  const [nextMeetingStart, setNextMeetingStart] = useState<Date | null>(null);
  const [nextMeetingId, setNextMeetingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!patientId) {
      setNextMeetingStart(null);
      setNextMeetingId(null);
      setLoading(false);
      return undefined;
    }

    if (!isApiConfigured()) {
      setLoading(false);
      const local = nextFromLocal(scheduledAppts || [], patientId, patientName);
      setNextMeetingStart(local.start);
      setNextMeetingId(local.meetingId);
      return undefined;
    }

    const ac = new AbortController();
    setLoading(true);
    loadPatientUpcomingEvents({
      patientId,
      patientName,
      scheduledAppts: scheduledAppts || [],
      signal: ac.signal,
      resolvePatientName: (id) => patients.find((p) => p.id === id)?.name,
    })
      .then((events) => {
        const next = events[0];
        setNextMeetingStart(next?.start ? new Date(next.start) : null);
        setNextMeetingId(next?.id ? dbEventApiId(next.id) : null);
        setLoading(false);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        const local = nextFromLocal(scheduledAppts || [], patientId, patientName);
        setNextMeetingStart(local.start);
        setNextMeetingId(local.meetingId);
        setLoading(false);
      });

    return () => { ac.abort(); };
  }, [patientId, patientName, scheduledAppts, patients, calendarRefreshNonce]);

  return { nextMeetingStart, nextMeetingId, loading };
}
