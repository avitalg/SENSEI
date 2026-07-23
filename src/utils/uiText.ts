/**
 * Keep backend and browser diagnostics out of the Hebrew interface.
 * A specific Hebrew message from the API is preserved; technical or English
 * diagnostics remain available to developer tooling but are not shown to users.
 */
export function hebrewUiError(value: unknown, fallback: string): string {
  const text = typeof value === 'string' ? value.trim() : '';
  return /[\u0590-\u05FF]/.test(text) ? text : fallback;
}

/**
 * Keep imported repository content verbatim in the data layer, but present
 * established clinical names in Hebrew at the UI boundary.
 */
const CLINICAL_DISPLAY_TERMS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bCompassion Focused Therapy\b/g, 'טיפול ממוקד חמלה'],
  [/\bCognitive Processing Therapy\b/g, 'טיפול בעיבוד קוגניטיבי'],
  [/\bInternal Family Systems\b/g, 'מערכות משפחתיות פנימיות'],
  [/\bSomatic Experiencing\b/g, 'חוויה סומטית'],
  [/\bSchema Therapy\b/g, 'טיפול סכמטי'],
  [/\bNarrative Therapy\b/g, 'טיפול נרטיבי'],
  [/\bExposure Therapy\b/g, 'טיפול בחשיפה'],
  [/\bMode Work\b/g, 'עבודת מודים'],
  [/\bMoral Injury\b/g, 'פציעה מוסרית'],
  [/\bIn-vivo\b/g, 'במציאות'],
  [/\bImaginal\b/g, 'בדמיון'],
];

export function hebrewClinicalDisplayText(value: string): string {
  return CLINICAL_DISPLAY_TERMS.reduce(
    (text, [term, translation]) => text.replace(term, translation),
    value,
  );
}
