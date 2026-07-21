import { useQuery } from '@tanstack/react-query';
import { isApiConfigured } from '../services/apiClient';
import { listPatients } from '../services/patients';
import { queryKeys } from './keys';
import {
  PATIENTS_STALE_MS,
  readPatientsCache,
  writePatientsCache,
} from './patientsCache';

/** Live roster from GET /patients. Disabled when mock data-source is active. */
export function usePatientsQuery() {
  const cached = isApiConfigured() ? readPatientsCache() : null;

  return useQuery({
    queryKey: queryKeys.patients,
    queryFn: async ({ signal }) => {
      const patients = await listPatients(signal);
      writePatientsCache(patients);
      return patients;
    },
    enabled: isApiConfigured(),
    staleTime: PATIENTS_STALE_MS,
    // Warm start from the last successful fetch so a hard refresh within
    // PATIENTS_STALE_MS does not hit the network (initialDataUpdatedAt keeps it fresh).
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.updatedAt,
  });
}
