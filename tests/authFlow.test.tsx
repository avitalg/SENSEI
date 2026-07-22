// Auth entry form + session teardown — the login screen's client-side validation and
// the logout behaviour. These are user-visible, security-relevant flows (the app's
// front door) that were previously only smoke-rendered. All behaviour is exercised
// through the real store + components; no backend, no live API, no timers advanced.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider, useApp } from '../src/store/AppStore';
import App from '../src/App';

const PKEY = 'sensei_session_react_v1';
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 80)));
afterEach(() => { cleanup(); localStorage.clear(); });

const emailInput = () => document.querySelector('input[autocomplete="email"]') as HTMLInputElement;
const passInput = () => document.querySelector('input[autocomplete="current-password"]') as HTMLInputElement;
const loginBtn = () => document.querySelector('.auth-login-btn') as HTMLButtonElement;
const alertText = () => document.querySelector('[role="alert"]')?.textContent || '';

async function openLogin() {
  mount({ view: 'auth', authScreen: 'login' });
  await settle();
  await waitFor(() => expect(loginBtn()).toBeTruthy());
}

describe('login form — client-side validation & accessible errors', () => {
  it('rejects a malformed email with a specific, announced error', async () => {
    await openLogin();
    fireEvent.input(emailInput(), { target: { value: 'not-an-email' } });
    fireEvent.input(passInput(), { target: { value: '123456' } });
    fireEvent.click(loginBtn());
    await settle();
    // announced via role="alert", with the exact copy, and the fields marked invalid
    expect(alertText()).toContain('הזינו כתובת דוא״ל תקינה');
    expect(emailInput().getAttribute('aria-invalid')).toBe('true');
    // does NOT proceed to loading
    expect(loginBtn().getAttribute('aria-busy')).not.toBe('true');
  });

  it('rejects a too-short password (valid email) with the length message', async () => {
    await openLogin();
    fireEvent.input(emailInput(), { target: { value: 'therapist@clinic.co.il' } });
    fireEvent.input(passInput(), { target: { value: '123' } });
    fireEvent.click(loginBtn());
    await settle();
    expect(alertText()).toContain('הסיסמה חייבת לכלול לפחות 6 תווים');
  });

  it('valid credentials enter the loading submit state (button disabled + aria-busy)', async () => {
    await openLogin();
    fireEvent.input(emailInput(), { target: { value: 'therapist@clinic.co.il' } });
    fireEvent.input(passInput(), { target: { value: 'secret1' } });
    fireEvent.click(loginBtn());
    await settle();
    expect(loginBtn().disabled).toBe(true);
    expect(loginBtn().getAttribute('aria-busy')).toBe('true');
    // no validation error is shown on the valid path
    expect(document.querySelector('[role="alert"]')).toBeFalsy();
  });

  it('submits via the Enter key (keyboard-only usage)', async () => {
    await openLogin();
    fireEvent.input(emailInput(), { target: { value: 'bad' } });
    fireEvent.keyDown(passInput(), { key: 'Enter' });
    await settle();
    // Enter ran the same validation path → the email error is announced
    expect(alertText()).toContain('הזינו כתובת דוא״ל תקינה');
  });
});

describe('logout — session teardown returns to the login screen and clears transient UI', () => {
  it('logging out from the app exits to the login screen', async () => {
    mount({ view: 'app', route: 'dashboard' });
    await settle();
    // sanity: we are in the app (no login button yet)
    expect(loginBtn()).toBeFalsy();

    const logout = document.querySelector('[aria-label="התנתקות מהמערכת"]') as HTMLElement;
    expect(logout, 'logout control is present in the app chrome').toBeTruthy();
    fireEvent.click(logout);
    await settle();

    await waitFor(() => expect(loginBtn()).toBeTruthy());
  });

  it('logout clears transient overlay state, so signing back in is a clean slate', async () => {
    // Asserted on STATE, not on the DOM: leaving for the auth view unmounts the
    // whole app shell, so "the overlay is no longer rendered" passes even when
    // logout clears nothing. Uncleared flags would resurface the moment the user
    // signs back in (no reload, so in-memory state survives).
    const seen: Record<string, any> = {};
    function Probe() {
      const { S, set, logout } = useApp();
      seen.cmdOpen = S.cmdOpen; seen.aiOpen = S.aiOpen; seen.dialog = S.dialog; seen.view = S.view;
      return (
        <div>
          <button data-testid="open" onClick={() => set({ cmdOpen: true, aiOpen: true, dialog: 'create' })}>open</button>
          <button data-testid="logout" onClick={logout}>logout</button>
        </div>
      );
    }
    render(<AppStoreProvider><Probe /></AppStoreProvider>);
    fireEvent.click(document.querySelector('[data-testid="open"]') as HTMLElement);
    expect(seen.cmdOpen).toBe(true);

    fireEvent.click(document.querySelector('[data-testid="logout"]') as HTMLElement);
    expect(seen.view, 'logout returns to the auth view').toBe('auth');
    expect(seen.cmdOpen, 'command palette flag cleared').toBe(false);
    expect(seen.aiOpen, 'AI panel flag cleared').toBe(false);
    expect(seen.dialog, 'open dialog cleared').toBeNull();
  });
});
