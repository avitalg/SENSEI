// Settings › Profile › phone — the therapist's own phone must not accept a
// number the patient form would reject. Phone stays OPTIONAL (an empty value
// saves), but a non-empty value must be a valid Israeli number, mirroring the
// isValidPhone rule enforced on the patient add/edit dialog.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';

const PKEY = 'sensei_session_react_v1';
const settle = (ms = 150) => act(() => new Promise((r) => setTimeout(r, ms)));
afterEach(() => { cleanup(); localStorage.clear(); });

const phoneInput = () => document.querySelector('input[aria-label="טלפון"]') as HTMLInputElement;
const saveBtn = () => [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'שמירת שינויים') as HTMLElement;

async function openProfile() {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', route: 'settings', settingsTab: 'profile' }));
  render(<AppStoreProvider><App /></AppStoreProvider>);
  await settle();
  await waitFor(() => expect(phoneInput()).toBeTruthy(), { timeout: 3000 });
}

describe('settings — profile phone validation', () => {
  it('blocks saving an invalid phone and shows an error', async () => {
    await openProfile();
    fireEvent.change(phoneInput(), { target: { value: 'abc123' } });
    fireEvent.click(saveBtn());
    await settle();
    await waitFor(() => expect(document.body.textContent).toContain('מספר טלפון לא תקין'));
    expect(phoneInput().getAttribute('aria-invalid')).toBe('true');
    // never persisted the garbage phone
    expect(JSON.parse(localStorage.getItem(PKEY) || '{}').profile?.phone).not.toBe('abc123');
  });

  it('accepts a valid phone (including +972 with trunk 0) and saves', async () => {
    await openProfile();
    fireEvent.change(phoneInput(), { target: { value: '+972-050-1234567' } });
    fireEvent.click(saveBtn());
    await settle();
    await waitFor(() => expect(JSON.parse(localStorage.getItem(PKEY) || '{}').profile?.phone).toBe('+972-050-1234567'));
    expect(document.body.textContent).not.toContain('מספר טלפון לא תקין');
  });

  it('allows an empty phone (optional field)', async () => {
    await openProfile();
    fireEvent.change(phoneInput(), { target: { value: '' } });
    fireEvent.click(saveBtn());
    await settle();
    await waitFor(() => expect(JSON.parse(localStorage.getItem(PKEY) || '{}').profile?.phone).toBe(''));
    expect(document.body.textContent).not.toContain('מספר טלפון לא תקין');
  });
});
