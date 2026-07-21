// Settings · Data source — switch between live API and local mock seed data.
import { useApp } from '../../store/AppStore';
import {
  getDataSource,
  isServerAvailable,
  setDataSource,
  type DataSource,
  API_BASE_URL,
} from '../../services/apiClient';
import { keyAct } from './shared';

const OPTIONS: { key: DataSource; label: string; desc: string; icon: string }[] = [
  {
    key: 'server',
    label: 'שרת',
    desc: 'נתונים חיים מה-API · מטופלים, יומן וסיכומים',
    icon: 'M4 1h16c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2zm0 12h16c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2v-6c0-1.1.9-2 2-2z',
  },
  {
    key: 'mock',
    label: 'הדגמה מקומית',
    desc: 'נתוני דוגמה במכשיר · בלי קריאות לשרת',
    icon: 'M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z',
  },
];

export default function DataSourceTab() {
  const { toast } = useApp();
  const serverOk = isServerAvailable();
  const active = getDataSource();

  const select = (next: DataSource) => {
    if (next === active) return;
    if (next === 'server' && !serverOk) {
      toast('לא הוגדרה כתובת שרת · הגדירו VITE_API_BASE_URL', 'error');
      return;
    }
    setDataSource(next);
    toast(next === 'server' ? 'עוברים לנתוני שרת…' : 'עוברים להדגמה מקומית…', 'info');
    // Full reload so React Query + seed roster start from a clean slate.
    window.setTimeout(() => { window.location.reload(); }, 280);
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>מקור הנתונים</h2>
      <p style={{ margin: '0 0 18px', color: 'var(--text-secondary)', fontSize: 14 }}>
        בחרו האם סנסיי עובד מול השרת או עם נתוני הדגמה מקומיים. המעבר מרענן את האפליקציה.
      </p>

      <div role="radiogroup" aria-label="מקור הנתונים" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {OPTIONS.map((opt) => {
          const disabled = opt.key === 'server' && !serverOk;
          const on = active === opt.key;
          const choose = () => { if (!disabled) select(opt.key); };
          return (
            <div
              key={opt.key}
              onClick={choose}
              onKeyDown={keyAct(choose)}
              role="radio"
              tabIndex={disabled ? -1 : 0}
              aria-checked={on}
              aria-disabled={disabled}
              aria-label={opt.label}
              className="set-hov-border"
              style={{
                border: `1.5px solid ${on ? 'var(--primary)' : 'var(--divider)'}`,
                background: on ? 'var(--primary-tint)' : 'var(--surface)',
                borderRadius: 12,
                padding: '16px 14px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.55 : 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 11,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: on ? 'var(--primary)' : 'var(--surface-2)',
                color: on ? 'var(--paper)' : 'var(--text-secondary)',
              }}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d={opt.icon} /></svg>
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{opt.label}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.45 }}>{opt.desc}</div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <svg viewBox="0 0 24 24" width="17" height="17" fill="var(--text-muted)" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}><path d="M11 9h2V7h-2m1 13c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8m0-18C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m-1 15h2v-6h-2v6z" /></svg>
        <span>
          {serverOk
            ? (<>כתובת השרת: <span dir="ltr" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{API_BASE_URL}</span></>)
            : 'לא הוגדרה כתובת שרת (VITE_API_BASE_URL) · זמינה רק הדגמה מקומית.'}
        </span>
      </div>
    </div>
  );
}
