// Patient archive on phone-width — the shared PatientArchivePage is rendered
// inside MobileApp. Locks the stacked row / full-width action layout.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import fs from 'node:fs';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';
import { MOBILE_QUERY } from '../src/hooks/useIsMobile';

const PKEY = 'sensei_session_react_v1';

function setMobile(on: boolean) {
  window.matchMedia = ((q: string) => ({
    matches: on && q === MOBILE_QUERY,
    media: q,
    addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  })) as any;
}

beforeEach(() => setMobile(true));
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('patient archive — mobile layout', () => {
  it('renders archive chrome + stacked row hooks inside the mobile shell', async () => {
    localStorage.setItem(PKEY, JSON.stringify({
      __savedAt: Date.now(),
      view: 'app',
      route: 'patientArchive',
      patients: [],
      archivedPatients: [{
        id: 'p9',
        name: 'ארכיון בדיקה',
        phone: '050-0000000',
        email: null,
        created_at: '2025-01-01T00:00:00Z',
        archived: true,
      }],
    }));
    const { container } = render(<AppStoreProvider><App /></AppStoreProvider>);
    await waitFor(() => expect(container.querySelector('.mob-shell')).toBeTruthy());
    await waitFor(() => expect(container.querySelector('.pa-page')).toBeTruthy());
    expect(container.querySelector('.pa-header')).toBeTruthy();
    expect(container.querySelector('.pa-row')).toBeTruthy();
    expect(container.querySelector('.pa-restore-btn')).toBeTruthy();
    expect(container.textContent).toContain('ארכיון בדיקה');

    const css = fs.readFileSync('src/pages/patientArchive.css', 'utf8');
    expect(css).toMatch(/\.pa-row\s*\{[^}]*flex-wrap:\s*wrap/s);
    expect(css).toMatch(/\.pa-restore-btn\s*\{[^}]*flex:\s*1/s);
  });
});
