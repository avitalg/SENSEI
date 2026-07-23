// Accessibility (axe) for the dedicated mobile experience — the desktop a11y
// suite audits routes in the desktop shell, so the mobile screens need their own
// pass. matchMedia is mocked to the phone breakpoint. Same convention as
// a11y.test.tsx: color-contrast is disabled (jsdom has no layout) — contrast is
// covered by the token system + tests/contrast.test.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import * as matchers from 'vitest-axe/matchers';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';
import { MOBILE_QUERY } from '../src/hooks/useIsMobile';
import { ALL_ROUTES } from '../src/nav/navConfig';

declare module 'vitest' {
  interface Assertion<T = any> { toHaveNoViolations(): T }
  interface AsymmetricMatchersContaining { toHaveNoViolations(): void }
}
expect.extend(matchers);

const PKEY = 'sensei_session_react_v1';
const AXE_OPTS = { rules: { 'color-contrast': { enabled: false } } };

function setMobile() {
  window.matchMedia = ((q: string) => ({
    matches: q === MOBILE_QUERY, media: q,
    addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  })) as any;
}
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 60)));

beforeEach(() => setMobile());
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('accessibility (axe) — mobile experience', () => {
  it('home calendar agenda view', async () => {
    const d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const { container } = mount({ route: 'dashboard', scheduledAppts: [{ id: 'mobile-a11y', pid: 'aladdin', date, time: '23:00', dur: 50 }] });
    await waitFor(() => expect(container.querySelector('.calh-toolbar')).toBeTruthy());
    const agenda = [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'סדר יום') as HTMLElement;
    fireEvent.click(agenda);
    await waitFor(() => expect(container.querySelector('.calh-agenda-view')).toBeTruthy());
    await settle();
    expect(await axe(document.body, AXE_OPTS)).toHaveNoViolations();
  }, 15000);

  for (const route of ALL_ROUTES.filter((key) => key !== 'dashboard')) {
    it(`${route} inside the mobile shell`, async () => {
      const { container } = mount({
        route,
        patientId: 'aladdin',
        uploadPatientId: 'aladdin',
      });
      await waitFor(() => expect(container.querySelector('#main-content h1')?.textContent?.trim()).toBeTruthy());
      await settle();
      expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
    }, 15000);
  }
});
