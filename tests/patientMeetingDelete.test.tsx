// Patient file + meeting history — no meeting-delete trash on these surfaces.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';
import { MOBILE_QUERY } from '../src/hooks/useIsMobile';

const PKEY = 'sensei_session_react_v1';
function mount(patch: Record<string, any>, hash = '') {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }));
  window.history.replaceState(null, '', window.location.pathname + hash);
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 120)));

function setMobile(on: boolean) {
  window.matchMedia = ((q: string) => ({
    matches: on && q === MOBILE_QUERY,
    media: q,
    addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  })) as any;
}

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); setMobile(false); });

describe('meeting history — no session delete', () => {
  it('does not show a delete control on history session rows', async () => {
    mount({ view: 'app', route: 'meetingHistory', patientId: 'p1' }, '#/meetingHistory/p1');
    await settle();
    await waitFor(() => expect(document.querySelector('.pd-sess-row')).toBeTruthy());
    expect(document.querySelector('.pd-sess-row [aria-label^="מחיקת פגישה"]')).toBeNull();
    expect(document.querySelector('[aria-label^="מחיקת פגישה"]')).toBeNull();
  });
});

describe('patient page — no meeting delete', () => {
  it('does not show delete on history preview or upcoming list', async () => {
    mount({ view: 'app', route: 'patient', patientId: 'p1' }, '#/patient/p1');
    await settle();
    await waitFor(() => expect(document.querySelector('.pd-sess-row')).toBeTruthy());
    expect(document.querySelector('.pd-sess-row [aria-label^="מחיקת פגישה"]')).toBeNull();
    expect(document.querySelector('[aria-label="מחיקת פגישה"]')).toBeNull();
  });
});

describe('mobile patient — no meeting delete', () => {
  beforeEach(() => setMobile(true));

  it('does not show delete on recent session rows', async () => {
    const { container } = mount({ view: 'app', route: 'patient', patientId: 'p1' }, '#/patient/p1');
    await settle();
    await waitFor(() => expect(container.querySelector('.mob-sess-row')).toBeTruthy());
    expect(container.querySelector('[aria-label^="מחיקת פגישה"]')).toBeNull();
  });
});
