import { useCallback, useEffect, useRef, useState } from 'react'

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || ''
}

function recordFileName(ext: string): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `הקלטה_${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}_${pad(now.getHours())}-${pad(now.getMinutes())}.${ext}`
}

export function formatRecordDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function isAudioRecordingSupported(): boolean {
  return typeof MediaRecorder !== 'undefined'
    && typeof navigator !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia
}

export function useAudioRecorder(onComplete: (file: File) => void, onError: (msg: string) => void) {
  const [isRecording, setIsRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }, [])

  const reset = useCallback(() => {
    clearTimer()
    setIsRecording(false)
    setSeconds(0)
    chunksRef.current = []
    recorderRef.current = null
    stopStream()
  }, [clearTimer, stopStream])

  useEffect(() => () => {
    clearTimer()
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    stopStream()
  }, [clearTimer, stopStream])

  const start = useCallback(async () => {
    if (!isAudioRecordingSupported()) {
      onError('הדפדפן שלכם אינו תומך בהקלטת אודיו.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = pickMimeType()
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      streamRef.current = stream
      chunksRef.current = []
      recorderRef.current = recorder
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || 'audio/webm'
        const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'
        const blob = new Blob(chunksRef.current, { type })
        onComplete(new File([blob], recordFileName(ext), { type }))
        reset()
      }
      recorder.start(250)
      setSeconds(0)
      setIsRecording(true)
      clearTimer()
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch {
      stopStream()
      onError('לא ניתן לגשת למיקרופון. אנא אשרו הרשאה בהגדרות הדפדפן.')
    }
  }, [clearTimer, onComplete, onError, reset, stopStream])

  const stop = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    else reset()
  }, [reset])

  const cancel = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.onstop = null
      recorderRef.current.stop()
    }
    reset()
  }, [reset])

  return { isRecording, seconds, start, stop, cancel, supported: isAudioRecordingSupported() }
}
