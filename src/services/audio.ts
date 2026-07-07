import { apiUpload, type ApiError } from './apiClient'

export interface AudioUploadResult {
  id: string
  filename: string
  content_type: string
  size_bytes: number
  language: string
  text: string
}

export interface SessionTranscript extends AudioUploadResult {
  uploadedAt: string
}

/** Map backend upload errors to user-facing Hebrew messages. */
export function uploadErrorMessage(err: unknown): string {
  const e = err as ApiError
  if (e?.code === 'ABORTED') return ''
  if (e?.code === 'NO_API') return 'שרת ה-API אינו מוגדר.'
  if (e?.code === 'TIMEOUT') return 'ההעלאה ארכה יותר מדי. נסו שוב עם קובץ קצר יותר.'
  if (e?.code === 'NETWORK') return 'שגיאת רשת. בדקו את החיבור לשרת ונסו שוב.'
  if (e?.status === 415) return 'סוג הקובץ אינו נתמך. אנא העלו קובץ בפורמט MP3, WAV, M4A או WEBM.'
  if (e?.status === 413) return 'הקובץ גדול מדי. הגודל המקסימלי הוא 25MB.'
  if (e?.status === 400) return 'הקובץ ריק או פגום. נסו קובץ אחר.'
  if (e?.status === 502) return 'התמלול נכשל. נסו שוב מאוחר יותר.'
  return 'ההעלאה נכשלה. נסו שוב.'
}

export async function uploadAudio(file: File, signal?: AbortSignal): Promise<AudioUploadResult> {
  return apiUpload<AudioUploadResult>('/audio/upload', file, 'file', { signal })
}

export function toSessionTranscript(result: AudioUploadResult): SessionTranscript {
  return { ...result, uploadedAt: new Date().toISOString() }
}
