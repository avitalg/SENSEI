// Audio upload flow — the recording-upload drop zone: an unsupported file is rejected
// with the format error, and a supported file is accepted and moves into the processing
// pipeline. Drives the real store state machine (S.upload) via a drop event; no network,
// no timers advanced (asserts the immediate state transition, not the simulated progress).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

class MockMediaRecorder {
  static isTypeSupported = () => true
  mimeType = 'audio/webm'
  state: 'inactive' | 'recording' = 'inactive'
  ondataavailable: ((e: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  constructor(_stream: unknown, _opts?: { mimeType?: string }) {}
  start() { this.state = 'recording' }
  stop() {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob(['audio-bytes'], { type: 'audio/webm' }) })
    this.onstop?.()
  }
}

function installRecordingMocks() {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }) },
  })
  vi.stubGlobal('MediaRecorder', MockMediaRecorder)
}

beforeEach(() => installRecordingMocks())
afterEach(() => vi.unstubAllGlobals())

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

  it('simulated upload stores a demo transcript for the selected patient', async () => {
    await openUpload()
    drop('session-2026-06-22.mp3')
    await waitFor(() => expect(document.body.textContent).toContain('ההקלטה עובדה בהצלחה'), { timeout: 8000 })
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(PKEY) || '{}')
      expect(saved.sessionTranscripts?.p1?.text).toContain('היה שבוע די קשה')
    }, { timeout: 3000 })
  })

  it('the processing UI exposes an accessible progressbar and a working cancel (back to idle)', async () => {
    await openUpload()
    drop('session-2026-06-22.mp3')
    // accessible progress reporting (WCAG 4.1.2): role + live value
    await waitFor(() => expect(document.querySelector('[role="progressbar"]')).toBeTruthy())
    const bar = document.querySelector('[role="progressbar"]') as HTMLElement
    expect(bar.getAttribute('aria-valuenow')).toMatch(/^\d+$/)
    expect(bar.getAttribute('aria-valuemax')).toBe('100')
    // the user is never locked into the simulated pipeline — cancel aborts to idle
    fireEvent.click(document.querySelector('[aria-label="ביטול ההעלאה"]') as HTMLElement)
    await waitFor(() => expect(dropzone(), 'back to the idle drop zone').toBeTruthy())
    // and the progress interval is dead: state stays idle instead of re-entering uploading
    await act(() => new Promise((r) => setTimeout(r, 500)))
    expect(document.querySelector('[role="progressbar"]')).toBeFalsy()
  })
})

describe('audio upload — microphone recording', () => {
  it('shows a record button and enters the recording UI', async () => {
    await openUpload()
    const recordBtn = document.querySelector('[aria-label="הקלטה מהמיקרופון"]') as HTMLElement
    expect(recordBtn).toBeTruthy()
    fireEvent.click(recordBtn)
    await waitFor(() => expect(document.body.textContent).toContain('מקליטים'))
    expect(document.querySelector('[style*="dashed"]')).toBeFalsy()
  })

  it('finishing a recording feeds the upload pipeline', async () => {
    await openUpload()
    fireEvent.click(document.querySelector('[aria-label="הקלטה מהמיקרופון"]') as HTMLElement)
    await waitFor(() => expect(document.body.textContent).toContain('מקליטים'))
    const finishBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('סיום והעלאה'))
    expect(finishBtn).toBeTruthy()
    fireEvent.click(finishBtn as HTMLElement)
    await waitFor(() => expect(document.querySelector('[role="progressbar"]')).toBeTruthy())
  })

  it('cancel returns to the drop zone without uploading', async () => {
    await openUpload()
    fireEvent.click(document.querySelector('[aria-label="הקלטה מהמיקרופון"]') as HTMLElement)
    await waitFor(() => expect(document.body.textContent).toContain('מקליטים'))
    fireEvent.click(document.querySelector('[aria-label="ביטול ההקלטה"]') as HTMLElement)
    await waitFor(() => expect(dropzone()).toBeTruthy())
    expect(document.querySelector('[role="progressbar"]')).toBeFalsy()
  })
})

describe('audio upload — backend API', () => {
  const API = 'https://api.test.example'

  async function openUploadWithApi(fetchMock: ReturnType<typeof vi.fn>) {
    vi.stubEnv('VITE_API_BASE_URL', API)
    vi.stubGlobal('fetch', fetchMock)
    vi.resetModules()
    const { default: AppFresh } = await import('../src/App')
    const { AppStoreProvider } = await import('../src/store/AppStore')
    localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', route: 'upload', uploadPatientId: 'p1' }))
    render(<AppStoreProvider><AppFresh /></AppStoreProvider>)
    await act(() => new Promise((r) => setTimeout(r, 80)))
    await waitFor(() => expect(dropzone()).toBeTruthy())
  }

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('successful API upload stores transcript and shows success', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      id: 'x.webm', filename: 'session.mp3', content_type: 'audio/mpeg',
      size_bytes: 3, language: 'he', text: 'תמלול אמיתי',
    }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
    await openUploadWithApi(fetchMock)
    drop('session.mp3')
    await waitFor(() => expect(document.body.textContent).toContain('ההקלטה עובדה בהצלחה'))
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(PKEY) || '{}')
      expect(saved.sessionTranscripts?.p1?.text).toBe('תמלול אמיתי')
    }, { timeout: 3000 })
    expect(fetchMock).toHaveBeenCalled()
  })

  it('API error surfaces a user-facing failure message', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ detail: 'too big' }), { status: 413 }))
    await openUploadWithApi(fetchMock)
    drop('session.mp3')
    await waitFor(() => expect(document.body.textContent).toContain('25MB'))
    expect(document.querySelector('[role="alert"]')).toBeTruthy()
  })
})
