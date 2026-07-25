// Mobile next-meeting report launcher — must use the same picker → report flow
// as desktop (NextMeetingReportPage), not jump straight into MobilePrepReport.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';
import { MOBILE_QUERY } from '../src/hooks/useIsMobile';
import { MOCK_PATIENTS } from '../src/data/mockPatients';

const PKEY = 'sensei_session_react_v1';

function setMobile(on: boolean) {
  window.matchMedia = ((q: string) => ({
    matches: on && q === MOBILE_QUERY,
    media: q,
    addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  })) as any;
}

function mount(patch: Record<string, unknown> = {}) {
  localStorage.setItem(PKEY, JSON.stringify({
    __savedAt: Date.now(),
    view: 'app',
    route: 'nextMeetingReport',
    patients: MOCK_PATIENTS,
    patientId: 'p1',
    ...patch,
  }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}

beforeEach(() => setMobile(true));
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('mobile next-meeting report launcher', () => {
  it('shows the patient picker (not the prep report) on nextMeetingReport', async () => {
    const { container } = mount();
    await waitFor(() => expect(container.querySelector('.mob-shell')).toBeTruthy());
    await waitFor(() => expect(container.querySelector('.nmr-pick-trigger')).toBeTruthy());
    expect(container.querySelector('.nmr-page')).toBeTruthy();
    expect(container.textContent).toContain('דוח לפגישה הבאה');
    expect(container.querySelector('.mob-screen')).toBeNull();
    expect(container.querySelector('select#nmr-patient')).toBeNull();
    expect(container.querySelector('[aria-label="יצירת דוח הכנה"]')).toBeTruthy();
  });

  it('opens a full-width patient sheet and selects a patient', async () => {
    const { container } = mount({ patientId: 'p1' });
    await waitFor(() => expect(container.querySelector('.nmr-pick-trigger')).toBeTruthy());
    fireEvent.click(container.querySelector('.nmr-pick-trigger') as HTMLElement);
    await waitFor(() => expect(container.querySelector('.nmr-sheet')).toBeTruthy());
    const options = container.querySelectorAll('.nmr-sheet-option');
    expect(options.length).toBeGreaterThan(1);
    fireEvent.click(options[1] as HTMLElement);
    await waitFor(() => expect(container.querySelector('.nmr-sheet')).toBeNull());
    expect((container.querySelector('.nmr-pick-trigger-name') as HTMLElement).textContent).toBeTruthy();
  });

  it('generates into the mobile prep report for the selected patient', async () => {
    const { container } = mount({ patientId: 'p1' });
    await waitFor(() => expect(container.querySelector('.nmr-pick-trigger')).toBeTruthy());
    fireEvent.click(container.querySelector('[aria-label="יצירת דוח הכנה"]') as HTMLElement);
    await waitFor(() => expect(container.querySelector('.mob-screen')).toBeTruthy());
    expect(container.textContent).toContain('דוח הכנה');
    expect(window.location.hash).toMatch(/report/);
  });
});
