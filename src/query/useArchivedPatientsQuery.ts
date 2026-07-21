import { useQuery } from '@tanstack/react-query';
import { isApiConfigured } from '../services/apiClient';
import { listPatients } from '../services/patients';
import { queryKeys } from './keys';
import { PATIENTS_STALE_MS } from './patientsCache';

/** Live archived roster from GET /patients?archived=true. */
export function useArchivedPatientsQuery() {
  return useQuery({
    queryKey: queryKeys.patientsArchived,
    queryFn: ({ signal }) => listPatients(signal, { archived: true }),
    enabled: isApiConfigured(),
    staleTime: PATIENTS_STALE_MS,
    retry: false,
  });
}
