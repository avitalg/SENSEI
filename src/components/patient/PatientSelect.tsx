// Shared patient picker — desktop native <select>, mobile bottom sheet.
import { useEffect, useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { avatarColors } from '../../utils';
import { patientInitials, patientAvatarColor } from '../../services/patients';
import './patientSelect.css';

type PatientLite = { id: string; name: string };

type Props = {
  patients: PatientLite[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  /** Optional id on the trigger / select (e.g. form label association). */
  id?: string;
  labelledBy?: string;
  /** Extra class on the desktop <select>. */
  selectClassName?: string;
  dialogAriaLabel?: string;
  placeholder?: string;
};

export default function PatientSelect({
  patients,
  value,
  onChange,
  ariaLabel,
  id,
  labelledBy,
  selectClassName,
  dialogAriaLabel = 'בחירת מטופל',
  placeholder = 'בחרו מטופל',
}: Props) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const sheetRef = useFocusTrap<HTMLDivElement>(open && isMobile);
  const selected = patients.find((p) => p.id === value);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const pick = (pid: string) => {
    onChange(pid);
    setOpen(false);
  };

  if (!isMobile) {
    return (
      <select
        id={id}
        aria-label={ariaLabel}
        aria-labelledby={labelledBy}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={['app-select', selectClassName].filter(Boolean).join(' ')}
      >
        {patients.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    );
  }

  return (
    <>
      <button
        type="button"
        id={id}
        className="ppick-trigger"
        aria-label={ariaLabel}
        aria-labelledby={labelledBy}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="ppick-trigger-name">{selected?.name || placeholder}</span>
        <span className="ppick-trigger-chevron" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="ppick-sheet-scrim" onClick={() => setOpen(false)}>
          <div
            ref={sheetRef}
            className="ppick-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={dialogAriaLabel}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ppick-sheet-handle" />
            <div className="ppick-sheet-title">בחירת מטופל</div>
            <div className="ppick-sheet-list" role="listbox" aria-label="רשימת מטופלים">
              {patients.map((p) => {
                const av = avatarColors(patientAvatarColor(p.id));
                const active = p.id === value;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={'ppick-sheet-option' + (active ? ' is-selected' : '')}
                    onClick={() => pick(p.id)}
                  >
                    <span className="ppick-sheet-av" style={{ background: av.bg, color: av.color }}>
                      {patientInitials(p.name)}
                    </span>
                    <span className="ppick-sheet-option-name">{p.name}</span>
                    {active && (
                      <svg className="ppick-sheet-check" viewBox="0 0 24 24" width="20" height="20" fill="var(--primary)" aria-hidden="true">
                        <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
