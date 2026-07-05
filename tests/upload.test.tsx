// Audio upload flow — the recording-upload drop zone: an unsupported file is rejected
// with the format error, and a supported file is accepted and moves into the processing
// pipeline. Drives the real store state machine (S.upload) via a drop event; no network,
// no timers advanced (asserts the immediate state transition, not the simulated progress).
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { AppStoreProvider } from '../src/store/AppStore'
import App from '../src/App'

const PKEY = 'sensei_session_react_v1'
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }))
  return render(<AppStoreProvider><App /></AppStoreProvider>)
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 80)))
afterEach(() => { cleanup(); localStorage.clear() })

// the drop zone is the only dashed-border element on the upload screen
const dropzone = () => document.querySelector('[style*="dashed"]') as HTMLElement
const drop = (name: string) =>
  fireEvent.drop(dropzone(), { dataTransfer: { files: [new File(['x'], name, { type: 'audio/mpeg' })] } })

async function openUpload() {
  mount({ view: 'app', route: 'upload' })
  await settle()
  await waitFor(() => expect(dropzone()).toBeTruthy())
}

describe('audio upload — validation & state transitions', () => {
  it('rejects an unsupported file format with a clear error message', async () => {
    await openUpload()
    drop('meeting-video.mp4')
    await waitFor(() => expect(document.body.textContent).toContain('אינו נתמך')) // "…file type is not supported…"
    // stays out of the processing pipeline (no crash, actionable error)
    expect(document.body.textContent).toMatch(/MP3|WAV|M4A/)
  })

  it('accepts a supported file and leaves the idle drop zone for the processing pipeline', async () => {
    await openUpload()
    expect(dropzone(), 'idle drop zone shown before upload').toBeTruthy()
    drop('session-2026-06-22.mp3')
    // valid → state machine advances past idle: the dashed drop zone is replaced by the
    // uploading/processing UI (deterministic transition; progress timer not awaited)
    await waitFor(() => expect(document.querySelector('[style*="dashed"]')).toBeFalsy())
  })
})
