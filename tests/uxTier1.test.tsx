// UX audit — Tier 1 improvements: upload reachable from content (not the nav),
// the home upload CTA routes through navigate() (deep-link/focus/title), and
// AI-generated clinical content carries the shared clinical disclaimer.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';
import { navConfig } from '../src/nav/navConfig';
import { CLINICAL_DISCLAIMER } from '../src/components/shared/AiDisclaimer';

const PKEY = 'sensei_session_react_v1';
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 120)));
afterEach(() => { cleanup(); localStorage.clear(); window.location.hash = ''; });

describe('discoverability — upload reachable from content, not the side menu', () => {
  it('upload is NOT a nav destination (removed from the side menu by request)', () => {
    expect(navConfig().some((n) => n.key === 'upload')).toBe(false);
  });

  it('the home upload CTA routes through navigate() so the URL is deep-linkable', async () => {
    mount({ view: 'app', route: 'dashboard' });
    await settle();
    const cta = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('העלאת הקלטה')) as HTMLElement;
    expect(cta, 'an upload entry point must exist on the home page').toBeTruthy();
    fireEvent.click(cta);
    await waitFor(() => expect(window.location.hash).toBe('#/upload'));
  });
});

describe('trust — clinical disclaimer on AI-generated content', () => {
  // The prep-report screen was removed; the shared AiDisclaimer component now
  // guards the AI-generated surfaces (summary, transcript, session detail).
  it('renders a clinical disclaimer note on the AI session summary', async () => {
    mount({ view: 'app', route: 'summary', patientId: 'p1' });
    await settle();
    // the summary page passes a bespoke text into the shared AiDisclaimer
    await waitFor(() => expect(document.body.textContent).toContain('אינו מהווה אבחנה או המלצה קלינית'));
    expect(document.querySelector('[role="note"]'), 'disclaimer rendered as a note landmark').toBeTruthy();
  });

  it('the shared default disclaimer copy retains the trust language', () => {
    expect(CLINICAL_DISCLAIMER).toContain('אינו מהווה אבחנה');
  });
});
