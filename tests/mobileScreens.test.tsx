// Mobile prep-report and patient profile — the bespoke
// mobile screens rendered by MobileApp for the report / patient routes. Same
// matchMedia mobile gating as mobileDayView.test.tsx.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';
import { MOBILE_QUERY } from '../src/hooks/useIsMobile';
import { MOCK_PATIENTS } from '../src/data/mockPatients';

const { isApiConfiguredMock, pollMock, regenMock } = vi.hoisted(() => ({
  isApiConfiguredMock: vi.fn(() => false),
  pollMock: vi.fn(),
  regenMock: vi.fn(),
}));

vi.mock('../src/services/apiClient', async (importActual) => {
  const actual = await importActual<typeof import('../src/services/apiClient')>();
  return { ...actual, isApiConfigured: isApiConfiguredMock };
});
vi.mock('../src/services/nextMeetingReport', async (importActual) => {
  const actual = await importActual<typeof import('../src/services/nextMeetingReport')>();
  return { ...actual, pollNextMeetingReport: pollMock, regenerateNextMeetingReport: regenMock };
});

const PKEY = 'sensei_session_react_v1';

function setMobile() {
  window.matchMedia = ((q: string) => ({
    matches: q === MOBILE_QUERY,
    media: q,
    addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  })) as any;
}
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}

beforeEach(() => {
  setMobile();
  isApiConfiguredMock.mockReturnValue(false);
});
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('mobile prep report', () => {
  it('renders the prep sections and toggles a goal', async () => {
    const { container } = mount({ route: 'report', patientId: 'p3' });
    await waitFor(() => expect(container.querySelector('.mob-screen')).toBeTruthy());
    expect(container.textContent).toContain('סיכום הפגישה הקודמת');
    expect(container.textContent).toContain('נקודות למעקב');
    expect(container.textContent).toContain('מטרות לפגישה הקרובה');
    // demo mode — no refresh control
    expect(container.querySelector('[aria-label="רענון דוח"]')).toBeNull();

    const goal = container.querySelector('.mob-goal') as HTMLElement;
    expect(goal.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(goal);
    await waitFor(() => expect(goal.getAttribute('aria-pressed')).toBe('true'));
    expect(container.querySelector('.mob-check.is-done')).toBeTruthy();
  });

  it('offers upload (not direct recording) from the prep report, and no record control remains', async () => {
    const { container } = mount({ route: 'report', patientId: 'p3' });
    await waitFor(() => expect(container.querySelector('.mob-screen')).toBeTruthy());
    // direct recording removed — the footer CTA is now the upload flow
    expect([...container.querySelectorAll('button')].some((b) => b.textContent === 'התחל הקלטה'), 'no direct-record CTA').toBe(false);
    const upload = [...container.querySelectorAll('button')].find((b) => b.textContent === 'העלאת הקלטה') as HTMLElement;
    expect(upload, 'upload CTA present').toBeTruthy();
    fireEvent.click(upload);
    await waitFor(() => expect(window.location.hash).toBe('#/upload'));
  });

  it('API mode: shows רענון דוח and regenerates on click', async () => {
    isApiConfiguredMock.mockReturnValue(true);
    pollMock.mockResolvedValue({
      patient_id: 'p3', status: 'ready',
      intro: 'LIVE INTRO', changes: ['c1'], open_topics: ['t1'],
      last_summary_excerpt: 'excerpt', model: 'llama3.1:latest',
    });
    regenMock.mockResolvedValue({
      patient_id: 'p3', status: 'ready',
      intro: 'REFRESHED', changes: ['c2'], open_topics: ['t2'],
      last_summary_excerpt: 'new excerpt', model: 'llama3.1:latest',
    });

    const { container } = mount({
      route: 'report',
      patientId: 'p3',
      patients: MOCK_PATIENTS,
    });
    await waitFor(() => expect(container.textContent).toContain('LIVE INTRO'));

    const refresh = container.querySelector('[aria-label="רענון דוח"]') as HTMLButtonElement;
    expect(refresh, 'refresh control').toBeTruthy();
    expect(refresh.textContent).toContain('רענון דוח');
    fireEvent.click(refresh);
    await waitFor(() => expect(regenMock).toHaveBeenCalled());
    await waitFor(() => expect(container.textContent).toContain('REFRESHED'));
  });
});

describe('mobile patient profile', () => {
  it('renders the patient header, next meeting, and recent sessions', async () => {
    const { container } = mount({ route: 'patient', patientId: 'p1' });
    await waitFor(() => expect(container.querySelector('.mob-screen')).toBeTruthy());
    expect(container.textContent).toContain('תיק מטופל');
    expect(container.textContent).toContain('הפגישה הבאה');
    expect(container.textContent).toContain('פגישות אחרונות');
    expect(container.querySelectorAll('.mob-sess-row').length).toBeGreaterThan(0);
  });
});

describe('mobile drawer — focus restore (WCAG focus management)', () => {
  it('closing the drawer returns focus to the menu button', async () => {
    localStorage.setItem('sensei_session_react_v1', JSON.stringify({ __savedAt: Date.now(), view: 'app', route: 'dashboard' }));
    render(<AppStoreProvider><App /></AppStoreProvider>);
    await act(() => new Promise((r) => setTimeout(r, 150)));
    const menu = document.querySelector('[aria-label="פתיחת התפריט"]') as HTMLButtonElement;
    expect(menu).toBeTruthy();
    fireEvent.click(menu);
    await act(() => new Promise((r) => setTimeout(r, 100)));
    // close via the scrim
    fireEvent.click(document.querySelector('.nav-scrim') as HTMLElement);
    await waitFor(() => expect(document.activeElement).toBe(menu));
  });
});
