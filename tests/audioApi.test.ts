import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const BASE = 'https://api.test.example'

function loadAudio(baseUrl: string) {
  vi.resetModules()
  vi.stubEnv('VITE_API_BASE_URL', baseUrl)
  return Promise.all([import('../src/services/apiClient'), import('../src/services/audio')])
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs() })

describe('uploadAudio — dormant when unconfigured', () => {
  it('throws NO_API when base URL is unset', async () => {
    const [, audio] = await loadAudio('')
    await expect(audio.uploadAudio(new File(['x'], 'a.mp3'))).rejects.toMatchObject({ code: 'NO_API' })
  })
})

describe('uploadAudio — configured', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn(async () => new Response(JSON.stringify({
      id: 'abc.webm',
      filename: 'rec.webm',
      content_type: 'audio/webm',
      size_bytes: 42,
      language: 'he',
      text: 'שלום',
    }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
  })

  it('POSTs multipart FormData to /audio/upload', async () => {
    const [, audio] = await loadAudio(BASE)
    const file = new File(['bytes'], 'rec.webm', { type: 'audio/webm' })
    const result = await audio.uploadAudio(file)
    expect(result.text).toBe('שלום')
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/audio/upload`)
    const init = fetchMock.mock.calls[0][1]
    expect(init.method).toBe('POST')
    expect(init.body).toBeInstanceOf(FormData)
    expect(init.headers.Accept).toBe('application/json')
    expect(init.headers['Content-Type']).toBeUndefined()
  })

  it('maps HTTP errors to Hebrew messages', async () => {
    const [, audio] = await loadAudio(BASE)
    expect(audio.uploadErrorMessage({ status: 413, code: 'HTTP_413' })).toContain('25MB')
    expect(audio.uploadErrorMessage({ status: 502, code: 'HTTP_502' })).toContain('התמלול')
    expect(audio.uploadErrorMessage({ code: 'ABORTED' })).toBe('')
  })

  it('toSessionTranscript adds uploadedAt', async () => {
    const [, audio] = await loadAudio(BASE)
    const row = audio.toSessionTranscript({
      id: 'x.webm', filename: 'x.webm', content_type: 'audio/webm', size_bytes: 1, language: 'he', text: 't',
    })
    expect(row.uploadedAt).toMatch(/^\d{4}-/)
  })
})
