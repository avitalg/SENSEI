// Canonical per-field validation on the auth forms — alongside the shared
// banner, the OFFENDING field is marked (aria-invalid + error border) and
// receives focus, matching the dialog/profile form contract.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';

const PKEY = 'sensei_session_react_v1';
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
afterEach(() => { cleanup(); localStorage.clear(); sessionStorage.clear(); });

const field = (name: string) => document.querySelector(`[data-field="${name}"]`) as HTMLInputElement;

describe('auth forms — per-field error targeting', () => {
  it('login: an invalid email marks and focuses the email field; typing clears the mark', async () => {
    mount({ view: 'auth', authScreen: 'login', loginEmail: 'לא-אימייל', loginPass: '123456' });
    await waitFor(() => expect(field('auth-login-email')).toBeTruthy());
    const submit = document.querySelector('.auth-login-btn') as HTMLElement;
    fireEvent.click(submit);
    await waitFor(() => {
      expect(field('auth-login-email').getAttribute('aria-invalid')).toBe('true');
      expect(document.activeElement).toBe(field('auth-login-email'));
    });
    // the password field is NOT falsely flagged
    expect(field('auth-login-pass').getAttribute('aria-invalid')).toBe('false');
    // typing clears the family error → the mark disappears
    fireEvent.input(field('auth-login-email'), { target: { value: 'a@b.co' } });
    await waitFor(() => expect(field('auth-login-email').getAttribute('aria-invalid')).toBe('false'));
  });

  it('signup: a password mismatch marks and focuses the confirm field only', async () => {
    mount({ view: 'auth', authScreen: 'signup' });
    await waitFor(() => expect(field('auth-signup-confirm')).toBeTruthy());
    fireEvent.input(field('auth-signup-name'), { target: { value: 'טסט טסטי' } });
    fireEvent.input(field('auth-signup-email'), { target: { value: 'a@b.co' } });
    fireEvent.input(field('auth-signup-pass'), { target: { value: 'longenough1' } });
    fireEvent.input(field('auth-signup-confirm'), { target: { value: 'different1' } });
    const submit = document.querySelector('.auth-signup-btn') as HTMLElement;
    fireEvent.click(submit);
    await waitFor(() => {
      expect(field('auth-signup-confirm').getAttribute('aria-invalid')).toBe('true');
      expect(document.activeElement).toBe(field('auth-signup-confirm'));
    });
    expect(field('auth-signup-pass').getAttribute('aria-invalid')).toBe('false');
  });
});
