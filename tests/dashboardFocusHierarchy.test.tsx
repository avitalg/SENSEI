// Dashboard progressive-disclosure contract: the home shows only relevant,
// actionable content by default.
//   1. The onboarding tip auto-hides once the core flow succeeded (hasUploaded)
//      — after a first upload it is no longer guidance.
//   2. The calm home leads with actionable content — today's agenda (each row
//      carries its own quick actions) — and does NOT surface secondary decoding
//      aids like the category legend, which now lives in the calendar's overflow
//      popover (progressive disclosure).
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';

const PKEY = 'sensei_session_react_v1';
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 120)));
afterEach(() => { cleanup(); localStorage.clear(); window.location.hash = ''; });

describe('dashboard — focused control-center hierarchy', () => {
  it('the onboarding tip hides automatically after a first successful upload', async () => {
    mount({ view: 'app', route: 'dashboard', onboardTipDismissed: false, hasUploaded: true });
    await settle();
    expect(document.body.textContent).not.toContain('ברוכים הבאים לסנסיי');
  });

  it('the onboarding tip still shows for a fresh account (not dismissed, nothing uploaded)', async () => {
    mount({ view: 'app', route: 'dashboard', onboardTipDismissed: false, hasUploaded: false });
    await settle();
    await waitFor(() => expect(document.body.textContent).toContain('ברוכים הבאים לסנסיי'));
  });

  it('leads with the actionable today-agenda and hides the legend by default', async () => {
    mount({ view: 'app', route: 'dashboard', onboardTipDismissed: true });
    await settle();
    // Today's agenda is the home's primary schedule content, actions-first.
    await waitFor(() => expect(document.querySelector('[aria-label="הפגישות שלך היום"]')).toBeTruthy());
    // The category legend is a secondary decoding aid — not on the calm home; it
    // is progressively disclosed from the calendar's "אפשרויות נוספות" popover.
    expect(document.body.textContent).not.toContain('סוגי פגישות');
  });
});
