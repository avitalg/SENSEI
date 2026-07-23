// Calendar workspace — Google-Calendar-style week view. Verifies it renders the
// week's events from the client-only fixture (same source as the dashboard),
// and that the week navigation + "today" reset drive the range heading.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';

const PKEY = 'sensei_session_react_v1';
function mount() {
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', route: 'calendar', scheduledAppts: [{ id: 'user-calendar-test', pid: 'aladdin', date, time: '23:00', dur: 50 }] }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
afterEach(() => { cleanup(); localStorage.clear(); });

// the calendar range/title carries an aria-label prefixed "יומן · "
const heading = (c: HTMLElement) => c.querySelector('[aria-label^="יומן · "]')?.textContent?.trim() || '';

describe('calendar workspace — week view', () => {
  it('renders the week\'s events from the fixture as clickable blocks', async () => {
    const { container } = mount();
    // the page is lazy-loaded (Suspense) — wait for its toolbar to mount
    await waitFor(() => expect(container.querySelector('.calh-today-btn')).toBeTruthy());
    // events arrive from loadCalendarEvents (fixture) after its simulated latency
    await waitFor(() => {
      expect(container.querySelectorAll('.calh-event').length).toBeGreaterThan(0);
    }, { timeout: 3000 });
    // every event block is a keyboard-operable native button
    const ev = container.querySelector('.calh-event') as HTMLElement;
    expect(ev.tagName).toBe('BUTTON');
  });

  it('week navigation and "today" drive the range heading', async () => {
    const { container } = mount();
    await waitFor(() => expect(heading(container)).toBeTruthy());
    const start = heading(container);

    const next = container.querySelector('.calh-icon-btn[aria-label="השבוע הבא"]') as HTMLElement;
    act(() => { fireEvent.click(next); });
    await waitFor(() => expect(heading(container)).not.toBe(start));
    const advanced = heading(container);
    expect(advanced).not.toBe(start);

    const today = container.querySelector('.calh-today-btn') as HTMLElement;
    act(() => { fireEvent.click(today); });
    await waitFor(() => expect(heading(container)).toBe(start));
  });
});
