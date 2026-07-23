import { useApp } from '../../store/AppStore';
import { CARD_SHADOW } from '../../utils/styles';

/** A short, non-blocking path to first value.
 * Progress is persisted in the canonical store, so leaving mid-flow is safe.
 */
export default function GettingStarted() {
  const { S, set, navigate, toast } = useApp();
  if (S.onboardTipDismissed) return null;

  const step = Math.max(0, Math.min(1, Number(S.onboardingStep) || 0));
  const patientId = S.patientId || S.patients[0]?.id || '';
  const needsPatient = !patientId;
  const skip = () => {
    set({ onboardTipDismissed: true });
    toast('מדריך ההתחלה נסגר · אפשר לפתוח אותו שוב ממרכז העזרה', 'info');
  };
  const openReport = () => {
    if (needsPatient) {
      set({ dialog: 'create', form: { name: '', phone: '', email: '' }, errors: {} });
      return;
    }
    set({ onboardingStep: 1 });
    navigate('nextMeetingReport', { patientId });
  };
  const openSensei = () => {
    set({ onboardingStep: 2, onboardTipDismissed: true, aiOpen: true });
    toast('ההגדרה הושלמה · אפשר להתחיל להתייעץ עם סנסיי');
  };

  return (
    <section aria-labelledby="getting-started-title" style={{ marginBottom: 18, padding: 18, border: '1px solid var(--primary-border)', borderRadius: 12, background: 'var(--primary-surface)', boxShadow: CARD_SHADOW }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ maxWidth: 660 }}>
          <span style={{ display: 'block', marginBottom: 5, color: 'var(--primary)', fontSize: 12.5, fontWeight: 800 }}>התחלה מהירה · שלב {step + 1} מתוך 2</span>
          <h2 id="getting-started-title" style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800 }}>
            {needsPatient ? 'הוסיפו את המטופל הראשון' : step === 0 ? 'הכירו את תמונת המצב לפני הפגישה' : 'קבלו נקודת מבט נוספת מסנסיי'}
          </h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13.5, lineHeight: 1.6 }}>
            {needsPatient
              ? 'תיק מטופל מאפשר לרכז פגישות, הערות, מסמכים ודוחות במקום אחד. אפשר לדלג ולחזור לכך מאוחר יותר.'
              : step === 0
              ? 'דוח ההכנה מרכז את הרקע, המפגש האחרון והנקודות שכדאי להביא לפגישה הקרובה.'
              : 'שאלו על דילמה טיפולית או על ההכנה לפגישה. ההתקדמות נשמרה, כך שאפשר להמשיך גם אחרי יציאה מהמסך.'}
          </p>
        </div>
        <div aria-label="התקדמות במדריך" style={{ display: 'flex', gap: 5, paddingTop: 4 }}>
          {[0, 1].map((i) => <span key={i} aria-hidden="true" style={{ width: i === step ? 24 : 8, height: 8, borderRadius: 999, background: i <= step ? 'var(--primary)' : 'var(--primary-border)', transition: 'width .18s ease' }} />)}
          <span className="sr-only">{step + 1} מתוך 2</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginTop: 14 }}>
        <button type="button" className="tap44" onClick={step === 0 ? openReport : openSensei} style={{ minHeight: 44, padding: '0 17px', border: 0, borderRadius: 9, background: 'var(--primary)', color: 'var(--paper)', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
          {needsPatient ? 'הוספת מטופל' : step === 0 ? 'פתיחת דוח ההכנה' : 'פתיחת השיחה עם סנסיי'}
        </button>
        <button type="button" className="tap44" onClick={skip} style={{ minHeight: 44, padding: '0 14px', border: '1px solid var(--border-input)', borderRadius: 9, background: 'var(--paper)', color: 'var(--text-2)', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>דלגו לעת עתה</button>
      </div>
    </section>
  );
}
