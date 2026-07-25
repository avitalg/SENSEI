// Meeting history + summary on phone-width viewports — both screens reuse the
// desktop pages inside MobileApp. These lock the responsive wrappers so the
// layouts stay usable under 768px.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
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

function mount(route: string, extra: Record<string, unknown> = {}) {
  localStorage.setItem(PKEY, JSON.stringify({
    __savedAt: Date.now(),
    view: 'app',
    route,
    patientId: 'p1',
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
    expect(container.querySelector('.mh-patient-select')).toBeTruthy();
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
