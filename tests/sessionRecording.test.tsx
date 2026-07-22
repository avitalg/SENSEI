// Session recording → upload pipeline handoff. The recorder stashes a File; the
// upload screen consumes it once on mount and runs it through the same
// validation as a picked file. jsdom has no MediaRecorder, so the dialog shows
// the graceful unsupported message and the entry points still render.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';
import { stashRecording, takeRecording } from '../src/services/recordingHandoff';

const PKEY = 'sensei_session_react_v1';
const settle = () => act(() => new Promise((r) => setTimeout(r, 80)));
afterEach(() => { cleanup(); localStorage.clear(); takeRecording(); });

describe('session recording handoff', () => {
  it('stash → take is get-and-clear (a recording is consumed exactly once)', () => {
    expect(takeRecording()).toBeNull();
    const f = new File(['x'], 'session-recording.webm', { type: 'audio/webm' });
    stashRecording(f);
    expect(takeRecording()).toBe(f);
    expect(takeRecording()).toBeNull(); // not double-consumed
  });

  it('a stashed recording is fed into the upload pipeline on the upload screen', async () => {
    const f = new File(['x'], 'session-recording.webm', { type: 'audio/webm' });
    stashRecording(f);
    localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', route: 'upload', uploadPatientId: 'p1' }));
    render(<AppStoreProvider><App /></AppStoreProvider>);
    await settle();
    // the recorded (valid audio) file advances the pipeline past the idle drop zone
    await waitFor(() => expect(document.querySelector('[style*="dashed"]')).toBeFalsy());
    expect(takeRecording()).toBeNull(); // consumed
  });

  it('a stashed recording still processes after the meeting list resolves (no API dead-end)', async () => {
    // Deferred consumption: the recorded file is processed once uploadMeetingId
    // settles, so it advances the pipeline rather than being dropped on mount.
    const f = new File(['x'], 'session-recording.webm', { type: 'audio/webm' });
    stashRecording(f);
    localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', route: 'upload', uploadPatientId: 'p5' }));
    render(<AppStoreProvider><App /></AppStoreProvider>);
    await settle();
    await waitFor(() => expect(document.querySelector('[style*="dashed"]')).toBeFalsy());
    expect(takeRecording()).toBeNull();
  });

  it('the patient-file "הקלטה" button opens the record dialog', async () => {
    localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', route: 'patient', patientId: 'p1' }));
    render(<AppStoreProvider><App /></AppStoreProvider>);
    await settle();
    const btn = await waitFor(() => [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'הקלטה') as HTMLElement);
    expect(btn, 'record entry point renders on the patient file').toBeTruthy();
    fireEvent.click(btn);
    // dialog opens; jsdom lacks MediaRecorder so the graceful unsupported copy shows
    await waitFor(() => {
      const dlg = document.querySelector('[role="dialog"][aria-label="הקלטה"]');
      expect(dlg).toBeTruthy();
      expect(dlg?.textContent).toContain('הקלטה ישירה אינה נתמכת');
    });
  });
});
