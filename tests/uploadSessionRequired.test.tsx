// Session linkage is mandatory in BOTH modes: session audio (recorded or
// uploaded) must belong to one patient + one specific session, so an upload with
// no resolvable session is blocked rather than creating an orphaned recording.
// The demo build currently always has past sessions, so we force the
// no-resolvable-session case by stubbing sessionDates to empty.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';
import * as sessions from '../src/data/sessions';

const PKEY = 'sensei_session_react_v1';
const settle = () => act(() => new Promise((r) => setTimeout(r, 80)));
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

const dropzone = () => document.querySelector('[style*="dashed"]') as HTMLElement;

describe('upload — session linkage required (no orphaned recordings)', () => {
  it('blocks a demo-mode upload when the patient has no session to attach to', async () => {
    // No past sessions → the meeting picker is empty → session cannot be resolved.
    vi.spyOn(sessions, 'sessionDates').mockReturnValue([]);
    localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', route: 'upload', uploadPatientId: 'aladdin' }));
    render(<AppStoreProvider><App /></AppStoreProvider>);
    await settle();
    await waitFor(() => expect(dropzone()).toBeTruthy());

    // the picker reflects that there's no session to link to
    const select = document.querySelector('select[aria-label="בחירת תאריך פגישה"]') as HTMLSelectElement;
    expect(select?.value).toBe('');
    expect(document.body.textContent).toContain('אין פגישות קודמות למטופל זה');

    // dropping a valid file must NOT advance the pipeline — it's blocked with a
    // clear "no session to attach to" error, not silently orphaned.
    fireEvent.drop(dropzone(), { dataTransfer: { files: [new File(['x'], 'session.mp3', { type: 'audio/mpeg' })] } });
    await waitFor(() => expect(document.body.textContent).toContain('אין פגישה לשייך אליה את ההקלטה'));
    // blocked, not orphaned: the processing pipeline never started
    expect(document.querySelector('[role="progressbar"]')).toBeFalsy();
  });
});
