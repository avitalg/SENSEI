// Settings › Profile › "ייצוא הנתונים" — the user can download a full copy of
// the locally-persisted record (patients, appointments, notes, preferences) as
// a dated, valid JSON file. Data ownership for a local-first clinical tool.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';

const PKEY = 'sensei_session_react_v1';
const settle = (ms = 150) => act(() => new Promise((r) => setTimeout(r, ms)));
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('settings — data export', () => {
  it('downloads the persisted record as a dated, parseable JSON file', async () => {
    localStorage.setItem(PKEY, JSON.stringify({
      __savedAt: Date.now(), view: 'app', route: 'settings',
      therapistNotes: { p1: [{ id: 'n1', text: 'הערה לייצוא', at: '2026-07-10T09:00:00Z' }] },
    }));
    // capture the download instead of letting jsdom choke on it
    let blob: Blob | null = null; let fname = '';
    (URL as any).createObjectURL = vi.fn((b: Blob) => { blob = b; return 'blob:x'; });
    (URL as any).revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { fname = this.download; });

    render(<AppStoreProvider><App /></AppStoreProvider>);
    await settle();
    await waitFor(() => expect([...document.querySelectorAll('button')].find((b) => b.textContent?.includes('ייצוא הנתונים'))).toBeTruthy(), { timeout: 3000 });
    fireEvent.click([...document.querySelectorAll('button')].find((b) => b.textContent?.includes('ייצוא הנתונים')) as HTMLElement);
    await settle();

    expect(fname).toMatch(/^sensei-data-\d{4}-\d{2}-\d{2}\.json$/);
    const text = (await new Promise<string>((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.onerror = () => rej(fr.error);
      fr.readAsText(blob as unknown as Blob);
    })).replace(/^﻿/, '');
    const parsed = JSON.parse(text); // must be valid JSON
    expect(parsed.therapistNotes.p1[0].text).toBe('הערה לייצוא');
    await waitFor(() => expect(document.body.textContent).toContain('הנתונים יוצאו'));
  });
});
