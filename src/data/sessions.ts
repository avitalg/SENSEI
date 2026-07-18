// Canonical session seed data — shared dates and summaries for session builders.
import { PATIENT_SESSION_CONTENT } from './patientSessionContent';

export const SESSION_DATES = ['22.06.2026', '15.06.2026', '08.06.2026', '01.06.2026', '25.05.2026', '18.05.2026', '11.05.2026', '04.05.2026'];

// Neutral session summaries (no patient gender/risk fields). A patient with
// bespoke content (e.g. Simba/p5) gets their own arc; everyone else shares these.
export function sessionSummaries(p?: { id?: string }): string[] {
  const bespoke = p?.id ? PATIENT_SESSION_CONTENT[p.id] : undefined;
  if (bespoke) return bespoke.summaries;
  return [
    'המטופל דיווח על שיפור מתון בתחושת השליטה במצבי לחץ. תרגלנו נשימה סרעפתית והרחבנו את חשיפה ההדרגתית.',
    'עלו תכנים סביב חרדת ביצוע בעבודה. זוהו דפוסי הימנעות חוזרים; הוגדרה משימה התנהגותית לשבוע הקרוב.',
    'הפגישה התמקדה ביחסים בין-אישיים ובקושי להציב גבולות. נצפתה עלייה ברגישות רגשית בהשוואה לפגישות קודמות.',
    'דיווח על מצב רוח ירוד יחסית. בחנו טריגרים אפשריים ועיבדנו אירוע משמעותי מהשבוע.',
    'התקדמות יפה במטרות הטיפול. המטופל מתאר שימוש עצמאי בכלים שנלמדו.',
    'עבודה על דפוסי התקשרות וקשר למשפחת המוצא. עלו זיכרונות טעונים שדרשו ויסות במהלך הפגישה.',
    'חיזוק מוטיבציה והגדרה מחדש של מטרות הטיפול לרבעון הקרוב.',
    'פגישת פתיחה: מיפוי תלונות עיקריות, היסטוריה והגדרת ציפיות.',
  ];
}

// Static per-session risk levels (demo data).
export function sessionRisk(_p?: any): string[] {
  return ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'];
}
