// Daily recap UI — server text spoken via Web Speech on mobile home.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { MOBILE_QUERY } from '../src/hooks/useIsMobile';

const { isApiConfiguredMock, pollDailyMeetingReport } = vi.hoisted(() => ({
  isApiConfiguredMock: vi.fn(() => true),
  pollDailyMeetingReport: vi.fn(async () => ({
    id: 'rep-1',
    report_date: '2026-07-25',
    time_zone: 'Asia/Jerusalem',
    status: 'ready' as const,
    meeting_limit: 4,
    meeting_count: 1,
    text: 'LIVE BRIEF FROM SERVER',
  })),
}));

vi.mock('../src/services/apiClient', async (importActual) => {
  const actual = await importActual<typeof import('../src/services/apiClient')>();
  return { ...actual, isApiConfigured: isApiConfiguredMock };
});

vi.mock('../src/services/dailyMeetingReport', () => ({
  pollDailyMeetingReport,
}));

import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';

const PKEY = 'sensei_session_react_v1';

function setMobile(on: boolean) {
  window.matchMedia = ((q: string) => ({
    matches: on && q === MOBILE_QUERY,
    media: q,
    addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  })) as any;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  delete (window as any).speechSynthesis;
  delete (window as any).SpeechSynthesisUtterance;
  vi.clearAllMocks();
});

beforeEach(() => {
  setMobile(true);
  isApiConfiguredMock.mockReturnValue(true);
  pollDailyMeetingReport.mockResolvedValue({
    id: 'rep-1',
    report_date: '2026-07-25',
    time_zone: 'Asia/Jerusalem',
    status: 'ready',
    meeting_limit: 4,
    meeting_count: 1,
    text: 'LIVE BRIEF FROM SERVER',
  });
});

describe('daily meeting report UI (server text + Web Speech)', () => {
  it('speaks the live daily brief via speechSynthesis', async () => {
    const spoken: string[] = [];
    (window as any).speechSynthesis = { speak: vi.fn((u: any) => spoken.push(u.text)), cancel: vi.fn() };
    (window as any).SpeechSynthesisUtterance = class {
      lang = ''; onend: (() => void) | null = null; onerror: (() => void) | null = null;
      constructor(public text: string) {}
    };

    localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', route: 'dashboard' }));
    const { container } = render(<AppStoreProvider><App /></AppStoreProvider>);

    await waitFor(() => expect(pollDailyMeetingReport).toHaveBeenCalled());
    await waitFor(() => expect(container.querySelector('.mob-daily-recap')).toBeTruthy());
    const btn = container.querySelector('.mob-daily-recap') as HTMLElement;
    expect(btn.textContent).toContain('סיכום יומי');

    await act(async () => { fireEvent.click(btn); });
    await waitFor(() => expect(spoken).toContain('LIVE BRIEF FROM SERVER'));
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });
});
