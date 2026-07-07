// Reports download — must produce a REAL file, not a toast pretending one was
// downloaded (the previous behavior was download theater: "(PDF)" with no file).
// Guards the canonical downloadTextFile path shared with the transcript export.
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { AppStoreProvider } from '../src/store/AppStore'
import App from '../src/App'

const PKEY = 'sensei_session_react_v1'
afterEach(() => { cleanup(); localStorage.clear() })

describe('reports — the download action creates a real text file', () => {
  it('clicking הורדה hands a text/plain Blob with the report metadata to the browser', async () => {
    localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', route: 'reports' }))
    render(<AppStoreProvider><App /></AppStoreProvider>)
    await act(() => new Promise((r) => setTimeout(r, 80)))
    await waitFor(() => expect(document.querySelector('[aria-label="הורדה"]')).toBeTruthy())

    let captured: Blob | null = null
    const origCreate = URL.createObjectURL
    const origRevoke = URL.revokeObjectURL
    URL.createObjectURL = ((b: Blob) => { captured = b; return 'blob:mock' }) as any
    URL.revokeObjectURL = (() => {}) as any
    try {
      fireEvent.click(document.querySelector('[aria-label="הורדה"]') as HTMLElement)
      await waitFor(() => expect(captured).toBeTruthy())
      expect((captured as unknown as Blob).type).toContain('text/plain')
      const text = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader()
        fr.onload = () => resolve(String(fr.result))
        fr.onerror = () => reject(fr.error)
        fr.readAsText(captured as unknown as Blob)
      })
      expect(text).toContain('דוח התקדמות') // the first report's name
      expect(text).toContain('סביבת הדגמה') // honestly labeled as demo output
    } finally {
      URL.createObjectURL = origCreate
      URL.revokeObjectURL = origRevoke
    }
  })
})
