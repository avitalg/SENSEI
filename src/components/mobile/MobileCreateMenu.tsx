// Mobile "+" quick-create menu — a floating action button that opens a bottom
// sheet with the two ways to bring a session in: record a new one, or upload an
// existing recording. Both keep parity with desktop; both let the user pick the
// patient in the following step (dialog / upload screen).
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../store/AppStore';
import { useFocusTrap } from '../../hooks/useFocusTrap';

const MIC = 'M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15A.998.998 0 0 0 5.09 11c-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V21h2v-3.08c3.02-.43 5.42-2.78 5.91-5.78.09-.6-.39-1.14-1-1.14z';
const UP = 'M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z';

export default function MobileCreateMenu() {
  const { S, set, navigate } = useApp();
  const [open, setOpen] = useState(false);
  const fabRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useFocusTrap<HTMLDivElement>(open);

  // Close and return focus to the FAB (a11y: never strand focus behind the sheet).
  const closeMenu = () => { setOpen(false); fabRef.current?.focus(); };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMenu(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const record = () => {
    setOpen(false);
    // Preselect the current patient only if they're on the ACTIVE roster —
    // archived patients can't take new sessions (the dialog lists actives only).
    const activePid = S.patients.some((p: any) => p.id === S.patientId) ? S.patientId : null;
    set({ recordOpen: true, recordPid: activePid });
  };
  const upload = () => {
    setOpen(false);
    navigate('upload', { upload: { state: 'idle', progress: 0, fileName: '', error: '' } });
  };

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        className="mob-fab tap44"
        aria-label="הוספת מפגש: הקלטה או העלאה"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"
          style={{ transition: 'transform .2s ease', transform: open ? 'rotate(45deg)' : 'none' }}>
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" />
        </svg>
      </button>

      {open && (
        <div className="mob-sheet-scrim" onClick={closeMenu}>
          <div ref={sheetRef} className="mob-sheet" role="dialog" aria-modal="true" aria-label="הוספת מפגש" onClick={(e) => e.stopPropagation()}>
            <div className="mob-sheet-grip" aria-hidden="true" />
            <button type="button" className="mob-sheet-item" onClick={record}>
              <span className="mob-sheet-ic" style={{ background: 'var(--error-bg)', color: 'var(--error)' }}>
                <svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor" aria-hidden="true"><path d={MIC} /></svg>
              </span>
              <span>
                <span className="mob-sheet-t">הקלטה</span>
                <span className="mob-sheet-s">הקליטו הקלטה חדשה ישירות מהמכשיר</span>
              </span>
            </button>
            <button type="button" className="mob-sheet-item" onClick={upload}>
              <span className="mob-sheet-ic" style={{ background: 'var(--primary-surface)', color: 'var(--primary)' }}>
                <svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor" aria-hidden="true"><path d={UP} /></svg>
              </span>
              <span>
                <span className="mob-sheet-t">העלאת הקלטה</span>
                <span className="mob-sheet-s">העלו קובץ הקלטה קיים</span>
              </span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
