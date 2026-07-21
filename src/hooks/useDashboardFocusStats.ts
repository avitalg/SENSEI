// Next meeting + awaiting follow-ups for the home focus zone / summary strip.
// Offline: scheduledAppts via dashboardStats. Live: upcoming `/calendar` range.
import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isApiConfigured } from '../services/apiClient';
import { dayKey, loadDashboardUpcomingEvents } from '../services/calendar';
import { dashboardStats, dashboardStatsFromEvents, type DashboardStats } from '../utils/dashboardStats';
import { queryKeys } from '../query/keys';

export type DashboardFocusStats = Pick<DashboardStats, 'next' | 'awaitingPids' | 'upcoming'> & {
  loading: boolean
};

export function useDashboardFocusStats(
  patients: Array<{ id: string; name?: string }> | undefined,
  scheduledAppts: any[] | undefined,
): DashboardFocusStats {
  const useApi = isApiConfigured();
  const now = new Date();

  const rangeStart = new Date(now);
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setDate(rangeEnd.getDate() + 90);
  const from = dayKey(rangeStart);
  const to = dayKey(rangeEnd);

  const patientsRef = useRef(patients);
  patientsRef.current = patients;

  const query = useQuery({
    queryKey: queryKeys.calendarUpcomingAll(from, to),
    queryFn: ({ signal }) => loadDashboardUpcomingEvents({
      signal,
      resolvePatientName: (pid) => patientsRef.current?.find((p) => p.id === pid)?.name,
    }),
    enabled: useApi,
    staleTime: 30_000,
    retry: false,
  });

  if (!useApi) {
    const stats = dashboardStats(scheduledAppts, patients, now);
    return {
      next: stats.next,
      awaitingPids: stats.awaitingPids,
      upcoming: stats.upcoming,
      loading: false,
    };
  }

  const focus = dashboardStatsFromEvents(query.data || [], patients, now);
  return {
    ...focus,
    loading: query.isLoading || (query.isFetching && !query.data),
  };
}
