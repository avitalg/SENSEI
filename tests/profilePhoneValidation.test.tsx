import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';

const PKEY = 'sensei_session_react_v1';
const settle = (ms = 150) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const phoneInput = () => document.querySelector('input[aria-label="טלפון"]') as HTMLInputElement;
const saveButton = () => [...document.querySelectorAll('button')]
  .find((button) => button.textContent?.trim() === 'שמירת שינויים') as HTMLButtonElement;

async function openProfile() {
  localStorage.setItem(PKEY, JSON.stringify({
    __savedAt: Date.now(),
    view: 'app',
    route: 'settings',
    settingsTab: 'profile',
  }));
  render(<AppStoreProvider><App /></AppStoreProvider>);
  await settle();
  await waitFor(() => expect(phoneInput()).toBeTruthy(), { timeout: 3000 });
}

describe('settings profile phone validation', () => {
  it('blocks an invalid non-empty phone', async () => {
    await openProfile();
    fireEvent.change(phoneInput(), { target: { value: 'abc123' } });
    await settle();
    fireEvent.click(saveButton());
    await waitFor(() => expect(phoneInput()).toHaveAttribute('aria-invalid', 'true'));
    expect(document.body.textContent).toContain('מספר טלפון לא תקין');
    expect(JSON.parse(localStorage.getItem(PKEY) || '{}').profile?.phone).not.toBe('abc123');
  });

  it('accepts a valid international phone', async () => {
    await openProfile();
    fireEvent.change(phoneInput(), { target: { value: '+972-050-1234567' } });
    await settle();
    fireEvent.click(saveButton());
    await settle();
    await waitFor(() => expect(JSON.parse(localStorage.getItem(PKEY) || '{}').profile?.phone).toBe('+972-050-1234567'));
  });

  it('keeps the optional phone field optional', async () => {
    await openProfile();
    fireEvent.change(phoneInput(), { target: { value: '' } });
    await settle();
    fireEvent.click(saveButton());
    await settle();
    await waitFor(() => expect(JSON.parse(localStorage.getItem(PKEY) || '{}').profile?.phone).toBe(''));
  });
});
