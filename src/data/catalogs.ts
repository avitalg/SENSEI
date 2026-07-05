// Canonical seed catalogs — single source of truth shared between the dedicated
// pages and global search (so search results can never drift from the pages).
// Consolidated from previously-duplicated per-page copies.

// Resource-library row icons (SVG paths).
const DOC_I = 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z'
const CLIP_I = 'M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2z'
const BOOK_I = 'M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z'

// Resource library (worksheets / assessments / guides / protocols).
export const RES = [
  { id: 'r1', cat: 'worksheets', tag: 'דף עבודה', title: 'יומן מחשבות CBT', desc: 'זיהוי מחשבות אוטומטיות ועיצוב מחדש קוגניטיבי, לתיעוד יומי בין פגישות.', meta: '2 עמ׳ · PDF', icon: DOC_I },
  { id: 'r2', cat: 'assessments', tag: 'שאלון הערכה', title: 'שאלון PHQ-9', desc: 'כלי סטנדרטי להערכת חומרת דיכאון ומעקב אחר שינוי לאורך זמן.', meta: '9 פריטים · דיגיטלי', icon: CLIP_I },
  { id: 'r3', cat: 'worksheets', tag: 'דף עבודה', title: 'סולם חשיפה הדרגתית', desc: 'בניית היררכיית חשיפה להתמודדות עם חרדה והימנעות, שלב אחר שלב.', meta: '3 עמ׳ · PDF', icon: DOC_I },
  { id: 'r4', cat: 'guides', tag: 'מדריך', title: 'מדריך היגיינת שינה', desc: 'עקרונות מבוססי-ראיות לשיפור איכות השינה, לשיתוף עם המטופל.', meta: '6 עמ׳ · PDF', icon: BOOK_I },
  { id: 'r5', cat: 'assessments', tag: 'שאלון הערכה', title: 'שאלון GAD-7', desc: 'הערכת רמת חרדה כללית. מדד קצר ומהימן למעקב קליני.', meta: '7 פריטים · דיגיטלי', icon: CLIP_I },
  { id: 'r6', cat: 'protocols', tag: 'פרוטוקול', title: 'פרוטוקול הרפיה שרירית', desc: 'תסריט מובנה להרפיית שרירים פרוגרסיבית לתרגול מודרך.', meta: '4 עמ׳ · אודיו + PDF', icon: BOOK_I },
]

// Documents & consent.
export const DOCS = [
  { id: 'd1', pid: 'p1', type: 'הסכמה מדעת', date: '12.01.2025', status: 'signed' },
  { id: 'd2', pid: 'p1', type: 'ויתור סודיות', date: '18.03.2025', status: 'signed' },
  { id: 'd3', pid: 'p3', type: 'הסכמה מדעת', date: '', status: 'pending' },
  { id: 'd4', pid: 'p6', type: 'הסכמה מדעת', date: '', status: 'draft' },
  { id: 'd5', pid: 'p5', type: 'טופס קליטה', date: '', status: 'pending' },
  { id: 'd6', pid: 'p2', type: 'הסכם טיפול', date: '22.09.2024', status: 'signed' },
  { id: 'd7', pid: 'p4', type: 'ויתור סודיות', date: '', status: 'draft' },
  { id: 'd8', pid: 'p8', type: 'הסכמה מדעת', date: '05.05.2025', status: 'signed' },
  { id: 'd9', pid: 'p5', type: 'הסכמה מדעת', date: '', status: 'pending' },
]

// Notifications (center + app-bar popover share this list).
export const NOTIFS: any[] = [
  { id: 'n1', kind: 'summary', pid: 'p3', title: 'סיכום AI מוכן', text: 'ניתוח הפגישה של מיכל כהן הושלם וזמין לצפייה', time: 'לפני 8 דק׳', group: 'היום' },
  { id: 'n2', kind: 'risk', pid: 'p5', title: 'דגל סיכון חדש', text: 'זוהו סימני אזהרה בפגישה של נועה שפירא', time: 'לפני 40 דק׳', group: 'היום' },
  { id: 'n3', kind: 'reminder', pid: 'p1', title: 'פגישה מתקרבת', text: 'דנה לוי · פגישה שבועית בשעה 09:00', time: 'היום 09:00', group: 'היום' },
  { id: 'n4', kind: 'summary', pid: 'p2', title: 'סיכום AI מוכן', text: 'ניתוח הפגישה של יוסי מזרחי הושלם', time: 'לפני 3 שעות', group: 'היום' },
  { id: 'n6', kind: 'reminder', pid: 'p4', title: 'תזכורת מסמך', text: 'טופס הסכמה מדעת ממתין לחתימת אבי פרץ', time: 'אתמול 11:05', group: 'אתמול' },
  { id: 'n7', kind: 'risk', pid: 'p3', title: 'רמת סיכון עודכנה', text: 'רמת הסיכון של מיכל כהן עלתה לרמה גבוהה', time: 'אתמול 09:30', group: 'אתמול' },
  { id: 'n8', kind: 'system', pid: null, title: 'עדכון מערכת', text: 'גרסה 2.4: שיפורי תמלול ודוחות חדשים זמינים', time: 'לפני יומיים', group: 'קודם' },
  { id: 'n10', kind: 'summary', pid: 'p1', title: 'סיכום AI מוכן', text: 'ניתוח הפגישה של דנה לוי הושלם', time: 'לפני 4 ימים', group: 'קודם' },
  { id: 'n11', kind: 'reminder', pid: 'p2', title: 'פגישה בוטלה', text: 'הפגישה עם יוסי מזרחי בתאריך 20.06 בוטלה', time: 'לפני שבוע', group: 'קודם' },
]
