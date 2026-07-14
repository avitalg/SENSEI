// Mobile recording overlay (design: "Sensei Mobile · Recording"). Reuses the
// existing useAudioRecorder hook (mock mode — a real elapsed timer, no mic
// prompt, matching the demo pipeline) with pause/resume/stop/cancel. On stop the
// design keeps the therapist on their screen with a "processing" toast; a real
// backend would pick the capture up from here.
import { useEffect } from 'react';
import { useApp } from '../../store/AppStore';
import { useAudioRecorder, formatElapsed } from '../../hooks/useAudioRecorder';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { PauseIcon, PlayIcon, CloseIcon } from './icons';

const BARS = Array.from({ length: 24 }, (_, i) => i);

interface Props {
  name: string;
  onClose: () => void;
}

export default function MobileRecording({ name, onClose }: Props) {
  const { toast } = useApp();
  const recorder = useAudioRecorder({ mock: true });
  const { start, stop: stopRec, cancel: cancelRec } = recorder;
  const trapRef = useFocusTrap<HTMLDivElement>(true);

  // auto-start on mount (start is stable in mock mode); the hook resets on unmount
  useEffect(() => { start(); }, [start]);

  const stop = () => {
    stopRec();
    onClose();
    toast('ההקלטה נשמרה · התמלול והסיכום בהכנה', 'info');
  };
  const cancel = () => { cancelRec(); onClose(); };

  return (
    <div ref={trapRef} className="mob-record" role="dialog" aria-modal="true" aria-label={'הקלטת פגישה · ' + name}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>מקליט פגישה</div>
      <div style={{ fontSize: 21, fontWeight: 800, color: 'var(--primary)' }}>{name}</div>
      <div className="mob-record-time" aria-live="polite" dir="ltr">{formatElapsed(recorder.elapsed)}</div>

      <div className={'mob-wave' + (recorder.paused ? ' is-paused' : '')} aria-hidden="true">
        {BARS.map((i) => (
          <div key={i} className="mob-wave-bar" style={{ height: 14 + ((i * 37) % 28), animationDelay: (i * 0.07) + 's', animationDuration: (0.8 + (i % 5) * 0.13) + 's' }} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginTop: 10 }}>
        <button
          type="button"
          className="mob-record-btn"
          style={{ width: 56, height: 56 }}
          aria-label={recorder.paused ? 'המשך הקלטה' : 'השהיית הקלטה'}
          onClick={() => (recorder.paused ? recorder.resume() : recorder.pause())}
        >
          {recorder.paused ? <PlayIcon size={22} /> : <PauseIcon size={22} />}
        </button>
        <button type="button" className="mob-record-btn mob-record-stop" aria-label="סיום הקלטה" onClick={stop}>סיום</button>
        <button type="button" className="mob-record-btn" style={{ width: 56, height: 56, borderColor: 'var(--divider)', color: 'var(--text-muted)' }} aria-label="ביטול הקלטה" onClick={cancel}>
          <CloseIcon size={20} />
        </button>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 240, lineHeight: 1.6 }}>בסיום ההקלטה יופקו תמלול וסיכום אוטומטיים לפגישה</div>
    </div>
  );
}
