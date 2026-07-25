// Meeting history + summary on phone-width viewports — both screens reuse the
// desktop pages inside MobileApp. These lock the responsive wrappers so the
// layouts stay usable under 768px.
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

function mount(route: string, extra: Record<string, unknown> = {}) {
  localStorage.setItem(PKEY, JSON.stringify({
    __savedAt: Date.now(),
    view: 'app',
    route,
    patientId: 'p1',
    patients: MOCK_PATIENTS,
    ...extra,
  }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}

beforeEach(() => setMobile(true));
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('meeting history — mobile layout', () => {
  it('renders the history page wrapper inside the mobile shell', async () => {
    const { container } = mount('meetingHistory');
    await waitFor(() => expect(container.querySelector('.mob-shell')).toBeTruthy());
    await waitFor(() => expect(container.querySelector('.mh-page')).toBeTruthy());
    expect(container.querySelector('.mh-header')).toBeTruthy();
    // Mobile uses the shared bottom-sheet trigger, not a native <select>.
    expect(container.querySelector('.ppick-trigger')).toBeTruthy();
    expect(container.querySelector('select.mh-patient-select')).toBeNull();
  });

  it('opens the patient sheet and switches history to another patient', async () => {
    const { container } = mount('meetingHistory', { patientId: 'p1' });
    await waitFor(() => expect(container.querySelector('.ppick-trigger')).toBeTruthy());
    fireEvent.click(container.querySelector('.ppick-trigger') as HTMLElement);
    await waitFor(() => expect(container.querySelector('.ppick-sheet')).toBeTruthy());
    const options = [...container.querySelectorAll('.ppick-sheet-option')];
    expect(options.length).toBeGreaterThan(1);
    const other = options.find((o) => !o.classList.contains('is-selected')) as HTMLElement;
    fireEvent.click(other);
    await waitFor(() => expect(container.querySelector('.ppick-sheet')).toBeNull());
    await waitFor(() => expect(window.location.hash).toMatch(/#\/meetingHistory\/p\d+/));
  });
});

describe('summary — mobile layout', () => {
  it('renders the summary page wrapper inside the mobile shell', async () => {
    const { container } = mount('summary');
    await waitFor(() => expect(container.querySelector('.mob-shell')).toBeTruthy());
    await waitFor(() => expect(container.querySelector('.sum-page')).toBeTruthy());
    expect(container.querySelector('.sum-header')).toBeTruthy();
  });
});
