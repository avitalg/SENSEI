import { describe, expect, it } from 'vitest';
import { hebrewClinicalDisplayText, hebrewUiError } from '../src/utils/uiText';

describe('Hebrew UI error boundary', () => {
  it('preserves a specific Hebrew server message', () => {
    expect(hebrewUiError('לא ניתן לעבד את ההקלטה', 'שגיאה כללית')).toBe('לא ניתן לעבד את ההקלטה');
  });

  it('replaces English and technical diagnostics with Hebrew copy', () => {
    expect(hebrewUiError('Network error', 'שגיאת תקשורת')).toBe('שגיאת תקשורת');
    expect(hebrewUiError('HTTP 500', 'שגיאת שרת')).toBe('שגיאת שרת');
    expect(hebrewUiError(undefined, 'נסו שוב')).toBe('נסו שוב');
  });
});

describe('hebrewClinicalDisplayText', () => {
  it('localizes imported clinical names without changing acronyms', () => {
    expect(hebrewClinicalDisplayText('Schema Therapy — Mode Work')).toBe('טיפול סכמטי — עבודת מודים');
    expect(hebrewClinicalDisplayText('Internal Family Systems — IFS')).toBe('מערכות משפחתיות פנימיות — IFS');
  });
});
