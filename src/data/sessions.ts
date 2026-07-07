// Canonical session seed data — the shared arrays that the per-patient session
// builders on the sessions / patient / timeline / search screens all derive from.
// Only the data is shared here; each screen keeps its own projection (columns,
// handlers) since those legitimately differ.
import { hg } from '../utils'

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
