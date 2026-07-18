// A drop that carries no real file (e.g. text/a link dragged from another app)
// must NOT silently fabricate and upload a phantom recording. The synthetic
// sample file is a demo-only affordance, gated behind S.demoMode; a normal build
// stays on the idle drop zone instead of starting a bogus upload.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { AppStoreProvider } from '../src/store/AppStore';
import App from '../src/App';
import { clearMemoryUploadQueue } from '../src/services/uploadQueue';

const PKEY = 'sensei_session_react_v1';
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }));
  return render(<AppStoreProvider><App /></AppStoreProvider>);
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 80)));
afterEach(() => { cleanup(); localStorage.clear(); clearMemoryUploadQueue(); });

const dropzone = () => document.querySelector('[style*="dashed"]') as HTMLElement;
const dropNoFile = () => fireEvent.drop(dropzone(), { dataTransfer: { files: [] } });

describe('upload drop zone — no-file drop', () => {
  it('does not upload a phantom file when demo mode is off (stays idle)', async () => {
    mount({ view: 'app', route: 'upload', demoMode: false });
    await settle();
    await waitFor(() => expect(dropzone()).toBeTruthy());
    dropNoFile();
    // give any accidental upload a chance to advance the state machine
    await act(() => new Promise((r) => setTimeout(r, 120)));
    // still the idle drop zone — no processing UI, no phantom "פגישה_22-06.mp3"
    expect(dropzone(), 'idle drop zone preserved').toBeTruthy();
    expect(document.querySelector('[role="progressbar"]')).toBeFalsy();
  });

  it('keeps the demo affordance: a no-file drop in demo mode still explores the flow', async () => {
    mount({ view: 'app', route: 'upload', demoMode: true });
    await settle();
    await waitFor(() => expect(dropzone()).toBeTruthy());
    dropNoFile();
    await waitFor(() => expect(document.querySelector('[style*="dashed"]')).toBeFalsy());
  });

  it('demo mode: "בחירת קובץ" runs the sample flow instead of the OS file picker (journey unblocker)', async () => {
    // The core demo journey (upload → AI outputs) was blocked: the pick button
    // always opened a native OS picker, demanding a real audio file demo users
    // don't have. In demo mode it must fabricate the sample recording (same as
    // the demo drop path) so the flow completes.
    mount({ view: 'app', route: 'upload', demoMode: true });
    await settle();
    const pick = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('בחירת קובץ')) as HTMLElement;
    expect(pick).toBeTruthy();
    fireEvent.click(pick);
    // the flow leaves the idle drop zone and eventually lands on the transcript
    await waitFor(() => expect(document.querySelector('[style*="dashed"]')).toBeFalsy());
    await waitFor(() => expect(window.location.hash).toMatch(/^#\/transcript/), { timeout: 5000 });
  });

  it('normal mode: "בחירת קובץ" does NOT fabricate a sample (opens the real picker)', async () => {
    mount({ view: 'app', route: 'upload', demoMode: false });
    await settle();
    const pick = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('בחירת קובץ')) as HTMLElement;
    fireEvent.click(pick);
    await act(() => new Promise((r) => setTimeout(r, 150)));
    expect(dropzone(), 'stays idle — no phantom upload in a real build').toBeTruthy();
  });
});
