// Canonical session seed data + the shared session-list builder. The per-screen
// projections (columns, layout) legitimately differ, but the builder that turns
// a patient into their list of session view-models was copy-pasted (and had
// drifted) between the patients and sessions screens — consolidated here as the
// single source. It is a pure function: navigation/state come in via `ctx`, so
// this leaf module never imports from store/ or pages/.
import { hg, riskMeta } from '../utils'

export const SESSION_DATES = ['22.06.2026', '15.06.2026', '08.06.2026', '01.06.2026', '25.05.2026', '18.05.2026', '11.05.2026', '04.05.2026']

export const SESSION_TOPICS = [
  ['חרדת ביצוע', 'דפוסי הימנעות'], ['ויסות רגשי', 'טכניקות הרגעה'], ['יחסים בין-אישיים', 'גבולות'],
  ['דימוי עצמי', 'ביקורת עצמית'], ['שינה ושגרה', 'חשיפה הדרגתית'], ['משפחת מוצא', 'דפוסי התקשרות'],
  ['מוטיבציה לטיפול', 'מטרות'], ['סיכום תקופה', 'משוב'],
]

// Gendered session summaries for a patient (uses the shared Hebrew-grammar layer).
export function sessionSummaries(p: any): string[] {
  return [
    hg('[[המטופל|המטופלת]] [[דיווח|דיווחה]] על שיפור מתון בתחושת השליטה במצבי לחץ. תרגלנו נשימה סרעפתית והרחבנו את חשיפה ההדרגתית.', p.gender),
    'עלו תכנים סביב חרדת ביצוע בעבודה. זוהו דפוסי הימנעות חוזרים; הוגדרה משימה התנהגותית לשבוע הקרוב.',
    'הפגישה התמקדה ביחסים בין-אישיים ובקושי להציב גבולות. נצפתה עלייה ברגישות רגשית בהשוואה לפגישות קודמות.',
    'דיווח על מצב רוח ירוד יחסית. בחנו טריגרים אפשריים ועיבדנו אירוע משמעותי מהשבוע.',
    hg('התקדמות יפה במטרות הטיפול. [[המטופל|המטופלת]] [[מתאר|מתארת]] שימוש עצמאי בכלים שנלמדו.', p.gender),
    'עבודה על דפוסי התקשרות וקשר למשפחת המוצא. עלו זיכרונות טעונים שדרשו ויסות במהלך הפגישה.',
    'חיזוק מוטיבציה והגדרה מחדש של מטרות הטיפול לרבעון הקרוב.',
    'פגישת פתיחה: מיפוי תלונות עיקריות, היסטוריה והגדרת ציפיות.',
  ]
}

// Per-session risk level by index, keyed off the patient's overall risk.
export function sessionRisk(p: any): string[] {
  return p.risk === 'high'
    ? ['high', 'low', 'medium', 'low', 'low', 'medium', 'low', 'low']
    : p.risk === 'medium'
      ? ['medium', 'low', 'low', 'medium', 'low', 'low', 'low', 'low']
      : ['low', 'low', 'none', 'low', 'none', 'low', 'none', 'none']
}

// Canonical per-patient session-list builder (was duplicated + drifted across
// PatientPage and SessionsPage; SessionsPage held the superset — kept here).
// Pure: `ctx` carries navigate/set so no store/page import is needed.
export function buildSessions(p: any, S: any, ctx: { navigate: any; set: any }) {
  const dates = SESSION_DATES
  const topicPool = SESSION_TOPICS
  const summaries = sessionSummaries(p)
  const riskByIndex = sessionRisk(p)
  const n = Math.min(p.sessions, 8)
  const deleted = S.deletedSessions || []
  const out: any[] = []
  for (let i = 0; i < n; i++) {
    const num = p.sessions - i
    const key = p.id + '#' + num
    if (deleted.indexOf(key) !== -1) continue
    const rk = riskByIndex[i]
    const rm = riskMeta(rk)
    out.push({
      num,
      date: dates[i],
      duration: (45 + (num % 4) * 4) + ' דק׳',
      topics: topicPool[i % topicPool.length],
      topicsText: topicPool[i % topicPool.length].join(', '),
      topicChips: topicPool[i % topicPool.length].slice(0, 3),
      summary: summaries[i % summaries.length],
      riskChips: rk === 'none' ? [] : [{ label: rm.label, color: rm.color, bg: rm.bg }],
      topRiskLabel: rm.label, topRiskColor: rm.color, topRiskBg: rm.bg,
      onSummary: () => ctx.navigate('summary', { patientId: p.id }),
      onTranscript: () => ctx.navigate('transcript', { patientId: p.id }),
      onDelete: (e?: any) => {
        if (e) e.stopPropagation()
        ctx.set({ dialog: 'delSession', dialogSessionLabel: 'פגישה ' + num + ' · ' + p.name, dialogSessionKey: key })
      },
    })
  }
  return out
}
