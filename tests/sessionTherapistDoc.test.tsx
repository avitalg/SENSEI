// Session detail — therapist documentation: the repository's per-session
// dictated recording, clinical note, and "לפעם הבאה" focus surface on the
// session page, verbatim and attributed to the RIGHT session (exact index,
// never cycled). Patients outside the repository show nothing invented.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';
import { sessionTherapistDoc, sessionIndexForNum } from '../src/data/sessionDetail';
import { repoPatients } from '../src/data/mockPatientsRepo';

describe('sessionTherapistDoc — exact per-session mapping', () => {
  it('returns every repository session\'s recording/note/focus verbatim, at the right index', () => {
    for (const p of repoPatients()) {
      for (const s of p.sessions) {
        const doc = sessionTherapistDoc({ id: p.id }, sessionIndexForNum(s.num, p.sessions.length));
        expect(doc, `${p.id} session ${s.num}`).toBeTruthy();
        expect(doc!.recording).toBe(s.recording);
        expect(doc!.note).toBe(s.therapistNote);
        expect(doc!.nextFocus).toBe(s.nextFocus || '');
      }
    }
  });

  it('never cycles: out-of-range indexes and non-repository patients yield null', () => {
    const p = repoPatients()[0];
    expect(sessionTherapistDoc({ id: p.id }, p.sessions.length)).toBeNull();
    expect(sessionTherapistDoc({ id: p.id }, -1)).toBeNull();
    expect(sessionTherapistDoc({ id: 'zz-nope' }, 0)).toBeNull();
    expect(sessionTherapistDoc(undefined, 0)).toBeNull();
  });
});

const PKEY = 'sensei_session_react_v1';
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 150)));
afterEach(() => { cleanup(); localStorage.clear(); window.location.hash = ''; });

describe('session detail — therapist documentation section', () => {
  it('shows the session\'s own recording, clinical note, and next-time focus', async () => {
    const p = repoPatients().find((x) => x.id === 'aladdin')!;
    const s = p.sessions.find((x) => x.num === 2)!;
    window.location.hash = '#/session/aladdin/2';
    mount({ view: 'app', route: 'session', patientId: 'aladdin', sessionNum: 2, onboardTipDismissed: true });
    await settle();
    await waitFor(() => expect(document.body.textContent).toContain('תיעוד המטפל'));
    const t = document.body.textContent || '';
    expect(t).toContain(s.recording.slice(0, 60));
    expect(t).toContain('הערה קלינית');
    expect(t).toContain(s.therapistNote.slice(0, 60));
    if (s.nextFocus) expect(t).toContain(s.nextFocus);
    // The patient-level summary editor always edits the LATEST session, so on
    // an older session (2 of 5) the edit link must NOT be offered.
    expect(t).not.toContain('עריכת הסיכום');
  });

  it('offers the summary-edit link only on the latest session', async () => {
    const p = repoPatients().find((x) => x.id === 'aladdin')!;
    const last = p.sessions[p.sessions.length - 1].num;
    window.location.hash = '#/session/aladdin/' + last;
    mount({ view: 'app', route: 'session', patientId: 'aladdin', sessionNum: last, onboardTipDismissed: true });
    await settle();
    await waitFor(() => expect(document.body.textContent).toContain('תיעוד המטפל'));
    expect(document.body.textContent).toContain('עריכת הסיכום');
  });
});
