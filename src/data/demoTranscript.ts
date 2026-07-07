import type { SessionTranscript } from '../services/audio'

/** Flat Hebrew transcript used when the simulated upload pipeline runs (no backend). */
export const DEMO_TRANSCRIPT_TEXT = `אז ספרי לי איך עבר עליך השבוע מאז שנפגשנו בפעם הקודמת.
היה שבוע די קשה האמת. הייתה לי הצגה גדולה בעבודה וכמה ימים לפני זה כמעט לא הצלחתי לישון.
אני שומעת. מה עבר לך בראש בלילות האלה לפני ההצגה?
כל הזמן דמיינתי שאני אתבלבל מול כולם, שכולם יראו שאני לחוצה. הלב שלי דפק חזק וזה רק החמיר את זה.
זה נשמע כמו אותה ספירלה שדיברנו עליה. תזכרי שתרגלנו נשימה סרעפתית בדיוק בשביל הרגעים האלה. הצלחת להשתמש בזה?
ניסיתי בבוקר ההצגה וזה דווקא עזר קצת. הצלחתי להירגע מספיק כדי להתחיל.
זו התקדמות ממש משמעותית. השתמשת בכלי ברגע אמת והוא עבד. איך הרגשת אחרי שסיימת?
הרגשתי הקלה ענקית, ואפילו קצת גאווה. אבל אחר כך התחלתי לפחד מהפעם הבאה.
בואי נתעכב על תחושת הגאווה הזו לרגע. היא חשובה. מה היא אומרת לך על היכולות שלך?
שאולי אני מסוגלת יותר ממה שאני חושבת. שזה לא תמיד חייב להסתיים באסון.`

export function demoSessionTranscript(filename: string): SessionTranscript {
  return {
    id: 'demo-' + String(Date.now()),
    filename,
    content_type: 'audio/mpeg',
    size_bytes: 0,
    language: 'he',
    text: DEMO_TRANSCRIPT_TEXT,
    uploadedAt: new Date().toISOString(),
  }
}
