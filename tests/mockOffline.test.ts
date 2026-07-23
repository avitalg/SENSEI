import { describe, expect, it, vi, afterEach } from 'vitest';
import { buildMockScheduledAppts, MOCK_PATIENTS, reconcileMockAppts, reconcileMockPatients } from '../src/data/mockPatients';
import { localApptsToUiEvents } from '../src/services/calendar';
import { repoPatients } from '../src/data/mockPatientsRepo';

afterEach(() => { vi.unstubAllEnvs(); });

describe('offline mock roster', () => {
  it('includes the repository roster (one patient per mock_patients folder)', () => {
    expect(MOCK_PATIENTS).toHaveLength(repoPatients().length);
    expect(MOCK_PATIENTS.map((p) => p.id)).toEqual(repoPatients().map((rp) => rp.id));
    expect(MOCK_PATIENTS.find((p) => p.id === 'simba')?.name).toBe('סימבה');
    expect(MOCK_PATIENTS.find((p) => p.id === 'forrest_gump')?.name).toBe('פורסט גאמפ');
    expect(MOCK_PATIENTS.find((p) => p.id === 'harry_potter')?.name).toBe('הארי פוטר');
    // Contact details are not part of the dataset — never invented.
    for (const p of MOCK_PATIENTS) { expect(p.phone).toBe(''); expect(p.email).toBeNull(); }
  });

  it('builds upcoming meetings for each demo patient', () => {
    const appts = buildMockScheduledAppts(new Date('2026-06-17T10:00:00Z'));
    expect(appts.length).toBeGreaterThanOrEqual(5);
    for (const patient of MOCK_PATIENTS) {
      const upcoming = localApptsToUiEvents(appts, patient.id, patient.name, new Date('2026-06-17T10:00:00Z'));
      expect(upcoming.length).toBeGreaterThan(0);
    }
  });

  it('merges new demo patients into a cached offline roster', () => {
    const cached = MOCK_PATIENTS.slice(0, 4);
    const merged = reconcileMockPatients(cached);
    expect(merged).toHaveLength(MOCK_PATIENTS.length);
    expect(merged.find((p) => p.id === 'simba')?.name).toBe('סימבה');
  });

  it('drops the retired pre-repository seed roster (p1–p7) from a cached roster', () => {
    const stale = [{ id: 'p1', name: 'דנה לוי', phone: '', email: null, created_at: '' } as any, ...MOCK_PATIENTS.slice(0, 2)];
    const merged = reconcileMockPatients(stale);
    expect(merged.some((p) => p.id === 'p1')).toBe(false);
    expect(merged).toHaveLength(MOCK_PATIENTS.length);
  });

  it('merges new demo appointments into a cached offline schedule', () => {
    const cached = buildMockScheduledAppts().slice(0, 8);
    const merged = reconcileMockAppts(cached);
    expect(merged.length).toBeGreaterThan(cached.length);
    expect(merged.some((a) => a.pid === 'simba')).toBe(true);
  });
});

describe('loadPatientsWithFallback — mock only without API URL', () => {
  it('uses the mock roster when VITE_API_BASE_URL is unset', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_API_BASE_URL', '');
    const { loadPatientsWithFallback } = await import('../src/services/patients');
    const { patients, source } = await loadPatientsWithFallback([]);
    expect(source).toBe('mock');
    expect(patients).toHaveLength(repoPatients().length);
    expect(patients[0].name).toBe(repoPatients()[0].name);
  });
});
