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

  it('does not invent upcoming meetings from historical cadence', () => {
    const appts = buildMockScheduledAppts(new Date('2026-06-17T10:00:00Z'));
    expect(appts).toEqual([]);
    expect(localApptsToUiEvents(appts, MOCK_PATIENTS[0].id, MOCK_PATIENTS[0].name)).toEqual([]);
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

  it('removes retired projections while preserving user-created appointments', () => {
    const cached = [
      { id: 'mock-appt-simba-1', pid: 'simba', date: '2026-07-30', time: '10:00', dur: 50, description: 'פגישה שבועית' },
      { id: 'user-1', pid: 'simba', date: '2026-08-02', time: '12:00', dur: 50, description: 'נקבע ידנית' },
    ];
    const merged = reconcileMockAppts(cached);
    expect(merged.map((a) => a.id)).toEqual(['user-1']);
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
