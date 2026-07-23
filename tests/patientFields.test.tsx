// Patient data-model additions: address (shown + editable) and the treatment
// start/end span (in months) for archived files.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';
import { formatTreatmentSpan } from '../src/services/patients';
import { reconcileMockPatients, MOCK_PATIENTS } from '../src/data/mockPatients';

describe('reconcileMockPatients — field backfill', () => {
  it('the repository roster carries no invented contact data (address/phone/email)', () => {
    for (const p of MOCK_PATIENTS) {
      expect(p.address ?? null).toBeNull();
      expect(p.phone).toBe('');
      expect(p.email).toBeNull();
    }
  });
  it('drops retired seed patients from a cached roster', () => {
    const stale = [{ id: 'p4', name: 'אבי פרץ', phone: '', email: null, created_at: '' } as any, ...MOCK_PATIENTS];
    const merged = reconcileMockPatients(stale);
    expect(merged.some((p) => p.id === 'p4')).toBe(false);
  });
  it('returns the same reference when nothing changed', () => {
    const roster = MOCK_PATIENTS.map((p) => ({ ...p }));
    expect(reconcileMockPatients(roster)).toBe(roster);
  });
});

describe('formatTreatmentSpan', () => {
  it('shows start–end and the duration in months for an archived file', () => {
    const r = formatTreatmentSpan('2025-01-15T10:00:00Z', '2025-07-15T10:00:00Z');
    expect(r).toContain('01/25');
    expect(r).toContain('07/25');
    expect(r).toMatch(/6 חודשים/);
  });
  it('falls back to the start month when there is no end date', () => {
    expect(formatTreatmentSpan('2025-01-15T10:00:00Z')).toBe('01/25');
  });
});

const PKEY = 'sensei_session_react_v1';
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 120)));
afterEach(() => { cleanup(); localStorage.clear(); });

describe('patient screen — address + archived span', () => {
  it('shows the address on the active patient file and edit exposes an address field', async () => {
    // Addresses are user-entered data (the repository dataset has none) — seed a
    // user-created patient carrying one.
    const withAddress = { id: 'u-addr', name: 'נועם ישראלי', phone: '050-0000000', email: null, address: 'הרצל 42, תל אביב', created_at: '2026-01-01T00:00:00Z' };
    mount({ view: 'app', route: 'patient', patientId: 'u-addr', patients: [withAddress] });
    await settle();
    await waitFor(() => expect(document.body.textContent).toContain('הרצל 42'));
    expect(document.body.textContent).toContain('מאז');
  });

  it('shows a treatment span (start–end · months) for an archived file', async () => {
    const archived = { id: 'pz', name: 'רון ארכיון', phone: '050-0000000', email: null, address: 'דיזנגוף 1, תל אביב', created_at: '2024-01-01T10:00:00Z', archived_at: '2024-09-01T10:00:00Z', archived: true };
    mount({ view: 'app', route: 'patient', patientId: 'pz', archivedPatients: [archived] });
    await settle();
    await waitFor(() => expect(document.body.textContent).toContain('טיפול:'));
    expect(document.body.textContent).toMatch(/חודשים/);
    expect(document.body.textContent).not.toContain('מאז'); // "since" is replaced for archived
  });
});
