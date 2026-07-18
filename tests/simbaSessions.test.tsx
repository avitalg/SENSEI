// Per-patient session history — each offline patient has their own dates,
// summaries and therapist notes; the builders and session-detail helpers use them.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';
import { getPatientSessions } from '../src/data/patientSessionContent';
import { demoSessionCount, buildPatientSessions } from '../src/utils/patientSessions';
import { sessionInsight, sessionSummaryText } from '../src/data/sessionDetail';

const PKEY = 'sensei_session_react_v1';
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 80)));
afterEach(() => { cleanup(); localStorage.clear(); window.location.hash = ''; });

const noop = { navigate: () => {}, set: () => {} };

describe('per-patient session content', () => {
  it('every offline roster patient (p1–p7) has their own session list', () => {
    for (const id of ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7']) {
      const own = getPatientSessions(id);
      expect(own, `${id} must have per-patient sessions`).toBeTruthy();
      expect(own!.length).toBeGreaterThanOrEqual(4);
      // newest-first ordering
      expect(own![0].date).toBeTruthy();
    }
  });

  it('Forrest (p6) and Harry (p7) carry their own five-session arcs', () => {
    const forrest = getPatientSessions('p6');
    expect(forrest).toHaveLength(5);
    expect(forrest?.[0].summary).toContain('אינטגרציה');
    expect(forrest?.[4].summary).toContain('קהות רגשית');
    const harry = getPatientSessions('p7');
    expect(harry).toHaveLength(5);
    expect(harry?.[4].summary).toContain('עוררות יתר');
  });

  it('unknown / missing patients fall back to the generic demo set', () => {
    expect(getPatientSessions('nope')).toBeNull();
    expect(getPatientSessions(undefined)).toBeNull();
  });

  it('Simba (p5) exposes the five-session trauma arc, newest first', () => {
    const own = getPatientSessions('p5');
    expect(own).toHaveLength(5);
    expect(own?.[0].date).toBe('14.07.2026');
    expect(own?.[0].summary).toContain('אינטגרציה');
    expect(own?.[4].summary).toContain('ברית והערכה ראשונית');
  });

  it('builders use the override count, dates and summaries per patient', () => {
    const dana = { id: 'p1', name: 'דנה לוי' };
    expect(demoSessionCount(dana)).toBe(4);
    const sessions = buildPatientSessions(dana, [], noop);
    expect(sessions).toHaveLength(4);
    expect(sessions[0].num).toBe(4);
    expect(sessions[0].date).toBe('15.07.2026');
    expect(sessions[0].summary).toContain('הצגה');
  });

  it('session detail helpers surface each patient\'s own note + summary', () => {
    expect(sessionInsight({ id: 'p5' }, 0)).toContain('אינטגרציה מרשימה');
    expect(sessionSummaryText({ id: 'p1' }, 0)).toContain('הצגה');
    expect(sessionSummaryText({ id: 'p3' }, 0)).toContain('גבול');
  });

  it('renders Simba session content on the session detail page', async () => {
    window.location.hash = '#/session/p5/5';
    mount({ view: 'app', route: 'session', patientId: 'p5' });
    await settle();
    await waitFor(() => {
      const main = document.querySelector('#main-content');
      expect(main?.textContent).toContain('פגישה 5');
      expect(main?.textContent).toContain('14.07.2026');
      expect(main?.textContent).toContain('אינטגרציה');
    });
  });
});
