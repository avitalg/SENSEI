import { describe, expect, it } from 'vitest';
import {
  RISK_DISCLAIMER,
  parseSummaryContent,
  structuredSummaryView,
  summaryPreviewText,
} from '../src/services/summaryDisplay';

const SAMPLE_JSON = `{
  "main_topics": "המטופל הגיע עם חרדה סביב אירוע בעבודה. נדונו דפוסי שינה ושימוש בכלי ויסות.",
  "therapist_interventions": "שוקף החרדה, חודדה נשימה שנלמדה, וניתנה משימת תרגול קצרה לשבוע.",
  "risk_signs": "לא נאמרו אמירות מפורשות של סיכון",
  "follow_up": ["לחזור לדפוסי שינה בתקופות לחץ", "לחזק תחושת מסוגלות אחרי הצלחה"]
}`;

describe('parseSummaryContent', () => {
  it('maps JSON fields into תקציר / נושאים / סיכון / המשך (never raw keys)', () => {
    const p = parseSummaryContent(SAMPLE_JSON)!;
    expect(p.displayText).not.toMatch(/[{}"]/);
    expect(p.displayText).toContain('חרדה סביב אירוע בעבודה');
    expect(p.displayText).toContain('שוקף החרדה');
    expect(p.mainTopics.length).toBeGreaterThan(0);
    expect(p.mainTopics.some((t) => t.includes('חרדה'))).toBe(true);
    expect(p.riskSigns).toContain('לא נאמרו');
    expect(p.followUp).toEqual([
      'לחזור לדפוסי שינה בתקופות לחץ',
      'לחזק תחושת מסוגלות אחרי הצלחה',
    ]);
    // Follow-up is a dedicated section — not duplicated inside תקציר.
    expect(p.displayText).not.toContain('המשך:');
  });

  it('accepts camelCase / Hebrew key aliases', () => {
    const p = parseSummaryContent(JSON.stringify({
      'נושאים מרכזיים': 'נושא א',
      therapistInterventions: 'התערבות ב',
      'סימני סיכון': 'לא נאמרו אמירות מפורשות של סיכון',
      followUp: ['מעקב'],
    }))!;
    expect(p.overview).toContain('נושא א');
    expect(p.displayText).toContain('התערבות ב');
    expect(p.followUp).toEqual(['מעקב']);
  });

  it('parses Hebrew ## markdown from the API normalizer', () => {
    const md = [
      '## נושאים מרכזיים',
      '- חרדת ביצוע',
      '- הפרעות שינה',
      '',
      '## התערבויות המטפל/ת',
      '- שיקוף ונשימה',
      '',
      '## סימני סיכון',
      'לא נאמרו אמירות מפורשות של סיכון',
      '',
      '## המשך ומעקב',
      '- תרגול נשימה בבית',
    ].join('\n');
    const p = parseSummaryContent(md)!;
    expect(p.mainTopics).toEqual(['חרדת ביצוע', 'הפרעות שינה']);
    expect(p.interventions).toEqual(['שיקוף ונשימה']);
    expect(p.followUp).toEqual(['תרגול נשימה בבית']);
    expect(p.displayText).toContain('חרדת ביצוע');
    expect(p.displayText).not.toContain('##');
  });

  it('does not dump unparseable JSON braces into displayText', () => {
    const p = parseSummaryContent('{ "foo": "bar", "baz": 1 }')!;
    expect(p.displayText).not.toMatch(/[{}]/);
    expect(p.displayText).toContain('לא ניתן להציג');
    expect(p.mainTopics).toEqual([]);
  });

  it('recovers a nested clean object from broken outer JSON', () => {
    const raw = '{\n  "main_topics": "עברית לא סגורה\n\n{\n  "main_topics": "שינה וחרדה",\n  "therapist_interventions": "נשימה",\n  "risk_signs": "לא נאמרו אמירות מפורשות של סיכון",\n  "follow_up": ["מעקב שינה"]\n}\n';
    const p = parseSummaryContent(raw)!;
    expect(p.overview).toContain('שינה וחרדה');
    expect(p.followUp).toContain('מעקב שינה');
  });

  it('recovers summary when follow_up array is missing commas between strings', () => {
    const raw = `{
  "main_topics": "יצירת ברית, הערכה ראשונית",
  "therapist_interventions": "ניסיון לברר עבר",
  "risk_signs": "",
  "follow_up": [
    "לשכוח את העבר במובן של לא שכח, וללמד לחיות איתו"
    "להתבונן מתי המטופל/ת מרגיש דחף פיזי לברוח"
  ]
}`;
    const p = parseSummaryContent(raw)!;
    expect(p.displayText).not.toContain('לא ניתן להציג');
    expect(p.displayText).toContain('יצירת ברית');
    expect(p.followUp.length).toBeGreaterThanOrEqual(1);
    expect(p.followUp.some((t) => t.includes('עבר') || t.includes('דחף'))).toBe(true);
  });
});

describe('summaryPreviewText', () => {
  it('returns a short prose line for history chips', () => {
    const line = summaryPreviewText(SAMPLE_JSON, 40);
    expect(line.endsWith('…')).toBe(true);
    expect(line).not.toMatch(/[{}"]/);
    expect(line).toContain('חרדה');
  });
});

// The backend already splits the rendered summary by heading. When that view is
// present the client renders it verbatim instead of re-parsing the flat text.
const STRUCTURED = {
  title: 'אינטגרציה — כבוד עצמי מחודש',
  subtitle: 'מולאן · 22/07/26 · 15:00 · 50 דק׳',
  insights: 'שיתוף לראשונה עם חברה קרובה על הסיפור האמיתי, ללא צורך בהצדקה מתמדת.',
  session_summary: 'מטופלת שיתפה חברה קרובה בחלק מהסיפור האמיתי מהצבא.',
  session_main_topics: ['שיתוף ראשון של הסיפור האמיתי', 'ניסוח מחדש של מושג האומץ'],
  session_risk_flags: {
    level: 'נמוך',
    note: 'מגמה חיובית ברורה, שינוי זהותי מוצק.',
    attention: null,
    disclaimer: 'אינדיקטור בלבד. אינו מהווה אבחנה רפואית',
  },
  therapist_interventions: [],
  follow_up: [],
};

describe('structuredSummaryView', () => {
  it('maps the backend sections into the page slots', () => {
    const v = structuredSummaryView(STRUCTURED)!;
    expect(v.title).toBe('אינטגרציה — כבוד עצמי מחודש');
    expect(v.subtitle).toBe('מולאן · 22/07/26 · 15:00 · 50 דק׳');
    expect(v.insights).toContain('שיתוף לראשונה');
    expect(v.summaryText).toContain('חברה קרובה');
    expect(v.mainTopics).toEqual(['שיתוף ראשון של הסיפור האמיתי', 'ניסוח מחדש של מושג האומץ']);
    expect(v.interventions).toEqual([]);
    expect(v.followUp).toEqual([]);
    expect(v.riskDisclaimer).toBe(RISK_DISCLAIMER);
  });

  it('turns the risk block into one flag, coloured by severity', () => {
    const v = structuredSummaryView(STRUCTURED)!;
    expect(v.riskFlags).toHaveLength(1);
    expect(v.riskFlags[0].level).toBe('נמוך');
    expect(v.riskFlags[0].text).toContain('מגמה חיובית');
    expect(v.riskFlags[0].color).toBe('var(--success)');
    expect(v.riskFlags[0].bg).toBe('var(--success-bg)');
  });

  it('raises severity for a high-risk level', () => {
    const v = structuredSummaryView({ ...STRUCTURED, session_risk_flags: { level: 'גבוה', note: 'אמירה מפורשת' } })!;
    expect(v.riskFlags[0].color).toBe('var(--error)');
  });

  it('renders attention as its own flag row so it is not buried in the note', () => {
    const v = structuredSummaryView({
      ...STRUCTURED,
      session_risk_flags: { ...STRUCTURED.session_risk_flags, attention: 'לבחון טריגרים בחזרה לסביבה' },
    })!;
    expect(v.riskFlags).toHaveLength(2);
    expect(v.riskFlags[1].level).toBe('לתשומת לב');
    expect(v.riskFlags[1].text).toContain('טריגרים');
    expect(v.riskFlags[1].color).toBe('var(--warning)');
  });

  it('falls back to the shared disclaimer when the backend sends none', () => {
    const v = structuredSummaryView({ ...STRUCTURED, session_risk_flags: { level: 'נמוך', note: 'יציב' } })!;
    expect(v.riskDisclaimer).toBe(RISK_DISCLAIMER);
  });

  it('returns null for a missing or empty section split (caller parses the text)', () => {
    expect(structuredSummaryView(null)).toBeNull();
    expect(structuredSummaryView({})).toBeNull();
    expect(structuredSummaryView({ title: 'כותרת בלבד' })).toBeNull();
  });
});
