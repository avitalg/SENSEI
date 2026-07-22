// Structured "Patient Overview" — a concise, scannable snapshot shown at the top
// of the patient file: current treatment summary, primary goals, current
// challenges, and the therapist's prep notes ahead of the next session.
// Seeded per patient: every offline roster patient (p1–p7) carries a bespoke
// overview derived from their session arc in patientSessionContent.ts; anyone
// outside the roster shares a neutral default. Stored edits live in the store's
// `overviewOverrides`.

export interface PatientOverview {
  summary: string
  goals: string
  challenges: string
}

const PATIENT_OVERVIEWS: Record<string, PatientOverview> = {
  // דנה לוי · חרדת ביצוע בעבודה, טיפול קוגניטיבי-התנהגותי עם חשיפה הדרגתית.
  p1: {
    summary: 'דנה, בטיפול קוגניטיבי-התנהגותי סביב חרדת ביצוע בעבודה שהפריעה לשינה. בנינו היררכיית חשיפה וכלי ויסות, ולאחרונה עברה בהצלחה הצגה גדולה תוך שימוש עצמאי בכלים.',
    goals: 'הפחתת חרדת הביצוע · ביסוס תחושת מסוגלות · שימוש עצמאי בכלי ויסות במצבי לחץ.',
    challenges: 'מחשבות אוטומטיות של כישלון לפני ישיבות · הימנעות ממצבים מעוררי חרדה · פגיעה בשינה סביב אירועים מלחיצים.',
  },
  // יוסי מזרחי · שחיקה ועומס, ביקורת עצמית נוקשה והצבת גבולות.
  p2: {
    summary: 'יוסי, בטיפול סביב שחיקה ולחץ מתמשך בעבודה. עובדים על הצבת גבולות מול הממונה, ריכוך הביקורת העצמית והפרדה בין ערך עצמי לתפוקה.',
    goals: 'הצבת גבולות בעבודה · ריכוך הקול הביקורתי הפנימי · חיזוק הזכות למנוחה ולבקשת עזרה.',
    challenges: 'דפוסי יתר-אחריות שמזינים את השחיקה · קושי להתנתק בסופי שבוע · הימנעות מבקשת עזרה ("להיות חזק").',
  },
  // מיכל כהן · יחסים בין-אישיים, דפוס ריצוי וגבולות במשפחה.
  p3: {
    summary: 'מיכל, בטיפול סביב קושי ביחסים בין-אישיים ודפוס ריצוי. לאחרונה הצליחה לומר "לא" לבקשה של אמה בלי שהאשמה תציף אותה · צעד משמעותי בעבודת הגבולות.',
    goals: 'הצבת גבולות במשפחה ובעבודה · ויסות האשמה הנלווית · זיהוי הצרכים שלה לפני צרכי האחר.',
    challenges: 'דפוס ריצוי חוזר · האשמה עצמית בקונפליקטים · רגישות רגשית גבוהה בעיבוד.',
  },
  // אבי פרץ · מצב רוח ירוד לאחר פרידה, הפעלה התנהגותית.
  p4: {
    summary: 'אבי, בטיפול סביב מצב רוח ירוד מתמשך לאחר פרידה. תוכנית הפעלה התנהגותית (הליכות יומיות ושגרה מיטיבה) מתחילה לשאת פרי, עם שיפור מתון במצב הרוח.',
    goals: 'ייצוב מצב הרוח · ביסוס שגרה מיטיבה · חיבור מחדש למקורות תמיכה חברתיים.',
    challenges: 'תחושת ריקנות ואובדן כיוון אחרי הפרידה · דפוס בידוד חברתי שמעמיק את הדכדוך · טריגרים למצב רוח ירוד.',
  },
  // סימבה · PTSD, טיפול משולב EMDR ו-CPT.
  p5: {
    summary: 'סימבה, שאיבד את אביו מופאסה באירוע טראומטי בקניון. בטיפול משולב EMDR ו-CPT לעיבוד PTSD, הימנעות כרונית וקהות רגשית.',
    goals: 'עיבוד זיכרון הליבה הטראומטי · הפחתת אשמה ובושה · יציאה מדפוס ההימנעות וחזרה לתפקוד ולנטילת אחריות.',
    challenges: 'עוררות יתר וטריגרים סביבתיים · נטייה להימנעות ("האקונה מטאטה") · אשמה נוקשה על מות האב.',
  },
  // פורסט · קהות רגשית וריצה כהימנעות; אבל ועיבוד קרב (ACT).
  p6: {
    summary: 'פורסט, וטרן קרב שאיבד את באבה ואת אמו. בטיפול משולב ACT ועיבוד ממוקד טראומה סביב קהות רגשית וריצה קומפולסיבית כהימנעות; בשלב אינטגרציה עם סימני צמיחה פוסט-טראומטית.',
    goals: 'הרחבת היכולת להכיל כאב ואבל · החלפת הריצה בכלי קרקוע · שימור ההישגים והרחבת מעגלי תמיכה.',
    challenges: 'טריגרים חושיים (גשם, רעש) שמפילים לקפיאה ותת-עוררות · אשמה סמויה על מות באבה · דחף אוטומטי לצאת לריצה.',
  },
  // הארי · טראומה מורכבת מילדות, עוררות יתר והסתגרות (EMDR).
  p7: {
    summary: 'הארי, בטיפול בטראומה מורכבת על רקע הזנחה והתעללות בילדות (הארון מתחת למדרגות). אחרי עיבוד זיכרון הליבה ב-EMDR נרשם שיפור ניכר בשינה ויציאה ראשונה מההסתגרות מול חברים.',
    goals: 'ביסוס אמון ובטיחות בקשרים · המשך עיבוד זיכרונות (כולל הקרבות הבוגרים) · שימור השיפור בשינה ובעוררות.',
    challenges: 'עוררות יתר וחשדנות · דחף אוטומטי להדוף את הקרובים · חלון עוררות צר סביב פתיחת אמון.',
  },
};

const DEFAULT_OVERVIEW: PatientOverview = {
  summary: 'מטופל בטיפול מתמשך, עם שיתוף פעולה טוב ומוטיבציה גבוהה לתהליך.',
  goals: 'חיזוק כלי ויסות עצמי · שיפור התפקוד היומיומי · הפחתת מצוקה.',
  challenges: 'התמודדות עם מצבי לחץ · דפוסי הימנעות · ויסות רגשי תחת עומס.',
};

export function patientOverviewDefault(patientId: string): PatientOverview {
  return { ...(PATIENT_OVERVIEWS[patientId] || DEFAULT_OVERVIEW) };
}

/** Empty overview for live API mode — no seeded clinical copy. */
export const EMPTY_OVERVIEW: PatientOverview = {
  summary: '',
  goals: '',
  challenges: '',
};

/** Seeded defaults offline; blank (plus local overrides) when the API is live. */
export function patientOverviewBase(patientId: string, useApi: boolean): PatientOverview {
  return useApi ? { ...EMPTY_OVERVIEW } : patientOverviewDefault(patientId);
}

export const OVERVIEW_FIELDS: { key: keyof PatientOverview; label: string }[] = [
  { key: 'summary', label: 'סיכום הטיפול הנוכחי' },
  { key: 'goals', label: 'מטרות הטיפול המרכזיות' },
  { key: 'challenges', label: 'אתגרים נוכחיים' },
];
