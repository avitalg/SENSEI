import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';

const PKEY = 'sensei_session_react_v1';
const settle = (ms = 650) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));
const mount = (patch: Record<string, any>) => {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', route: 'dashboard', ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
};
const button = (text: string) => [...document.querySelectorAll('button')]
  .find((b) => b.textContent?.trim() === text) as HTMLButtonElement | undefined;

afterEach(() => { cleanup(); localStorage.clear(); window.location.hash = ''; });

describe('onboarding and continuity', () => {
  it('can be skipped and stays dismissed after a reload', async () => {
    const view = mount({ onboardTipDismissed: false, onboardingStep: 0 });
    await waitFor(() => expect(button('דלגו לעת עתה')).toBeTruthy());
    fireEvent.click(button('דלגו לעת עתה')!);
    await settle();
    expect(JSON.parse(localStorage.getItem(PKEY) || '{}').onboardTipDismissed).toBe(true);
    view.unmount();
    render(<AppStoreProvider><App /></AppStoreProvider>);
    await waitFor(() => expect(document.body.textContent).not.toContain('התחלה מהירה'));
  });

  it('resumes at the next step after opening the first-value report', async () => {
    const view = mount({ onboardTipDismissed: false, onboardingStep: 0 });
    await waitFor(() => expect(button('פתיחת דוח ההכנה')).toBeTruthy());
    fireEvent.click(button('פתיחת דוח ההכנה')!);
    await settle();
    expect(JSON.parse(localStorage.getItem(PKEY) || '{}').onboardingStep).toBe(1);
    view.unmount();
    window.location.hash = '#/dashboard';
    render(<AppStoreProvider><App /></AppStoreProvider>);
    await waitFor(() => expect(button('פתיחת השיחה עם סנסיי')).toBeTruthy());
    expect(document.body.textContent).toContain('שלב 2 מתוך 2');
  });

  it('restores the guide from Help after it was dismissed', async () => {
    mount({ route: 'help', onboardTipDismissed: true, onboardingStep: 2 });
    await waitFor(() => expect(button('הפעלת המדריך מחדש')).toBeTruthy());
    fireEvent.click(button('הפעלת המדריך מחדש')!);
    await waitFor(() => expect(button('פתיחת דוח ההכנה')).toBeTruthy());
  });

  it('persists an interrupted profile draft without overwriting the saved profile', async () => {
    const profile = { name: 'ד״ר רותם שגב', email: 'saved@example.com', phone: '' };
    const view = mount({ route: 'settings', settingsTab: 'profile', onboardTipDismissed: true, profile });
    const email = await waitFor(() => {
      const el = document.querySelector('input[aria-label="דוא״ל"]') as HTMLInputElement | null;
      if (!el) throw new Error('profile email field not rendered');
      return el;
    });
    fireEvent.change(email, { target: { value: 'draft@example.com' } });
    await settle();
    const saved = JSON.parse(localStorage.getItem(PKEY) || '{}');
    expect(saved.profile.email).toBe('saved@example.com');
    expect(saved.profileDraft.email).toBe('draft@example.com');
    view.unmount();
    render(<AppStoreProvider><App /></AppStoreProvider>);
    await waitFor(() => expect((document.querySelector('input[aria-label="דוא״ל"]') as HTMLInputElement).value).toBe('draft@example.com'));
    expect(document.body.textContent).toContain('טיוטה נשמרת אוטומטית');
  });
});
